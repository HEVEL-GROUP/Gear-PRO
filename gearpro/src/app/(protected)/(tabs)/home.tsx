import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { Mark } from '@/components/Mark';
import { FeaturedCard } from '@/components/TripCard';
import { TripFormModal } from '@/components/TripFormModal';
import { Card, Chip, Display, Screen, Touchable } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useProfile } from '@/lib/profile/useProfile';
import { font, useTheme } from '@/theme/tokens';
import {
  bagTarget,
  categoryBreakdown,
  gearMap,
  itemCount,
  packedCount,
  sortTripsFeaturedFirst,
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

const isTripShared = (trip: Trip) => !!trip.shared || !!trip.shareToken;

// Two-letter avatar from a name ("Austin Norville" -> "AN") or, failing that,
// the email local part ("anorville@..." -> "AN").
function initialsFrom(nameOrEmail: string): string {
  const base = nameOrEmail.replace(/@.*/, '').trim();
  if (!base) return '?';
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

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
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const sharedGearById = useGearStore((s) => s.sharedGearById);
  // Fold teammate gear in so a shared trip's weight/breakdown matches its detail
  // view (otherwise the card counts only your own gear against both bags' total
  // capacity, e.g. "0.9 of 85 lb").
  const byId = useMemo(
    () => gearMap([...gear, ...Object.values(sharedGearById)]),
    [gear, sharedGearById],
  );
  const [tripModal, setTripModal] = useState(false);
  const { session } = useAuth();
  const { displayName } = useProfile();
  const initials = initialsFrom(displayName?.trim() || session?.user.email || '?');

  const today = todayStamp();
  const sorted = useMemo(() => sortTripsFeaturedFirst(trips, today), [trips, today]);
  const featured = sorted[0];
  const rest = sorted.slice(1);
  const featuredLifecycle = featured ? tripLifecycle(featured, today) : 'upcoming';
  const barColors = [t.primary, t.primaryDark, t.sageMuted];

  return (
    <Screen maxWidth={isWide ? 860 : 720}>
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
          <Text style={{ fontFamily: font.bold, color: t.onPrimary, fontSize: 13 }}>{initials}</Text>
        </View>
      </View>

      {featured ? (
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
            shared={isTripShared(featured)}
          />
        </Touchable>
      ) : null}

      <View style={{ height: 14 }} />

      {rest.map((trip) => (
        <View key={trip.id} style={{ marginBottom: 10 }}>
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
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                <LifecycleChip trip={trip} today={today} />
                {isTripShared(trip) ? (
                  <Chip label="Shared" tone="sage" icon={<Ionicons name="people" size={12} color={t.softText} />} />
                ) : null}
              </View>
            </View>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>
              {tripWeight(trip, byId).toFixed(1)} lb
            </Text>
          </Card>
          </Touchable>
        </View>
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
