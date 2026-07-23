import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/form';
import { ClearDemoDataSheet } from '@/components/ClearDemoDataSheet';
import { DeleteAccountSheet } from '@/components/DeleteAccountSheet';
import { Mark } from '@/components/Mark';
import { Card, Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { exportData } from '@/lib/export';
import { tapLight } from '@/lib/haptics';
import { openBillingPortal } from '@/lib/stripe/checkout';
import { usePro } from '@/lib/stripe/usePro';
import { demoDataCounts, useGearStore } from '@/store/useGearStore';
import { font, useTheme } from '@/theme/tokens';

function daysLeft(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

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
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const { session, signOut } = useAuth();
  const { planType, source, trialEndsAt } = usePro();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const resetLocal = useGearStore((s) => s.resetLocal);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [demoSheetOpen, setDemoSheetOpen] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);

  const isTrial = planType === 'trial';
  // Only a real Stripe subscription has a billing-portal session to open --
  // a manually-granted or demo access row has no Stripe customer behind it.
  const hasStripeBilling = source === 'stripe';
  const demoCounts = useMemo(() => demoDataCounts(gear, trips), [gear, trips]);
  const hasDemoData = demoCounts.gear > 0 || demoCounts.trips > 0;

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
    <Screen maxWidth={isWide ? 860 : 720}>
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
        <Pressable
          onPress={async () => {
            setExportError(null);
            try {
              tapLight();
              await exportData();
            } catch (err) {
              setExportError(err instanceof Error ? err.message : 'Export failed');
            }
          }}>
          <Row icon="download-outline" title="Backup & export" subtitle="Download a copy of your gear and trips as JSON" />
        </Pressable>
      </Card>
      {exportError && (
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert, marginTop: 6 }}>{exportError}</Text>
      )}

      <View style={{ height: 12 }} />

      {planType !== null && (
        <Card style={{ paddingVertical: 16, gap: 10 }}>
          <View>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>
              {isTrial ? 'Free trial' : 'GearPro Pro'}
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
              {isTrial && trialEndsAt
                ? `${daysLeft(trialEndsAt)} day${daysLeft(trialEndsAt) === 1 ? '' : 's'} left — subscribe anytime`
                : hasStripeBilling
                  ? "You're supporting GearPro's development"
                  : 'Complimentary access — no billing on this account'}
            </Text>
          </View>
          {(isTrial || hasStripeBilling) && (
            <Button
              label={billingBusy ? 'Opening…' : isTrial ? 'Choose a plan' : 'Manage subscription'}
              tone={isTrial ? 'primary' : 'ghost'}
              onPress={() => (isTrial ? router.push('/subscribe') : handleBilling(openBillingPortal))}
            />
          )}
          {billingError && (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert }}>{billingError}</Text>
          )}
        </Card>
      )}

      {hasDemoData ? (
        <>
          <View style={{ height: 12 }} />
          <Pressable onPress={() => setDemoSheetOpen(true)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: t.alertSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="trash-outline" size={18} color={t.alertText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>Clear demo data</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                  Remove the sample gear and trips Gear Pro ships with
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </Card>
          </Pressable>
        </>
      ) : null}

      <View style={{ height: 16 }} />

      <Pressable
        onPress={async () => {
          tapLight();
          await signOut();
          resetLocal();
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

      <Pressable onPress={() => setDeleteSheetOpen(true)} style={{ marginTop: 20, alignSelf: 'center' }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>Delete account</Text>
      </Pressable>

      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 16 }}>
        Gear Pro v2 · web preview
      </Text>

      <ClearDemoDataSheet visible={demoSheetOpen} onClose={() => setDemoSheetOpen(false)} />
      <DeleteAccountSheet visible={deleteSheetOpen} onClose={() => setDeleteSheetOpen(false)} />
    </Screen>
  );
}
