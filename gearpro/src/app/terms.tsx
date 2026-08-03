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

export default function TermsScreen() {
  const t = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ paddingTop: 24, paddingBottom: 20, alignItems: 'center' }}>
        <Mark size={32} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 22, marginTop: 12 }}>Terms of Service</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          Last updated August 3, 2026
        </Text>
      </View>

      <Section title="Agreement to these terms">
        By creating an account or using Gear Pro, you agree to these Terms of Service. If you don't agree,
        don't use the app. Gear Pro is built and operated by Hevel Group.
      </Section>

      <Section title="The service">
        Gear Pro is an offline-first gear tracking and trip-planning tool for hunting, backpacking, and
        camping. It's provided "as is" -- weight totals, packing lists, and weather forecasts are aids for
        planning, not a substitute for your own judgment or professional safety advice in the field.
      </Section>

      <Section title="Accounts">
        You need an account to sync across devices. You&apos;re responsible for keeping your login
        credentials secure and for all activity under your account.
      </Section>

      <Section title="Gear Pro is free">
        Gear Pro is free to use, with no subscription, trial period, or feature paywall. If you&apos;d like
        to help cover hosting costs, you can make an optional one-time contribution from the app; it&apos;s
        processed by Stripe (we never see or store your card details), it&apos;s entirely voluntary, and it
        doesn&apos;t unlock any additional features or change your account in any way.
      </Section>

      <Section title="Acceptable use">
        Don't use Gear Pro to break the law, interfere with the service, attempt to access another user's
        data, or reverse-engineer the app beyond what's permitted by law.
      </Section>

      <Section title="Your data">
        Your gear, trips, and account details are handled as described in our Privacy Policy. You can
        delete individual items anytime, and delete your account and all associated data at any time from
        the You screen.
      </Section>

      <Section title="Disclaimer of warranties">
        Gear Pro is provided without warranties of any kind, express or implied, including fitness for a
        particular purpose. Weather data comes from the U.S. National Weather Service and location lookups
        from OpenStreetMap -- we don't control or guarantee their accuracy or availability.
      </Section>

      <Section title="Limitation of liability">
        To the fullest extent permitted by law, Hevel Group isn't liable for any indirect, incidental, or
        consequential damages arising from your use of Gear Pro, including gear left behind, trip planning
        errors, or forecast inaccuracies. Because Gear Pro is provided free of charge, our total liability
        for any claim is limited to $100.
      </Section>

      <Section title="Termination">
        You can stop using Gear Pro and delete your account at any time. We may suspend or terminate access
        for violations of these terms.
      </Section>

      <Section title="Changes to these terms">
        We may update these terms from time to time. Continuing to use Gear Pro after a change means you
        accept the updated terms.
      </Section>

      <Section title="Governing law">
        These terms are governed by the laws applicable to Hevel Group's principal place of business,
        without regard to conflict-of-laws principles.
      </Section>

      <Section title="Contact">
        Questions about these terms: support@gearpro.app
      </Section>

      <Pressable onPress={() => router.back()} style={{ marginTop: 8, marginBottom: 24, alignSelf: 'center' }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>Back</Text>
      </Pressable>
    </Screen>
  );
}
