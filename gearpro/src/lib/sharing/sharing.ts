import { supabase } from '@/lib/supabase/client';
import { ensureLocalOwnedBy, pullFromCloud, pushToCloud } from '@/lib/sync';
import { useGearStore } from '@/store/useGearStore';

// join/leave replace local state with a fresh pull. If there are unsynced local
// edits (syncDirty), push them to the cloud FIRST so the pull doesn't overwrite
// and permanently drop them -- mirrors syncOnLogin's push-before-pull guarantee.
async function flushPendingPush(userId: string): Promise<void> {
  if (!useGearStore.getState().syncDirty) return;
  await pushToCloud(userId);
  useGearStore.getState().setSyncDirty(false);
}

export type TripMember = {
  memberId: string;
  displayName: string | null;
  role: 'owner' | 'member' | string;
};

/**
 * Thin wrappers over the SECURITY DEFINER RPCs from the shared-trips migration.
 * The database enforces who may call what (share/unshare are owner-only; join
 * needs a valid token; the roster is member-only) -- these just surface the
 * results to the UI and keep the local store in step after a membership change.
 */

// Owner-only. Idempotent: returns the existing token if already shared, else
// mints one. The returned uuid is the join secret embedded in the share link.
export async function shareTrip(tripId: string): Promise<string> {
  const { data, error } = await supabase.rpc('share_trip', { tid: tripId });
  if (error) throw error;
  return data as string;
}

// Owner-only. Revokes the token and drops every membership but the owner's.
export async function unshareTrip(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('unshare_trip', { tid: tripId });
  if (error) throw error;
}

// Adds the caller as a member and returns the trip id. Pulls afterwards so the
// newly-visible shared trip (and any teammate gear on it) lands in the store.
//
// /join/[token] is reachable WITHOUT ever mounting (protected)/_layout.tsx --
// it's a sibling top-level route -- so this may be the very first thing that
// touches local gear/trip data for this session, before useCloudSync's
// syncOnLogin has run (or even started) for whoever just signed up or logged
// in. ensureLocalOwnedBy is the same guard syncOnLogin calls first: if local
// storage still belongs to a different, previously-signed-in user in this
// browser, reset to empty before flushPendingPush/pullFromCloud can read or
// upload any of it under the new user's identity.
export async function joinTripByToken(token: string, userId: string): Promise<string> {
  ensureLocalOwnedBy(userId);
  const { data, error } = await supabase.rpc('join_trip_by_token', { tok: token });
  if (error) throw error;
  await flushPendingPush(userId);
  await pullFromCloud(userId);
  return data as string;
}

// A member removing themselves. The owner's row is protected by the RPC/RLS;
// this only ever deletes the caller's own membership. Pull afterwards so the
// trip disappears locally (it's no longer visible once membership is gone).
export async function leaveTrip(tripId: string, userId: string): Promise<void> {
  await flushPendingPush(userId);
  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId);
  if (error) throw error;
  await pullFromCloud(userId);
}

// Roster of everyone on the trip, with display names (member-visible only).
export async function tripMemberNames(tripId: string): Promise<TripMember[]> {
  const { data, error } = await supabase.rpc('trip_member_names', { tid: tripId });
  if (error) throw error;
  return (data ?? []).map((r: { member_id: string; display_name: string | null; role: string }) => ({
    memberId: r.member_id,
    displayName: r.display_name,
    role: r.role,
  }));
}

// The link a teammate opens to join. Uses the running origin so it's correct in
// dev (localhost) and prod (gearpro.app) without hard-coding the domain.
export function joinUrl(token: string): string {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://gearpro.app';
  return `${base}/join/${token}`;
}
