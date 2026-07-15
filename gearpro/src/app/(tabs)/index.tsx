import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Mark } from '@/components/Mark';
import { TripFormModal } from '@/components/TripFormModal';
import { Card, Chip, Display, Eyebrow, Screen, Touchable } from '@/components/ui';
import { WeightRing } from '@/components/WeightRing';
import { font, useTheme } from '@/theme/tokens';
import {
  bagTarget,
  categoryBreakdown,
  gearMap,
  itemCount,
  packedCount,
  todayStamp,
  Trip,
  TripLifecycle,
  tripLifecycle,
  tripWeight,
  useGearStore,
} from '@/store/useGearStore';

const fmtRange = (a: string, b: string) => {
  const d = (s: string) => {
    const parts = s.split('-');
    return `${parts[1]}/${parts[2]}`;
  };
  return `${d(a)} – ${d(b)}`;
};

const LIFECYCLE_META: Record<TripLifecycle, { label: string; tone: 'alert' | 'solid' | 'sage' | 'neutral' }> = {
  needs_return: { label: 'Needs return', tone: 'alert' },
  active: { label: 'Active', tone: 'solid' },
  upcoming: { label: 'Upcoming', tone: 'sage' },
  closed: { label: 'Closed', tone: 'neutral' },
};

function LifecycleChip({ trip, today }: { trip: Trip; today: string }) {
  const meta = LIFECYCLE_META[tripLifecycle(trip, today)];
  return <Chip label={meta.label} tone={meta.tone} />;
}

export default function TripsScreen() {
  const t = useTheme();
  const router = useRouter();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const byId = useMemo(() => gearMap(gear), [gear]);
  const [tripModal, setTripModal] = useState(false);

  const today = todayStamp();
  // Surface a trip that needs return first — that's the one that actually needs attention.
  const sorted = useMemo(() => {
    const priority: Record<TripLifecycle, number> = { needs_return: 0, active: 1, upcoming: 2, closed: 3 };
    return [...trips].sort((a, b) => priority[tripLifecycle(a, today)] - priority[tripLifecycle(b, today)]);
  }, [trips, today]);
  const featured = sorted[0];
  const rest = sorted.slice(1);
  const featuredLifecycle = featured ? tripLifecycle(featured, today) : 'upcoming';
  const barColors = [t.primary, t.primaryDark, t.sageMuted];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 14 }}>
        <Mark size={30} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 26 }}>Trips</Display>
        <View style={{ flex: 1 }} />
        <Chip
          label="Saved offline"
          tone="sage"
          icon={<Ionicons name="cloud-offline-outline" size={13} color={t.softText} />}
        />
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: t.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{ fontFamily: font.bold, color: t.onPrimary, fontSize: 13 }}>AN</Text>
        </View>
      </View>

      {featured ? (
        <Animated.View entering={FadeInDown.duration(340)}>
          <Touchable onPress={() => router.push(`/trip/${featured.id}`)}>
            <FeaturedCard
              weight={tripWeight(featured, byId)}
              target={bagTarget(featured)}
              bags={featured.bags.length}
              items={itemCount(featured)}
              packed={packedCount(featured)}
              name={featured.name}
              range={fmtRange(featured.startDate, featured.endDate)}
              breakdown={categoryBreakdown(featured, byId).slice(0, 3)}
              barColors={barColors}
              lifecycle={featuredLifecycle}
            />
          </Touchable>
        </Animated.View>
      ) : null}

      <View style={{ height: 14 }} />

      {rest.map((trip, i) => (
        <Animated.View key={trip.id} entering={FadeInDown.duration(340).delay(80 + i * 55)} style={{ marginBottom: 10 }}>
          <Touchable onPress={() => router.push(`/trip/${trip.id}`)}>
          <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: t.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="trail-sign-outline" size={20} color={t.softText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{trip.name}</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                {trip.location} · {fmtRange(trip.startDate, trip.endDate)}
              </Text>
              <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                <LifecycleChip trip={trip} today={today} />
              </View>
            </View>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>
              {tripWeight(trip, byId).toFixed(1)} lb
            </Text>
          </Card>
          </Touchable>
        </Animated.View>
      ))}

      <Touchable onPress={() => setTripModal(true)}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.border,
            borderStyle: 'dashed',
            paddingVertical: 16,
            marginTop: 4,
          }}>
          <Ionicons name="add" size={20} color={t.primary} />
          <Text style={{ fontFamily: font.bold, color: t.primary, fontSize: 15 }}>New trip</Text>
        </View>
      </Touchable>

      <TripFormModal
        visible={tripModal}
        onClose={() => setTripModal(false)}
        onCreated={(id) => router.push(`/trip/${id}`)}
      />
    </Screen>
  );
}

const FEATURED_EYEBROW: Record<TripLifecycle, string> = {
  needs_return: 'NEEDS RETURN',
  active: 'ACTIVE NOW',
  upcoming: 'NEXT UP',
  closed: 'CLOSED',
};

function FeaturedCard(props: {
  weight: number;
  target: number;
  bags: number;
  items: number;
  packed: number;
  name: string;
  range: string;
  breakdown: { category: string; weight: number }[];
  barColors: string[];
  lifecycle: TripLifecycle;
}) {
  const t = useTheme();
  const maxCat = Math.max(...props.breakdown.map((b) => b.weight), 1);
  const eyebrowColor = props.lifecycle === 'needs_return' ? t.alert : t.primary;
  return (
    <Card>
      <Eyebrow color={eyebrowColor}>{`${FEATURED_EYEBROW[props.lifecycle]} · ${props.range}`}</Eyebrow>
      <Display style={{ marginTop: 4, marginBottom: 14 }}>{props.name}</Display>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <WeightRing value={props.weight} target={props.target} />
        <View style={{ flex: 1, gap: 10 }}>
          {props.breakdown.map((b, i) => (
            <View key={b.category}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.softText }}>{b.category}</Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                  {b.weight.toFixed(1)}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: t.track, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 999,
                    width: `${Math.round((b.weight / maxCat) * 100)}%`,
                    backgroundColor: props.barColors[i % props.barColors.length],
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 7, marginTop: 16, flexWrap: 'wrap' }}>
        <Chip label={`${props.bags} bags`} tone="sage" icon={<Ionicons name="briefcase-outline" size={13} color={t.softText} />} />
        <Chip label={`${props.items} items`} tone="sage" />
        {props.lifecycle === 'needs_return' ? (
          <Chip
            label={`${props.packed} to check in`}
            tone="alert"
            icon={<Ionicons name="arrow-undo-outline" size={13} color={t.alertText} />}
          />
        ) : (
          <Chip label={`${props.packed} packed`} tone="solid" icon={<Ionicons name="checkmark" size={13} color={t.onPrimary} />} />
        )}
      </View>
    </Card>
  );
}
