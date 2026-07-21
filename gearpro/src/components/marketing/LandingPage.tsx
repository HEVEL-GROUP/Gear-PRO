import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Mark } from '@/components/Mark';
import { Card, Chip, Touchable } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'cloud-offline-outline',
    title: 'Works with zero signal',
    body: 'Your gear list and packing plans live on your device first. No bars in the mountains, no problem.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Pack by the bag, not the pile',
    body: 'Split gear across multiple packs, see the weight distribution, and know exactly what’s in each one before you leave.',
  },
  {
    icon: 'checkmark-done-outline',
    title: 'A real check-in / check-out flow',
    body: 'Planned → Packed → Returned. Trips that end with gear still checked out get flagged automatically — nothing goes missing quietly.',
  },
];

function NavBar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        marginBottom: 8,
      }}>
      <Mark size={26} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
      <Text style={{ fontFamily: font.display, fontSize: 19, color: t.text, marginLeft: 8 }}>Gear Pro</Text>
      <View style={{ flex: 1 }} />
      <Touchable onPress={onLogin} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.textMuted }}>Log in</Text>
      </Touchable>
      <Touchable onPress={onSignup}>
        <View style={{ backgroundColor: t.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.onPrimary }}>Get started</Text>
        </View>
      </Touchable>
    </View>
  );
}

export function LandingPage() {
  const t = useTheme();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 720, paddingHorizontal: 18, paddingBottom: 60 }}>
        <NavBar onLogin={() => router.push('/login')} onSignup={() => router.push('/signup')} />

        <View style={{ paddingVertical: 36 }}>
          <Chip label="Now with accounts + cloud sync" tone="sage" />
          <Text
            style={{
              fontFamily: font.display,
              fontSize: 40,
              lineHeight: 46,
              color: t.text,
              marginTop: 16,
              marginBottom: 12,
            }}>
            Gear tracked. Packs planned.{'\n'}Nothing left behind.
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: t.textMuted, maxWidth: 520 }}>
            Gear Pro is an offline-first gear manager for hunting, backpacking, and camping —
            plan trips, split gear across packs, and know exactly what came back.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
            <Touchable onPress={() => router.push('/signup')}>
              <View style={{ backgroundColor: t.primary, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 15 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.onPrimary }}>Start free</Text>
              </View>
            </Touchable>
            <Touchable onPress={() => router.push('/login')}>
              <View
                style={{
                  borderRadius: 14,
                  paddingHorizontal: 22,
                  paddingVertical: 15,
                  borderWidth: 1,
                  borderColor: t.border,
                }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text }}>I have an account</Text>
              </View>
            </Touchable>
          </View>
        </View>

        <View style={{ gap: 14, marginBottom: 40 }}>
          {FEATURES.map((f) => (
            <Card key={f.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: t.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={f.icon} size={21} color={t.softText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, marginBottom: 4 }}>{f.title}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: t.textMuted }}>
                  {f.body}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontFamily: font.display, fontSize: 24, color: t.text, marginBottom: 16 }}>Pricing</Text>
          <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
            <Card style={{ flex: 1, minWidth: 220 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text }}>Free</Text>
              <Text style={{ fontFamily: font.extrabold, fontSize: 26, color: t.text, marginTop: 6 }}>$0</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 8, lineHeight: 19 }}>
                Everything offline, on one device, forever.
              </Text>
            </Card>
            <Card style={{ flex: 1, minWidth: 220, borderColor: t.primary, borderWidth: 2 }}>
              <Chip label="Coming soon" tone="solid" />
              <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, marginTop: 10 }}>Pro</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 8, lineHeight: 19 }}>
                Cloud sync across every device, automatic backup.
              </Text>
            </Card>
          </View>
        </View>

        <View style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 18 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>
            © {new Date().getFullYear()} Gear Pro
          </Text>
        </View>
      </View>
    </View>
  );
}
