import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip, Display, Screen, Touchable } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';
import {
  allPackedAssignments,
  gearMap,
  isExpiredDate,
  todayStamp,
  useGearStore,
} from '@/store/useGearStore';

export default function PackScreen() {
  const t = useTheme();
  const router = useRouter();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const byId = useMemo(() => gearMap(gear), [gear]);
  const today = todayStamp();

  const grouped = useMemo(() => {
    const packed = allPackedAssignments(trips);
    const byTrip = new Map<string, typeof packed>();
    for (const row of packed) {
      const list = byTrip.get(row.trip.id) ?? [];
      list.push(row);
      byTrip.set(row.trip.id, list);
    }
    return Array.from(byTrip.values());
  }, [trips]);

  const totalUnits = grouped.flat().reduce((sum, r) => sum + r.assignment.quantity, 0);
  const totalWeight = grouped
    .flat()
    .reduce((sum, r) => sum + (byId[r.assignment.gearId]?.weightLb ?? 0) * r.assignment.quantity, 0);

  return (
    <Screen>
      <View style={{ paddingTop: 8, paddingBottom: 12 }}>
        <Display style={{ fontSize: 26 }}>Packing</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          {totalUnits > 0
            ? `${totalUnits} items packed right now · ${totalWeight.toFixed(1)} lb`
            : 'Nothing packed right now'}
        </Text>
      </View>

      {grouped.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 12 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: t.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="list-outline" size={34} color={t.softText} />
          </View>
          <Display style={{ fontSize: 20, textAlign: 'center' }}>Nothing packed yet</Display>
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 14,
              color: t.textMuted,
              textAlign: 'center',
              lineHeight: 21,
            }}>
            Open a trip and check items out as you pack — they&apos;ll show up here across every trip.
          </Text>
        </View>
      ) : (
        grouped.map((rows) => {
          const trip = rows[0].trip;
          const tripWeightPacked = rows.reduce(
            (sum, r) => sum + (byId[r.assignment.gearId]?.weightLb ?? 0) * r.assignment.quantity,
            0,
          );
          return (
            <View key={trip.id} style={{ marginBottom: 16 }}>
              <Touchable onPress={() => router.push(`/trip/${trip.id}`)}>
                <Card style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, flex: 1 }}>{trip.name}</Text>
                    <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>
                      {tripWeightPacked.toFixed(1)} lb
                    </Text>
                  </View>
                </Card>
              </Touchable>
              {rows.map(({ assignment }) => {
                const item = byId[assignment.gearId];
                const bag = trip.bags.find((b) => b.id === assignment.bagId);
                const expired = isExpiredDate(item?.expiration, today);
                return (
                  <Card key={assignment.id} style={{ padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bag?.color ?? t.primary }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.text }}>
                        {item ? `${item.brand} ${item.name}` : 'Unknown'}
                        {assignment.quantity > 1 ? ` ×${assignment.quantity}` : ''}
                      </Text>
                      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                        {bag?.label ?? 'Unknown bag'}
                      </Text>
                    </View>
                    {expired ? <Chip label="Expired" tone="alert" /> : null}
                  </Card>
                );
              })}
            </View>
          );
        })
      )}
    </Screen>
  );
}
