import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Card, Chip, Display, Screen } from '@/components/ui';
import { startDonation } from '@/lib/stripe/checkout';
import { font, useTheme } from '@/theme/tokens';

// Optional, non-gating -- reachable from the You tab, never a redirect
// target. GearPro is free; this is just a way to help cover hosting costs
// if someone wants to.
const AMOUNTS = [
  { cents: 500, label: '$5' },
  { cents: 1000, label: '$10' },
  { cents: 2500, label: '$25' },
];

export default function DonateScreen() {
  const t = useTheme();
  const [amountCents, setAmountCents] = useState(AMOUNTS[1].cents);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDonate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await startDonation(amountCents);
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
        <Display style={{ fontSize: 24, textAlign: 'center' }}>Support GearPro</Display>
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 14,
            color: t.textMuted,
            textAlign: 'center',
            paddingHorizontal: 8,
          }}>
          GearPro is free, forever. If it&apos;s useful to you, a one-time contribution helps cover
          hosting costs — totally optional, no account changes either way.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {AMOUNTS.map(({ cents, label }) => {
            const active = amountCents === cents;
            return (
              <Pressable key={cents} onPress={() => setAmountCents(cents)} style={{ flex: 1 }}>
                <Card
                  style={{
                    alignItems: 'center',
                    paddingVertical: 16,
                    borderWidth: 2,
                    borderColor: active ? t.primary : t.border,
                  }}>
                  {cents === AMOUNTS[1].cents ? <Chip label="Most common" tone="sage" /> : null}
                  <Text
                    style={{
                      fontFamily: font.extrabold,
                      fontSize: 22,
                      color: t.text,
                      marginTop: cents === AMOUNTS[1].cents ? 10 : 0,
                    }}>
                    {label}
                  </Text>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: 10 }}>
          <Button
            label={busy ? 'Opening…' : `Support GearPro — $${(amountCents / 100).toFixed(0)}`}
            onPress={handleDonate}
          />
          {error && <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert }}>{error}</Text>}
        </Card>
      </View>
    </Screen>
  );
}
