import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BagFormSheet } from '@/components/BagFormSheet';
import { Sheet } from '@/components/form';
import { Card, Chip, Display, Screen } from '@/components/ui';
import { WeightRing } from '@/components/WeightRing';
import { tapLight, tapSuccess } from '@/lib/haptics';
import { font, useTheme } from '@/theme/tokens';
import {
  bagTarget,
  GearStatus,
  gearMap,
  itemCount,
  STATUS_LABELS,
  STATUS_ORDER,
  tripWeight,
  useGearStore,
} from '@/store/useGearStore';

type ChipTone = 'sage' | 'solid' | 'alert' | 'neutral';
const statusTone = (s: GearStatus): ChipTone =>
  s === 'checked_out'
    ? 'solid'
    : s === 'reserved'
      ? 'sage'
      : s === 'returned'
        ? 'neutral'
        : 'alert';

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();

  const trips = useGearStore((s) => s.trips);
  const gear = useGearStore((s) => s.gear);
  const addAssignment = useGearStore((s) => s.addAssignment);
  const updateAssignment = useGearStore((s) => s.updateAssignment);
  const removeAssignment = useGearStore((s) => s.removeAssignment);
  const moveAssignment = useGearStore((s) => s.moveAssignment);
  const removeTrip = useGearStore((s) => s.removeTrip);

  const byId = useMemo(() => gearMap(gear), [gear]);
  const trip = trips.find((tr) => tr.id === id);

  const [assignBagId, setAssignBagId] = useState<string | null>(null);
  const [statusFor, setStatusFor] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [bagEdit, setBagEdit] = useState<{ open: boolean; bagId: string | null }>({
    open: false,
    bagId: null,
  });

  if (!trip) {
    return (
      <Screen>
        <View style={{ paddingTop: 20 }}>
          <Display>Trip not found</Display>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: font.bold, color: t.primary }}>Back</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const total = tripWeight(trip, byId);
  const target = bagTarget(trip);
  const statusForAssignment = trip.assignments.find((a) => a.id === statusFor);
  const bagWeight = (bagId: string) =>
    trip.assignments
      .filter((a) => a.bagId === bagId)
      .reduce((sum, a) => sum + (byId[a.gearId]?.weightLb ?? 0) * a.quantity, 0);

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 6 }}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Display style={{ fontSize: 22 }}>{trip.name}</Display>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
            {trip.location || 'No location'}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            removeTrip(trip.id);
            router.back();
          }}
          hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={t.textMuted} />
        </Pressable>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <WeightRing value={total} target={target} />
          <View style={{ flex: 1, gap: 12 }}>
            <Stat label="Pack weight" value={`${total.toFixed(1)} lb`} color={t.text} />
            <Stat label="Total capacity" value={`${target} lb`} color={t.primary} />
            <Stat label={`${trip.bags.length} bags · items`} value={`${itemCount(trip)}`} color={t.text} />
          </View>
        </View>
      </Card>

      {trip.bags.length > 1 && total > 0 ? (
        <View style={{ marginTop: 16 }}>
          <SectionLabel>Load by bag</SectionLabel>
          <View style={{ height: 14, borderRadius: 999, overflow: 'hidden', flexDirection: 'row', backgroundColor: t.track }}>
            {trip.bags.map((bag) => {
              const w = bagWeight(bag.id);
              return w > 0 ? (
                <View key={bag.id} style={{ width: `${(w / total) * 100}%`, backgroundColor: bag.color }} />
              ) : null;
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
            {trip.bags.map((bag) => (
              <View key={bag.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: bag.color }} />
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                  {bag.label} · {bagWeight(bag.id).toFixed(1)} lb
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={{ height: 16 }} />

      {trip.bags.map((bag) => {
        const items = trip.assignments.filter((a) => a.bagId === bag.id);
        const bagW = bagWeight(bag.id);
        const over = bagW > bag.maxWeightLb;
        return (
          <View key={bag.id} style={{ marginBottom: 18 }}>
            <Pressable
              onPress={() => setBagEdit({ open: true, bagId: bag.id })}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: bag.color, marginRight: 8 }} />
              <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, flex: 1 }}>{bag.label}</Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: over ? t.alert : t.textMuted, marginRight: 6 }}>
                {bagW.toFixed(1)} / {bag.maxWeightLb} lb
              </Text>
              <Ionicons name="ellipsis-horizontal" size={18} color={t.textMuted} />
            </Pressable>

            <View style={{ height: 6, borderRadius: 999, backgroundColor: t.track, overflow: 'hidden', marginBottom: 12 }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  width: `${Math.min(100, bag.maxWeightLb > 0 ? (bagW / bag.maxWeightLb) * 100 : 0)}%`,
                  backgroundColor: over ? t.alert : bag.color,
                }}
              />
            </View>

            {items.length === 0 ? (
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 8, paddingLeft: 2 }}>
                Nothing packed in this bag yet.
              </Text>
            ) : (
              items.map((a) => {
                const item = byId[a.gearId];
                return (
                  <Card key={a.id} style={{ padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
                        {item ? `${item.brand} ${item.name}` : 'Unknown'}
                      </Text>
                      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                        {item?.category} · {((item?.weightLb ?? 0) * a.quantity).toFixed(2)} lb
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        <Pressable onPress={() => setStatusFor(a.id)}>
                          <Chip label={STATUS_LABELS[a.status]} tone={statusTone(a.status)} />
                        </Pressable>
                        {trip.bags.length > 1 ? (
                          <Pressable
                            onPress={() => {
                              tapLight();
                              setMoveFor(a.id);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderWidth: 1,
                              borderColor: t.border,
                            }}>
                            <Ionicons name="swap-horizontal" size={13} color={t.textMuted} />
                            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>Move</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                    <Stepper
                      qty={a.quantity}
                      onDec={() =>
                        a.quantity <= 1
                          ? removeAssignment(trip.id, a.id)
                          : updateAssignment(trip.id, a.id, { quantity: a.quantity - 1 })
                      }
                      onInc={() => updateAssignment(trip.id, a.id, { quantity: a.quantity + 1 })}
                    />
                  </Card>
                );
              })
            )}

            <Pressable onPress={() => setAssignBagId(bag.id)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderStyle: 'dashed',
                  paddingVertical: 12,
                }}>
                <Ionicons name="add" size={18} color={t.primary} />
                <Text style={{ fontFamily: font.bold, color: t.primary, fontSize: 14 }}>Add gear to {bag.label}</Text>
              </View>
            </Pressable>
          </View>
        );
      })}

      <Pressable onPress={() => setBagEdit({ open: true, bagId: null })}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: 14,
            backgroundColor: t.soft,
            paddingVertical: 14,
          }}>
          <Ionicons name="add" size={18} color={t.softText} />
          <Text style={{ fontFamily: font.bold, color: t.softText, fontSize: 14 }}>Add another bag</Text>
        </View>
      </Pressable>

      <Sheet visible={!!assignBagId} onClose={() => setAssignBagId(null)} title="Add gear">
        {gear.map((item) => {
          const inBag =
            trip.assignments.find((a) => a.gearId === item.id && a.bagId === assignBagId)?.quantity ?? 0;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (assignBagId) {
                  addAssignment(trip.id, assignBagId, item.id, 1);
                  tapLight();
                }
              }}
              style={{ marginBottom: 8 }}>
              <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
                    {item.brand} {item.name}
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                    {item.category} · {item.weightLb.toFixed(2)} lb
                  </Text>
                </View>
                {inBag > 0 ? <Chip label={`In bag · ${inBag}`} tone="sage" /> : null}
                <Ionicons name="add-circle" size={26} color={t.primary} />
              </Card>
            </Pressable>
          );
        })}
      </Sheet>

      <Sheet visible={!!statusFor} onClose={() => setStatusFor(null)} title="Set status">
        {STATUS_ORDER.map((s) => {
          const active = statusForAssignment?.status === s;
          return (
            <Pressable
              key={s}
              onPress={() => {
                if (statusFor) updateAssignment(trip.id, statusFor, { status: s });
                tapSuccess();
                setStatusFor(null);
              }}
              style={{ marginBottom: 8 }}>
              <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Chip label={STATUS_LABELS[s]} tone={statusTone(s)} />
                <View style={{ flex: 1 }} />
                {active ? <Ionicons name="checkmark-circle" size={22} color={t.primary} /> : null}
              </Card>
            </Pressable>
          );
        })}
      </Sheet>

      <Sheet visible={!!moveFor} onClose={() => setMoveFor(null)} title="Move to bag">
        {(() => {
          const moving = trip.assignments.find((a) => a.id === moveFor);
          if (!moving) return null;
          const item = byId[moving.gearId];
          return (
            <>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 14 }}>
                {item ? `${item.brand} ${item.name}` : 'This item'} · currently in{' '}
                {trip.bags.find((b) => b.id === moving.bagId)?.label ?? 'Unknown'}
              </Text>
              {trip.bags
                .filter((b) => b.id !== moving.bagId)
                .map((bag) => {
                  const destW = bagWeight(bag.id);
                  return (
                    <Pressable
                      key={bag.id}
                      onPress={() => {
                        moveAssignment(trip.id, moving.id, bag.id);
                        tapSuccess();
                        setMoveFor(null);
                      }}
                      style={{ marginBottom: 8 }}>
                      <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: bag.color }} />
                        <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text, flex: 1 }}>{bag.label}</Text>
                        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                          {destW.toFixed(1)} / {bag.maxWeightLb} lb
                        </Text>
                        <Ionicons name="arrow-forward-circle" size={22} color={t.primary} />
                      </Card>
                    </Pressable>
                  );
                })}
            </>
          );
        })()}
      </Sheet>

      <BagFormSheet
        visible={bagEdit.open}
        tripId={trip.id}
        editBagId={bagEdit.bagId}
        onClose={() => setBagEdit({ open: false, bagId: null })}
      />
    </Screen>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: 12,
        color: t.softText,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}>
      {children}
    </Text>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const t = useTheme();
  return (
    <View>
      <Text style={{ fontFamily: font.semibold, fontSize: 11, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: font.extrabold, fontSize: 20, color, marginTop: 1 }}>{value}</Text>
    </View>
  );
}

function Stepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  const t = useTheme();
  const btn = { width: 30, height: 30, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable onPress={() => { tapLight(); onDec(); }} style={btn}>
        <Ionicons name={qty <= 1 ? 'trash-outline' : 'remove'} size={16} color={t.text} />
      </Pressable>
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text, minWidth: 16, textAlign: 'center' }}>{qty}</Text>
      <Pressable onPress={() => { tapLight(); onInc(); }} style={btn}>
        <Ionicons name="add" size={16} color={t.text} />
      </Pressable>
    </View>
  );
}
