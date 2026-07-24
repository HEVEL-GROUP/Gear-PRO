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
  const [error, setError] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading || !session || attempted.current || !token) return;
    attempted.current = true;
    (async () => {
      try {
        const id = await joinTripByToken(token, session.user.id);
        setTripId(id);
      } catch {
        setError("This share link is invalid or has been turned off. Ask your trip's owner for a new one.");
      }
    })();
  }, [isLoading, session, token]);

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
              {error}
            </Text>
            <View style={{ width: 200, marginTop: 8 }}>
              <Button label="Go to my trips" onPress={() => router.replace('/home')} />
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
