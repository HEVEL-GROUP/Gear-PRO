import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Card, Chip, Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Plan, startCheckout } from '@/lib/stripe/checkout';
import { usePro } from '@/lib/stripe/usePro';
import { font, useTheme } from '@/theme/tokens';

const PLAN_COPY: Record<Plan, { label: string; price: string; sub: string }> = {
  monthly: { label: 'Monthly', price: '$10/mo', sub: 'Billed every month' },
  annual: { label: 'Annual', price: '$50/yr', sub: 'Billed once a year · save 58%' },
};

export default function SubscribeScreen() {
  const t = useTheme();
  const { session, isLoading, signOut } = useAuth();
  const { isPro, refresh } = usePro();
  const [plan, setPlan] = useState<Plan>('annual');
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
      await startCheckout(plan);
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
          Your free trial has ended (or this email already used one). Pick a plan to keep your
          gear, trips, and cloud sync going.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(Object.keys(PLAN_COPY) as Plan[]).map((key) => {
            const active = plan === key;
            return (
              <Pressable key={key} onPress={() => setPlan(key)} style={{ flex: 1 }}>
                <Card
                  style={{
                    alignItems: 'center',
                    paddingVertical: 16,
                    borderWidth: 2,
                    borderColor: active ? t.primary : t.border,
                  }}>
                  {key === 'annual' ? <Chip label="Best value" tone="sage" /> : null}
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text, marginTop: 8 }}>
                    {PLAN_COPY[key].label}
                  </Text>
                  <Text style={{ fontFamily: font.extrabold, fontSize: 22, color: t.text, marginTop: 4 }}>
                    {PLAN_COPY[key].price}
                  </Text>
                  <Text
                    style={{
                      fontFamily: font.medium,
                      fontSize: 11,
                      color: t.textMuted,
                      marginTop: 2,
                      textAlign: 'center',
                    }}>
                    {PLAN_COPY[key].sub}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: 10 }}>
          <Button
            label={busy ? 'Opening…' : `Subscribe — ${PLAN_COPY[plan].price}`}
            onPress={handleUpgrade}
          />
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
