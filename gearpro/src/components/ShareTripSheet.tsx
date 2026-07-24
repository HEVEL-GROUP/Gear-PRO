import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Sheet } from '@/components/form';
import { tapLight, tapSuccess } from '@/lib/haptics';
import {
  joinUrl,
  leaveTrip,
  shareTrip,
  TripMember,
  tripMemberNames,
  unshareTrip,
} from '@/lib/sharing/sharing';
import { Trip, useGearStore } from '@/store/useGearStore';
import { font, useTheme } from '@/theme/tokens';

// Reflect a share-token change in the local store immediately, so the "Shared"
// badge appears/disappears without waiting for the next pull. share_token is
// server-managed and toTripRow never writes it, so the debounced push this
// triggers can't clobber it in the DB.
function setLocalShareToken(tripId: string, token: string | undefined) {
  useGearStore.setState((s) => ({
    trips: s.trips.map((tr) => (tr.id === tripId ? { ...tr, shareToken: token } : tr)),
  }));
}

// Copies text without pulling in a native clipboard dependency -- the app ships
// as a web export, so the browser Clipboard API is the target, with an
// execCommand fallback for older/insecure contexts. Returns whether it worked.
async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    if (typeof document !== 'undefined') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  } catch {
    // ignore
  }
  return false;
}

function displayFor(m: TripMember): string {
  return m.displayName?.trim() || 'Unnamed teammate';
}

export function ShareTripSheet({
  visible,
  onClose,
  trip,
  userId,
  onLeft,
}: {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
  userId: string;
  onLeft: () => void;
}) {
  const t = useTheme();
  const isOwner = !trip.ownerId || trip.ownerId === userId;
  const [token, setToken] = useState<string | undefined>(trip.shareToken);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<'unshare' | 'leave' | null>(null);

  const isShared = !!token || trip.shared;

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await tripMemberNames(trip.id));
    } catch {
      // roster is non-critical; leave it empty on failure
    }
  }, [trip.id]);

  // Keep local token in step with the trip prop, and pull the roster whenever
  // the sheet opens on a shared trip.
  useEffect(() => {
    setToken(trip.shareToken);
  }, [trip.shareToken]);

  useEffect(() => {
    if (visible && isShared) loadMembers();
    if (!visible) {
      setError(null);
      setCopied(false);
      setConfirm(null);
    }
  }, [visible, isShared, loadMembers]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const doShare = () =>
    run(async () => {
      const tok = await shareTrip(trip.id);
      setToken(tok);
      setLocalShareToken(trip.id, tok);
      tapSuccess();
      await loadMembers();
    });

  const doCopy = async () => {
    if (!token) return;
    const ok = await copyText(joinUrl(token));
    setCopied(ok);
    if (ok) tapSuccess();
  };

  const doUnshare = () =>
    run(async () => {
      await unshareTrip(trip.id);
      setToken(undefined);
      setLocalShareToken(trip.id, undefined);
      setMembers([]);
      setConfirm(null);
      tapSuccess();
    });

  const doLeave = () =>
    run(async () => {
      await leaveTrip(trip.id, userId);
      tapSuccess();
      onClose();
      onLeft();
    });

  // Confirm step (swaps the body rather than stacking a second modal).
  if (confirm) {
    const leaving = confirm === 'leave';
    return (
      <Sheet visible={visible} onClose={onClose} title={leaving ? 'Leave this trip?' : 'Stop sharing?'}>
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, marginBottom: 18, lineHeight: 20 }}>
          {leaving
            ? "You'll be removed from this shared trip and it'll disappear from your list. Your own gear stays in your library. You can rejoin with the link."
            : 'The link will stop working and everyone you shared with will be removed. Your trip and gear stay yours. You can share again anytime.'}
        </Text>
        <Button
          label={busy ? 'Working…' : leaving ? 'Leave trip' : 'Stop sharing'}
          tone="danger"
          onPress={leaving ? doLeave : doUnshare}
        />
        <View style={{ height: 8 }} />
        <Button label="Cancel" tone="ghost" onPress={() => setConfirm(null)} />
        {error ? <ErrorLine text={error} /> : null}
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={isShared ? 'Shared trip' : 'Share this trip'}>
      {!isShared ? (
        <>
          <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, marginBottom: 18, lineHeight: 20 }}>
            Get a link that lets a friend join this trip. You'll each pack your own gear and see what the other is
            bringing. Everyone keeps their own gear list.
          </Text>
          <Button
            label={busy ? 'Creating link…' : 'Create share link'}
            icon={<Ionicons name="link-outline" size={18} color={t.onPrimary} />}
            onPress={doShare}
          />
        </>
      ) : (
        <>
          {isOwner && token ? (
            <>
              <Text style={{ fontFamily: font.bold, fontSize: 11, color: t.softText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Join link
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: t.soft,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  marginBottom: 10,
                }}>
                <Ionicons name="link" size={16} color={t.softText} />
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: t.text }}>
                  {joinUrl(token)}
                </Text>
              </View>
              <Button
                label={copied ? 'Copied!' : 'Copy link'}
                icon={<Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={17} color={t.onPrimary} />}
                onPress={doCopy}
              />
              <View style={{ height: 20 }} />
            </>
          ) : (
            <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, marginBottom: 18, lineHeight: 20 }}>
              This trip was shared with you. You each pack your own gear — anything you add here is yours.
            </Text>
          )}

          <Text style={{ fontFamily: font.bold, fontSize: 11, color: t.softText, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            {members.length > 0 ? `On this trip · ${members.length}` : 'On this trip'}
          </Text>
          {members.map((m) => {
            const isSelf = m.memberId === userId;
            const isTripOwner = m.role === 'owner';
            return (
              <View
                key={m.memberId}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: isTripOwner ? t.primary : t.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 13, color: isTripOwner ? t.onPrimary : t.softText }}>
                    {displayFor(m).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: t.text }}>
                  {isSelf ? `${displayFor(m)} (you)` : displayFor(m)}
                </Text>
                {isTripOwner ? (
                  <Text style={{ fontFamily: font.bold, fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Owner
                  </Text>
                ) : null}
              </View>
            );
          })}

          <View style={{ height: 20 }} />
          {isOwner ? (
            <Button label="Stop sharing" tone="danger" onPress={() => setConfirm('unshare')} />
          ) : (
            <Button label="Leave trip" tone="danger" onPress={() => setConfirm('leave')} />
          )}
        </>
      )}
      {error ? <ErrorLine text={error} /> : null}
    </Sheet>
  );
}

function ErrorLine({ text }: { text: string }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginTop: 12, textAlign: 'center' }}>
      {text}
    </Text>
  );
}
