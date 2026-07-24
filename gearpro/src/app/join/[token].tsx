import { Ionicons } from '@expo/vector-icons';
import { type Href, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { setPendingJoin } from '@/lib/sharing/pendingJoin';
import { joinTripByToken } from '@/lib/sharing/sharing';
import { font, useTheme } from '@/theme/tokens';

// Opening a share link lands here. Logged out -> stash the token and bounce to
// login (the authed-landing redirect brings us back). Logged in -> join and
// forward to the trip. The token lives in the route path, so a round-trip
// through login never loses it.
export default function JoinScreen() {
  const t = useTheme();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session, isLoading } = useAuth();
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading || !session || attempted.current || !token) return;
    attempted.current = true;
    (async () => {
      try {
        const id = await joinTripByToken(token, session.user.id);
        setTripId(id);
      } catch (e) {
        // A genuinely dead token surfaces the RPC's "invalid or expired link";
        // anything else (offline/transient/a real bug) is retryable, so don't
        // mislabel a working link as turned off. Always logged, and the raw
        // message rides along in the UI too (not just devtools) -- otherwise
        // an unexpected, non-transient failure looks IDENTICAL to "you're
        // offline" and retry just fails the same way forever with no way to
        // tell what's actually wrong.
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[join] failed to join trip', e);
        if (/invalid or expired/i.test(msg)) {
          setError({
            message: "This share link is invalid or has been turned off. Ask your trip's owner for a new one.",
            retryable: false,
          });
        } else {
          setError({
            message: `Couldn't finish joining this trip. Check your connection and try again.${msg ? `\n\n(${msg})` : ''}`,
            retryable: true,
          });
        }
      }
    })();
  }, [isLoading, session, token, retryKey]);

  const retry = () => {
    attempted.current = false;
    setError(null);
    setRetryKey((k) => k + 1);
  };

  if (!isLoading && !session && token) {
    setPendingJoin(token);
    return <Redirect href="/login" />;
  }

  if (tripId) return <Redirect href={`/trip/${tripId}` as Href} />;

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
        <Mark size={40} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        {error ? (
          <>
            <Ionicons name="alert-circle-outline" size={28} color={t.alert} />
            <Display style={{ fontSize: 20, textAlign: 'center' }}>Can't join this trip</Display>
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 14,
                color: t.textMuted,
                textAlign: 'center',
                maxWidth: 320,
              }}>
              {error.message}
            </Text>
            <View style={{ width: 200, marginTop: 8, gap: 8 }}>
              {error.retryable ? <Button label="Try again" onPress={retry} /> : null}
              <Button
                label="Go to my trips"
                tone={error.retryable ? 'ghost' : 'primary'}
                onPress={() => router.replace('/home')}
              />
            </View>
          </>
        ) : (
          <>
            <Display style={{ fontSize: 20 }}>Joining trip…</Display>
            <ActivityIndicator color={t.primary} />
          </>
        )}
      </View>
    </Screen>
  );
}
