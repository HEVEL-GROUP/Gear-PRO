import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Card, Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tapLight } from '@/lib/haptics';
import { openBillingPortal, startCheckout } from '@/lib/stripe/checkout';
import { supabase } from '@/lib/supabase/client';
import { font, useTheme } from '@/theme/tokens';

function Row({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: t.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={19} color={t.softText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{title}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function YouScreen() {
  const t = useTheme();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase.rpc('is_pro_user').then(({ data, error }) => {
      if (!error) setIsPro(Boolean(data));
    });
  }, [session]);

  const handleBilling = async (action: () => Promise<void>) => {
    if (billingBusy) return;
    setBillingBusy(true);
    setBillingError(null);
    try {
      await action();
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBillingBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ paddingTop: 8, paddingBottom: 14 }}>
        <Display style={{ fontSize: 26 }}>You</Display>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Mark size={44} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 20, marginTop: 10 }}>Gear Pro</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 2 }}>
          Signed in as {session?.user.email}
        </Text>
      </Card>

      <View style={{ height: 12 }} />

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="cloud-offline-outline" title="Works offline" subtitle="Your gear and trips live on this device first" />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Row icon="cloud-upload-outline" title="Cloud sync" subtitle="Your data syncs automatically across every device you log into" />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Row icon="download-outline" title="Backup & export" subtitle="Save a copy of your data — coming soon" />
      </Card>

      <View style={{ height: 12 }} />

      {isPro !== null && (
        <Card style={{ paddingVertical: 16, gap: 10 }}>
          <View>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>
              {isPro ? 'GearPro Pro' : 'Free plan'}
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
              {isPro ? "You're supporting GearPro's development" : 'Upgrade whenever you’re ready'}
            </Text>
          </View>
          <Button
            label={billingBusy ? 'Opening…' : isPro ? 'Manage subscription' : 'Upgrade to Pro'}
            tone={isPro ? 'ghost' : 'primary'}
            onPress={() => handleBilling(isPro ? openBillingPortal : startCheckout)}
          />
          {billingError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert }}>{billingError}</Text>
          )}
        </Card>
      )}

      <View style={{ height: 16 }} />

      <Pressable
        onPress={async () => {
          tapLight();
          await signOut();
          router.replace('/');
        }}>
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: t.alertSoft,
          }}>
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.alertText }}>Log out</Text>
        </View>
      </Pressable>

      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 16 }}>
        Gear Pro v2 · web preview
      </Text>
    </Screen>
  );
}
