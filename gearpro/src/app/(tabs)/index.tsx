import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Mark } from '@/components/Mark';
import { TripFormModal } from '@/components/TripFormModal';
import { Card, Chip, Display, Eyebrow, Screen } from '@/components/ui';
import { WeightRing } from '@/components/WeightRing';
import { font, useTheme } from '@/theme/tokens';
import {
  bagTarget,
  categoryBreakdown,
  gearMap,
  itemCount,
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

export default function TripsScreen() {
  const t = useTheme();
  const router = useRouter();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const byId = useMemo(() => gearMap(gear), [gear]);
  const [tripModal, setTripModal] = useState(false);

  const featured = trips[0];
  const rest = trips.slice(1);
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
        <Pressable onPress={() => router.push(`/trip/${featured.id}`)}>
          <FeaturedCard
            weight={tripWeight(featured, byId)}
            target={bagTarget(featured)}
            bags={featured.bags.length}
            items={itemCount(featured)}
            name={featured.name}
            range={fmtRange(featured.startDate, featured.endDate)}
            breakdown={categoryBreakdown(featured, byId).slice(0, 3)}
            barColors={barColors}
          />
        </Pressable>
      ) : null}

      <View style={{ height: 14 }} />

      {rest.map((trip) => (
        <Pressable key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)} style={{ marginBottom: 10 }}>
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
            </View>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>
              {tripWeight(trip, byId).toFixed(1)} lb
            </Text>
          </Card>
        </Pressable>
      ))}

      <Pressable onPress={() => setTripModal(true)}>
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
      </Pressable>

      <TripFormModal
        visible={tripModal}
        onClose={() => setTripModal(false)}
        onCreated={(id) => router.push(`/trip/${id}`)}
      />
    </Screen>
  );
}

function FeaturedCard(props: {
  weight: number;
  target: number;
  bags: number;
  items: number;
  name: string;
  range: string;
  breakdown: { category: string; weight: number }[];
  barColors: string[];
}) {
  const t = useTheme();
  const maxCat = Math.max(...props.breakdown.map((b) => b.weight), 1);
  return (
    <Card>
      <Eyebrow color={t.alert}>{`NEXT UP · ${props.range}`}</Eyebrow>
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
        <Chip label="Essentials ready" tone="solid" icon={<Ionicons name="checkmark" size={13} color={t.onPrimary} />} />
      </View>
    </Card>
  );
}
