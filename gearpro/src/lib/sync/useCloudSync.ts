import { useEffect, useRef } from 'react';

import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { useGearStore } from '@/store/useGearStore';

import { pullFromCloud, pushToCloud, syncOnLogin } from './index';

const PUSH_DEBOUNCE_MS = 1500;
const REMOTE_PULL_DEBOUNCE_MS = 800;
// The collaborative tables. A change to any row this user can SELECT (their own
// or a shared trip's) should refresh their local copy. Realtime enforces RLS
// per subscriber, so a teammate's private (off-trip) gear never arrives here.
const REALTIME_TABLES = ['trips', 'bags', 'assignments', 'gear_items', 'trip_members'] as const;

/**
 * Runs the initial pull/push once per login, keeps the cloud in sync with local
 * edits, and applies teammates' changes live on shared trips.
 *
 * Local AsyncStorage stays the source of truth for what renders -- sync runs in
 * the background and never blocks the UI, since the app has to keep working
 * offline (trip packing happens with no signal).
 *
 * Every local edit marks the store syncDirty and schedules a debounced push;
 * the flag is cleared ONLY after a verified successful push. So if a push fails
 * (offline) or the app closes before it runs, syncDirty stays true and
 * syncOnLogin pushes-before-pulling next launch instead of letting the cloud
 * overwrite unsynced work. Pushes are also flushed when the tab is hidden and
 * retried on reconnect.
 *
 * Live updates: a Realtime subscription triggers a debounced pull when a
 * relevant row changes in the cloud. Two guards keep this safe:
 *  - a remote pull is SKIPPED while syncDirty (never clobber unsynced edits);
 *    the intent is remembered and retried right after the next successful push.
 *  - a pull replaces gear/trips with fresh objects, which would otherwise look
 *    like a local edit to the store subscriber and schedule a bogus push. The
 *    applyingRemote flag makes the subscriber ignore that one change, so a pull
 *    never ping-pongs into a push (and back via the echoed Realtime event).
 */
export function useCloudSync() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const syncedUserId = useRef<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storeUnsub = useRef<(() => void) | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const applyingRemote = useRef(false);
  const pendingRemote = useRef(false);

  useEffect(() => {
    const clearTimers = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      if (remoteTimer.current) clearTimeout(remoteTimer.current);
      pushTimer.current = null;
      remoteTimer.current = null;
    };
    const teardown = () => {
      clearTimers();
      storeUnsub.current?.();
      storeUnsub.current = null;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    if (!userId) {
      teardown();
      syncedUserId.current = null;
      return;
    }

    if (syncedUserId.current === userId) return;
    syncedUserId.current = userId;

    // A teammate (or another device) changed a visible row -> refresh, unless we
    // have unsynced local edits, in which case remember to pull once they land.
    const doRemotePull = () => {
      remoteTimer.current = null;
      if (useGearStore.getState().syncDirty) {
        pendingRemote.current = true;
        return;
      }
      pendingRemote.current = false;
      // applyingRemote is flipped by pullFromCloud ONLY around its synchronous
      // setState (via markApplying), never across the network fetch -- so an
      // edit made while the pull is in flight is still marked dirty by the
      // subscriber, and skipApplyIf then aborts the apply so it isn't clobbered.
      pullFromCloud(userId, {
        skipApplyIf: () => useGearStore.getState().syncDirty,
        markApplying: (v) => {
          applyingRemote.current = v;
        },
      })
        .then((applied) => {
          if (!applied) {
            // A local edit raced us; retry after its push lands.
            pendingRemote.current = true;
            scheduleRemotePull();
          }
        })
        .catch((err) => console.warn('[realtime] pull failed', err));
    };
    const scheduleRemotePull = () => {
      if (remoteTimer.current) clearTimeout(remoteTimer.current);
      remoteTimer.current = setTimeout(doRemotePull, REMOTE_PULL_DEBOUNCE_MS);
    };

    const push = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = null;
      pushToCloud(userId)
        .then(() => {
          useGearStore.getState().setSyncDirty(false);
          // If teammate changes arrived while we were dirty, apply them now.
          if (pendingRemote.current) scheduleRemotePull();
        })
        .catch((err) => console.warn('[sync] push failed', err));
    };
    // Push right now (not debounced) if there is unsynced work -- used when the
    // tab is backgrounded/closed and on reconnect, to shrink the window where an
    // edit lives only on this device.
    const flush = () => {
      if (useGearStore.getState().syncDirty) push();
    };
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flush();
    };

    let cancelled = false;
    syncOnLogin(userId)
      .catch((err) => console.warn('[sync] initial sync failed, continuing offline', err))
      .finally(() => {
        if (cancelled) return;
        storeUnsub.current = useGearStore.subscribe((state, prev) => {
          if (state.gear === prev.gear && state.trips === prev.trips) return;
          // This change came from a remote pull, not a user edit -- don't treat
          // it as dirty (which would push it straight back and loop).
          if (applyingRemote.current) return;
          useGearStore.getState().setSyncDirty(true);
          if (pushTimer.current) clearTimeout(pushTimer.current);
          pushTimer.current = setTimeout(push, PUSH_DEBOUNCE_MS);
        });

        const channel = supabase.channel(`sync:${userId}`);
        for (const table of REALTIME_TABLES) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRemotePull);
        }
        channel.subscribe();
        channelRef.current = channel;

        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onVisibility);
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('pagehide', flush);
          window.addEventListener('online', flush);
        }
      });

    return () => {
      cancelled = true;
      teardown();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', flush);
        window.removeEventListener('online', flush);
      }
    };
  }, [userId]);
}
