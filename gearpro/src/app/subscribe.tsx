import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Card, Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { startCheckout } from '@/lib/stripe/checkout';
import { usePro } from '@/lib/stripe/usePro';
import { font, useTheme } from '@/theme/tokens';

export default function SubscribeScreen() {
  const t = useTheme();
  const { session, isLoading, signOut } = useAuth();
  const { isPro, refresh } = usePro();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || (session && isPro === null)) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (isPro) {
    return <Redirect href="/home" />;
  }

  const handleUpgrade = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startCheckout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <Mark size={48} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        </View>
        <Display style={{ fontSize: 24, textAlign: 'center' }}>Subscribe to continue</Display>
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 14,
            color: t.textMuted,
            textAlign: 'center',
            paddingHorizontal: 8,
          }}>
          Your free trial has ended (or this email already used one). $4.99/mo keeps your gear,
          trips, and cloud sync going.
        </Text>
        <Card style={{ gap: 10 }}>
          <Button label={busy ? 'Opening…' : 'Subscribe — $4.99/mo'} onPress={handleUpgrade} />
          {error && <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert }}>{error}</Text>}
          <Button label="I already subscribed — refresh" tone="ghost" onPress={refresh} />
        </Card>
        <Button
          label="Log out"
          tone="ghost"
          onPress={async () => {
            await signOut();
          }}
        />
      </View>
    </Screen>
  );
}
