import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

function Section({ title, children }: { title: string; children: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, marginBottom: 6 }}>{title}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, lineHeight: 21 }}>
        {children}
      </Text>
    </View>
  );
}

export default function PrivacyScreen() {
  const t = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ paddingTop: 24, paddingBottom: 20, alignItems: 'center' }}>
        <Mark size={32} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 22, marginTop: 12 }}>Privacy Policy</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          Last updated August 3, 2026
        </Text>
      </View>

      <Section title="What Gear Pro stores">
        Your gear list, trips, bags, and packing status are stored on your device. If you create an
        account, that same data is also stored in our database (Supabase) so it can sync across your
        devices. We collect the email address you sign up with. If you add gear matched to an item in our
        product catalog, the weight you enter may be stored as a contribution toward that item&apos;s
        community weight, tied to your account -- this is used only to help other users see accurate gear
        weights, never shared or sold.
      </Section>

      <Section title="Location and weather">
        When you type a trip location, we send your search text to OpenStreetMap's Nominatim service to
        look up real places -- this request isn't linked to your account. If you pick a matched place, we
        store its coordinates with that trip so we can show a weather forecast, which we get from the
        U.S. National Weather Service (api.weather.gov) using only those coordinates and your trip dates --
        again, not linked to your account. Forecasts are U.S.-only.
      </Section>

      <Section title="Payment">
        Gear Pro is free. If you choose to make an optional one-time contribution to support the app,
        that payment is handled by Stripe -- we don&apos;t see or store your card details, and the payment
        doesn&apos;t affect your account in any way.
      </Section>

      <Section title="Sign in with Google">
        If you sign in with Google, Google shares your name, email address, and profile photo with us so
        we can create your account. We don't request access to anything else in your Google account.
      </Section>

      <Section title="What we don't do">
        We don't sell your data, run ad tracking, or share your gear/trip information with anyone. We
        don't use your data to train any model.
      </Section>

      <Section title="Deleting your data">
        You can delete individual gear items and trips at any time in the app. To delete your account and
        all associated data entirely, go to the You screen and use "Delete account" -- this is permanent
        and can't be undone.
      </Section>

      <Section title="Children">
        Gear Pro isn't directed at children under 13, and we don't knowingly collect information from
        them.
      </Section>

      <Section title="Contact">
        Questions about this policy or your data: support@gearpro.app
      </Section>

      <Pressable onPress={() => router.back()} style={{ marginTop: 8, marginBottom: 24, alignSelf: 'center' }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>Back</Text>
      </Pressable>
    </Screen>
  );
}
