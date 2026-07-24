import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { Card, Display, Screen } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

function StepRow({ n, title, body }: { n: number; title: string; body: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 14, marginBottom: 18 }}>
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: t.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: t.onPrimary }}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{title}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 3, lineHeight: 20 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function ConceptRow({ icon, title, body }: { icon: any; title: string; body: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 11,
          backgroundColor: t.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={18} color={t.softText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>{title}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 2, lineHeight: 20 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: 11,
        color: t.softText,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 26,
        marginBottom: 10,
      }}>
      {children}
    </Text>
  );
}

export default function HelpScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;

  return (
    <Screen maxWidth={isWide ? 760 : 720}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 10 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 6 }}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </Pressable>
        <Display style={{ fontSize: 24 }}>How Gear Pro works</Display>
      </View>

      <Text style={{ fontFamily: font.medium, fontSize: 15, color: t.textMuted, lineHeight: 23, marginBottom: 6 }}>
        The idea is simple: log each piece of gear <Text style={{ fontFamily: font.bold, color: t.text }}>once</Text>,
        then reuse it across every trip. You pack it into bags, take it out, and Gear Pro tells you exactly what
        made it home — so nothing gets lost or forgotten.
      </Text>

      <SectionLabel>The core loop</SectionLabel>
      <Card style={{ paddingVertical: 18, paddingHorizontal: 16 }}>
        <StepRow
          n={1}
          title="Build your gear library"
          body="Add everything you own once — brand, weight, category, and an expiration date if it has one (like a first-aid kit). This is your master list; you never re-enter it."
        />
        <StepRow
          n={2}
          title="Plan a trip"
          body="Create a trip with dates and a location. Gear Pro pulls a weather forecast for U.S. locations so you can pack for the conditions."
        />
        <StepRow
          n={3}
          title="Pack your bags"
          body="A trip can have several bags (a main pack, a day pack…). Assign gear to each bag and watch the weight add up against the bag's limit before you ever leave the house."
        />
        <StepRow
          n={4}
          title="Check gear back in"
          body="When the trip ends, check each item back in as Returned, Needs repair, Consumed, or Lost. Anything still 'packed' when a trip is over gets flagged so nothing quietly disappears."
        />
      </Card>

      <SectionLabel>Good to know</SectionLabel>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        <ConceptRow
          icon="pricetags-outline"
          title="Categories"
          body="Gear is grouped by category (Shelter, Sleep, Cooking…). Tap the tag icon on the Gear screen to add your own custom categories or rename them."
        />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <ConceptRow
          icon="alert-circle-outline"
          title="Needs attention"
          body="Gear checked in as broken, used up, or lost is pulled out of your available pool and listed under 'Needs attention' until you repair/restock it or remove it for good."
        />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <ConceptRow
          icon="time-outline"
          title="Expiration alerts"
          body="Anything with an expiration date that's expired — or expiring within 3 months — shows up in a banner on the Gear screen so you can replace it before a trip."
        />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <ConceptRow
          icon="cloud-upload-outline"
          title="Import your gear"
          body="Already have a spreadsheet? Use the upload icon on the Gear screen to import a CSV or Excel file instead of adding items one by one."
        />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <ConceptRow
          icon="cloud-offline-outline"
          title="Works offline, syncs everywhere"
          body="Your gear and trips live on your device first, so the app works with no signal in the field. When you're back online it syncs automatically to every device you log into."
        />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <ConceptRow
          icon="download-outline"
          title="Your data is yours"
          body="Export a full backup of your gear and trips anytime from the You screen, and delete your account and all its data whenever you want."
        />
      </Card>

      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, textAlign: 'center', marginTop: 24, marginBottom: 8, lineHeight: 20 }}>
        Still stuck? Email us at support@gearpro.app.
      </Text>
    </Screen>
  );
}
