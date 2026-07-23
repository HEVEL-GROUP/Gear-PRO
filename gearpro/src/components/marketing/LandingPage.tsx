import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollView, Text, useWindowDimensions, View, ViewStyle } from 'react-native';

import { FeaturedCard } from '@/components/TripCard';
import { Mark } from '@/components/Mark';
import { Card, Chip, Display, Eyebrow, Touchable } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

const MAX_WIDTH = 1080;

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
  {
    icon: 'sync-outline',
    title: 'Cloud sync across every device',
    body: "Add gear on your phone, plan a trip on your laptop. Everything's the same list, everywhere you log in.",
  },
];

const TRUST_POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'lock-closed-outline',
    title: 'Encrypted & isolated',
    body: 'Row-level security walls your data off from every other user — nobody else can query it, not even by accident.',
  },
  {
    icon: 'cloud-offline-outline',
    title: 'Offline-first, always',
    body: 'Your gear list lives on your device whether you have signal or not. Sync happens quietly in the background.',
  },
  {
    icon: 'card-outline',
    title: 'Cancel anytime',
    body: 'No lock-in, no hidden fees. Manage or cancel your subscription yourself, anytime, from the app.',
  },
];

const STEPS = [
  {
    title: 'Add your gear',
    body: 'Log what you own once — brand, weight, category, expiration if it has one. It’s yours forever, on every device.',
  },
  {
    title: 'Plan a trip',
    body: 'Create packs, assign gear to each one, and watch the weight add up in real time before you ever leave the driveway.',
  },
  {
    title: 'Check in, check out',
    body: 'Know exactly what’s still out there when the trip’s over — trips that end with gear still checked out get flagged automatically.',
  },
];

function BrowserFrame({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        overflow: 'hidden',
        shadowColor: '#201e1d',
        shadowOpacity: t.mode === 'dark' ? 0.45 : 0.14,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 22 },
        elevation: 10,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: t.surfaceAlt,
          borderBottomWidth: 1,
          borderColor: t.border,
        }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5605a' }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5b04f' }} />
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#5fb26a' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ backgroundColor: t.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 3 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 11, color: t.textMuted }}>gearpro.app/home</Text>
          </View>
        </View>
      </View>
      <View style={{ padding: 18 }}>{children}</View>
    </View>
  );
}

function FloatingStat({ label, value, style }: { label: string; value: string; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          position: 'absolute',
          backgroundColor: t.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#201e1d',
          shadowOpacity: 0.16,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
        },
        style,
      ]}>
      <Text style={{ fontFamily: font.semibold, fontSize: 10, color: t.textMuted, letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: font.extrabold, fontSize: 18, color: t.primary, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function NavBar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
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
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.onPrimary }}>Start free trial</Text>
        </View>
      </Touchable>
    </View>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', marginBottom: 28 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Display style={{ fontSize: 28, textAlign: 'center', marginTop: 8, maxWidth: 480 }}>{title}</Display>
      {subtitle && (
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 14,
            lineHeight: 21,
            color: t.textMuted,
            textAlign: 'center',
            marginTop: 10,
            maxWidth: 460,
          }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

export function LandingPage() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ alignItems: 'center' }}
      showsVerticalScrollIndicator={false}>
      <View style={{ width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: 20, paddingBottom: 70 }}>
        <NavBar onLogin={() => router.push('/login')} onSignup={() => router.push('/signup')} />

        {/* Hero */}
        <View
          style={{
            flexDirection: isWide ? 'row' : 'column',
            alignItems: isWide ? 'center' : 'stretch',
            gap: isWide ? 48 : 32,
            paddingVertical: 36,
          }}>
          <View style={{ flex: isWide ? 1 : undefined }}>
            <Chip label="Offline-first gear tracking" tone="sage" />
            <Text
              style={{
                fontFamily: font.display,
                fontSize: isWide ? 44 : 36,
                lineHeight: isWide ? 50 : 42,
                color: t.text,
                marginTop: 16,
                marginBottom: 12,
              }}>
              Gear tracked. Packs planned.{'\n'}
              <Text style={{ color: t.primary }}>Nothing left behind.</Text>
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: t.textMuted, maxWidth: 480 }}>
              Gear Pro is an offline-first gear manager for hunting, backpacking, and camping —
              plan trips, split gear across packs, and know exactly what came back.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
              <Touchable onPress={() => router.push('/signup')}>
                <View style={{ backgroundColor: t.primary, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 15 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.onPrimary }}>
                    Start 7-day free trial
                  </Text>
                </View>
              </Touchable>
              <Touchable onPress={() => router.push('/login')} style={{ paddingVertical: 8 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.textMuted }}>
                  Sign in to your account
                </Text>
              </Touchable>
            </View>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 10 }}>
              $10/mo or $50/yr after your trial · cancel anytime
            </Text>
          </View>

          <View style={{ flex: isWide ? 1 : undefined, paddingTop: isWide ? 0 : 8 }}>
            <View style={{ paddingTop: isWide ? 20 : 0, paddingRight: isWide ? 8 : 0 }}>
              <BrowserFrame>
                <FeaturedCard
                  weight={12.5}
                  target={63}
                  bags={2}
                  items={10}
                  packed={10}
                  name="Elk Season · Bighorns"
                  range="10/12 – 10/16"
                  breakdown={[
                    { category: 'Shelter', weight: 5.5 },
                    { category: 'Sleep', weight: 2.9 },
                    { category: 'Hunting', weight: 2.1 },
                  ]}
                  barColors={[t.primary, t.primaryDark, t.sageMuted]}
                  lifecycle="upcoming"
                />
              </BrowserFrame>
              {isWide && (
                <>
                  <FloatingStat label="PACKED" value="10 / 10 items" style={{ top: -14, right: -18 }} />
                  <FloatingStat label="TOTAL WEIGHT" value="12.5 lb" style={{ bottom: -14, left: -18 }} />
                </>
              )}
            </View>
          </View>
        </View>

        {/* Trust badges */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: isWide ? 'flex-start' : 'center',
            marginBottom: 44,
          }}>
          <Chip label="OFFLINE-FIRST" tone="neutral" />
          <Chip label="CLOUD SYNC" tone="neutral" />
          <Chip label="ROW-LEVEL SECURITY" tone="neutral" />
          <Chip label="7-DAY FREE TRIAL" tone="neutral" />
        </View>

        {/* Features */}
        <View style={{ marginBottom: 56 }}>
          <SectionHeader
            eyebrow="FEATURES"
            title="Everything a real trip needs"
            subtitle="Nothing bloated, nothing you have to configure — just the gear-tracking a hunting or backpacking trip actually requires."
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {FEATURES.map((f) => (
              <Card key={f.title} style={{ flexBasis: isWide ? '48%' : '100%', flexGrow: 1, gap: 10 }}>
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
                <View>
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, marginBottom: 4 }}>
                    {f.title}
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: t.textMuted }}>
                    {f.body}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </View>

        {/* Trust / security */}
        <View style={{ marginBottom: 56 }}>
          <SectionHeader
            eyebrow="YOUR DATA STAYS YOURS"
            title="Built to be trusted with your gear list"
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {TRUST_POINTS.map((p) => (
              <Card key={p.title} style={{ flexBasis: isWide ? '31.5%' : '100%', flexGrow: 1, gap: 10 }}>
                <Ionicons name={p.icon} size={22} color={t.primary} />
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{p.title}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: t.textMuted }}>
                  {p.body}
                </Text>
              </Card>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={{ marginBottom: 56 }}>
          <SectionHeader
            eyebrow="HOW IT WORKS"
            title="Set up in minutes"
            subtitle="Add your gear, plan a trip, and go — Gear Pro handles the weight math and the check-in list."
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            {STEPS.map((s, i) => (
              <Card key={s.title} style={{ flexBasis: isWide ? '31.5%' : '100%', flexGrow: 1, gap: 8 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: t.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: font.extrabold, fontSize: 14, color: t.onPrimary }}>{i + 1}</Text>
                </View>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{s.title}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: t.textMuted }}>
                  {s.body}
                </Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Pricing */}
        <View style={{ marginBottom: 56, alignItems: 'center' }}>
          <SectionHeader
            eyebrow="PRICING"
            title="Everything included, either way."
            subtitle="No free tier, no feature paywalls buried inside the app — just a 7-day trial to make sure it's for you."
          />
          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              gap: 16,
              width: '100%',
              maxWidth: isWide ? 720 : 380,
              alignItems: isWide ? 'flex-end' : 'stretch',
            }}>
            {(
              [
                { key: 'monthly', price: '$10', per: '/month', badge: null, sub: 'Billed every month' },
                {
                  key: 'annual',
                  price: '$50',
                  per: '/year',
                  badge: 'Best value · save 58%',
                  sub: 'Billed once a year',
                },
              ] as const
            ).map((plan) => (
              <Card
                key={plan.key}
                style={{
                  flex: 1,
                  borderColor: plan.key === 'annual' ? t.primary : t.border,
                  borderWidth: plan.key === 'annual' ? 2 : 1,
                  alignItems: 'center',
                  paddingVertical: 28,
                }}>
                {plan.badge ? <Chip label={plan.badge} tone="sage" /> : null}
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text, marginTop: plan.badge ? 10 : 0 }}>
                  GearPro Pro
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 8 }}>
                  <Text style={{ fontFamily: font.extrabold, fontSize: 40, color: t.text }}>{plan.price}</Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, marginBottom: 8 }}>
                    {plan.per}
                  </Text>
                </View>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                  {plan.sub} · 7-day free trial
                </Text>

                <View style={{ width: '100%', gap: 10, marginTop: 22, marginBottom: 22 }}>
                  {[
                    'Unlimited trips & gear',
                    'Cloud sync across every device',
                    'Works fully offline',
                    'Weight tracking & check-in / check-out',
                    'Cancel anytime from the app',
                  ].map((line) => (
                    <View key={line} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={16} color={t.primary} />
                      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.text }}>{line}</Text>
                    </View>
                  ))}
                </View>

                <Touchable onPress={() => router.push('/signup')} style={{ width: '100%' }}>
                  <View
                    style={{
                      backgroundColor: plan.key === 'annual' ? t.primary : t.soft,
                      borderRadius: 14,
                      paddingVertical: 15,
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontFamily: font.bold,
                        fontSize: 15,
                        color: plan.key === 'annual' ? t.onPrimary : t.softText,
                      }}>
                      Start your free trial
                    </Text>
                  </View>
                </Touchable>
              </Card>
            ))}
          </View>
        </View>

        {/* Closing CTA */}
        <View
          style={{
            alignItems: 'center',
            backgroundColor: t.soft,
            borderRadius: 24,
            paddingVertical: 44,
            paddingHorizontal: 24,
            marginBottom: 44,
          }}>
          <Display style={{ fontSize: 26, textAlign: 'center', maxWidth: 420 }}>
            Stop wondering what you forgot.
          </Display>
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 14,
              color: t.softText,
              textAlign: 'center',
              marginTop: 10,
              maxWidth: 420,
            }}>
            Track it once, pack it every time, and know exactly what came back.
          </Text>
          <Touchable onPress={() => router.push('/signup')} style={{ marginTop: 20 }}>
            <View style={{ backgroundColor: t.primary, borderRadius: 14, paddingHorizontal: 26, paddingVertical: 15 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.onPrimary }}>
                Start 7-day free trial
              </Text>
            </View>
          </Touchable>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.softText, marginTop: 12 }}>
            $10/mo or $50/yr after trial · cancel anytime
          </Text>
        </View>

        {/* Footer */}
        <View style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 24 }}>
          <View
            style={{
              flexDirection: isWide ? 'row' : 'column',
              gap: isWide ? 40 : 24,
            }}>
            <View style={{ flex: isWide ? 1.4 : undefined, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Mark size={20} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
                <Text style={{ fontFamily: font.display, fontSize: 15, color: t.text }}>Gear Pro</Text>
              </View>
              <Text style={{ fontFamily: font.medium, fontSize: 12, lineHeight: 18, color: t.textMuted, maxWidth: 260 }}>
                Offline-first gear tracking and trip planning for hunters, backpackers, and campers.
              </Text>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Eyebrow>PRODUCT</Eyebrow>
              <Touchable onPress={() => router.push('/signup')}>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>Start free trial</Text>
              </Touchable>
              <Touchable onPress={() => router.push('/login')}>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>Sign in</Text>
              </Touchable>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Eyebrow>COMPANY</Eyebrow>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>Built by Hevel Group</Text>
            </View>
          </View>
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>
              © {new Date().getFullYear()} Gear Pro · Built by Hevel Group
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
