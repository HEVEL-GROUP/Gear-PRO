import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { BagFormSheet } from '@/components/BagFormSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { ShareTripSheet } from '@/components/ShareTripSheet';
import { TripFormModal } from '@/components/TripFormModal';
import { Button, Field, Sheet } from '@/components/form';
import { Card, Chip, Display, Screen } from '@/components/ui';
import { WeatherCard } from '@/components/WeatherCard';
import { WeightRing } from '@/components/WeightRing';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tapLight, tapSuccess } from '@/lib/haptics';
import { useProfile } from '@/lib/profile/useProfile';
import { tripMemberNames } from '@/lib/sharing/sharing';
import { font, useTheme } from '@/theme/tokens';
import {
  Assignment,
  bagTarget,
  GearStatus,
  gearMap,
  groupByCategory,
  isExpiredDate,
  itemCount,
  packedCount,
  remainingToAssign,
  RETURN_OUTCOME_STATUSES,
  STATUS_LABELS,
  STATUS_ORDER,
  STATUSES_WITH_REASON,
  todayStamp,
  TripLifecycle,
  tripLifecycle,
  tripWeight,
  unavailableElsewhere,
  useGearStore,
} from '@/store/useGearStore';

type ChipTone = 'sage' | 'solid' | 'alert' | 'neutral';
const statusTone = (s: GearStatus): ChipTone =>
  s === 'checked_out'
    ? 'solid'
    : s === 'reserved'
      ? 'sage'
      : s === 'returned' || s === 'consumed'
        ? 'neutral'
        : 'alert';

const LIFECYCLE_META: Record<TripLifecycle, { label: string; tone: ChipTone }> = {
  needs_return: { label: 'Needs return', tone: 'alert' },
  active: { label: 'Active', tone: 'solid' },
  upcoming: { label: 'Upcoming', tone: 'sage' },
  closed: { label: 'Closed', tone: 'neutral' },
};

type Mode = 'plan' | 'pack' | 'return';

const MODE_META: Record<Mode, { label: string; icon: keyof typeof Ionicons.glyphMap; subtitle: string }> = {
  plan: { label: 'Plan', icon: 'create-outline', subtitle: 'Decide what goes in each bag.' },
  pack: { label: 'Pack', icon: 'bag-handle-outline', subtitle: "Tap an item once it's in the bag." },
  return: { label: 'Return', icon: 'arrow-undo-outline', subtitle: "Tap an item once it's checked back in." },
};

// Opens on the phase the trip is actually in, so you land on the right screen
// instead of always starting over at Plan.
function defaultModeForLifecycle(lifecycle: TripLifecycle): Mode {
  if (lifecycle === 'needs_return') return 'return';
  if (lifecycle === 'active') return 'pack';
  return 'plan';
}

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;

  const trips = useGearStore((s) => s.trips);
  const gear = useGearStore((s) => s.gear);
  const sharedGearById = useGearStore((s) => s.sharedGearById);
  const addAssignment = useGearStore((s) => s.addAssignment);
  const updateAssignment = useGearStore((s) => s.updateAssignment);
  const removeAssignment = useGearStore((s) => s.removeAssignment);
  const moveAssignment = useGearStore((s) => s.moveAssignment);
  const returnTrip = useGearStore((s) => s.returnTrip);
  const removeTrip = useGearStore((s) => s.removeTrip);

  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const { displayName } = useProfile();

  // Teammate gear on a shared trip lives in sharedGearById (out of the user's
  // own library), so fold it in here -- otherwise a teammate's assignments
  // would render as "Unknown".
  const byId = useMemo(
    () => gearMap([...gear, ...Object.values(sharedGearById)]),
    [gear, sharedGearById],
  );
  const trip = trips.find((tr) => tr.id === id);

  const [assignBagId, setAssignBagId] = useState<string | null>(null);
  const [statusFor, setStatusFor] = useState<string | null>(null);
  // Plan's status chip offers every status; Return's tap-to-check-in offers
  // only the outcomes that make sense when gear comes back.
  const [statusKind, setStatusKind] = useState<'plan' | 'return'>('plan');
  // Set while needs_repair/lost is picked but not yet confirmed -- swaps the
  // sheet to a one-field reason step instead of applying immediately.
  const [pendingReasonStatus, setPendingReasonStatus] = useState<GearStatus | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [confirmDeleteTrip, setConfirmDeleteTrip] = useState(false);
  const [editTripOpen, setEditTripOpen] = useState(false);
  const [bagEdit, setBagEdit] = useState<{ open: boolean; bagId: string | null }>({
    open: false,
    bagId: null,
  });
  // Null until the user picks a mode for this visit -- re-asked every time
  // you open a trip, since the right answer depends on where you are in the
  // trip (deciding what goes, actively packing, or checking gear back in).
  const [mode, setMode] = useState<Mode | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  // userId -> display name, for labelling each bag with whose it is on a shared
  // trip. Fetched only when the trip is actually shared.
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const isSharedTrip = !!trip?.shared || !!trip?.shareToken;
  const tripId = trip?.id;
  useEffect(() => {
    if (!tripId || !isSharedTrip) {
      setMemberNames({});
      return;
    }
    let cancelled = false;
    tripMemberNames(tripId)
      .then((members) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const m of members) map[m.memberId] = m.displayName?.trim() || 'Teammate';
        setMemberNames(map);
      })
      .catch(() => {
        /* roster is non-critical for rendering */
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, isSharedTrip]);

  if (!trip) {
    return (
      <Screen maxWidth={isWide ? 860 : 720}>
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
  const today = todayStamp();
  const lifecycle = tripLifecycle(trip, today);
  // Scope the packed count (and the Return-trip action below) to the user's own
  // gear -- on a shared trip a teammate's packed items are read-only and must
  // not be counted or bulk-returned. On a solo trip every assignment is the
  // user's own, so this equals the full count.
  const packed = packedCount(trip, userId ?? undefined);
  const iOwnTrip = !trip.ownerId || trip.ownerId === userId;
  // A member may edit only their OWN bags on a shared trip -- RLS blocks
  // inserting an assignment onto a bag someone else owns. On any trip, your own
  // bags are editable and a teammate's are read-only.
  const canEditBag = (bag: (typeof trip.bags)[number]) => !bag.ownerId || bag.ownerId === userId;
  const meLabel = displayName?.trim() || 'You';
  const bagOwnerLabel = (bag: (typeof trip.bags)[number]) =>
    !bag.ownerId || bag.ownerId === userId ? meLabel : memberNames[bag.ownerId] ?? 'Teammate';
  const statusForAssignment = trip.assignments.find((a) => a.id === statusFor);
  const closeStatusSheet = () => {
    setStatusFor(null);
    setPendingReasonStatus(null);
    setReasonText('');
  };
  const applyStatus = (status: GearStatus, reason?: string) => {
    if (statusFor) updateAssignment(trip.id, statusFor, { status, statusReason: reason || undefined });
    tapSuccess();
    closeStatusSheet();
  };
  const bagWeight = (bagId: string) =>
    trip.assignments
      .filter((a) => a.bagId === bagId)
      .reduce((sum, a) => sum + (byId[a.gearId]?.weightLb ?? 0) * a.quantity, 0);

  // Max this specific assignment can grow to, given what's packed elsewhere and owned in total.
  const maxQuantityFor = (assignment: (typeof trip.assignments)[number]) => {
    const item = byId[assignment.gearId];
    if (!item) return assignment.quantity;
    const elsewhere = unavailableElsewhere(trips, assignment.gearId, trip.id);
    const otherInThisTrip = trip.assignments
      .filter((x) => x.gearId === assignment.gearId && x.id !== assignment.id)
      .reduce((sum, x) => sum + x.quantity, 0);
    return Math.max(item.quantity - elsewhere - otherInThisTrip, 0);
  };

  // Plan mode: a flat, editable list -- every assignment regardless of status,
  // with quantity/move/remove controls. Not a checklist, so no tap-to-advance.
  const renderPlanRow = (a: (typeof trip.assignments)[number]) => {
    const item = byId[a.gearId];
    const expired = isExpiredDate(item?.expiration, today);
    return (
      <Card key={a.id} style={{ padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
            {item ? `${item.brand} ${item.name}` : 'Unknown'}
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            {((item?.weightLb ?? 0) * a.quantity).toFixed(2)} lb
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => {
                setStatusKind('plan');
                setStatusFor(a.id);
              }}>
              <Chip label={STATUS_LABELS[a.status]} tone={statusTone(a.status)} />
            </Pressable>
            {expired ? <Chip label="Expired" tone="alert" /> : null}
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
          atMax={a.quantity >= maxQuantityFor(a)}
          onDec={() =>
            a.quantity <= 1
              ? removeAssignment(trip.id, a.id)
              : updateAssignment(trip.id, a.id, { quantity: a.quantity - 1 })
          }
          onInc={() => {
            if (a.quantity < maxQuantityFor(a)) {
              updateAssignment(trip.id, a.id, { quantity: a.quantity + 1 });
            }
          }}
        />
      </Card>
    );
  };

  // Pack mode: a shrinking checklist -- tap an item to mark it packed
  // (reserved -> checked_out) and it drops off the list. Return mode taps
  // open the status picker instead of a single clean return, since coming
  // back isn't always a clean return -- it might need repair, be used up, or
  // be lost.
  const renderChecklistRow = (a: (typeof trip.assignments)[number], kind: 'pack' | 'return') => {
    const item = byId[a.gearId];
    return (
      <Pressable
        key={a.id}
        onPress={() => {
          if (kind === 'pack') {
            updateAssignment(trip.id, a.id, { status: 'checked_out' });
            tapSuccess();
          } else {
            setStatusKind('return');
            setStatusFor(a.id);
          }
        }}>
        <Card style={{ padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="ellipse-outline" size={24} color={t.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
              {item ? `${item.brand} ${item.name}` : 'Unknown'}
            </Text>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
              {((item?.weightLb ?? 0) * a.quantity).toFixed(2)} lb
              {a.quantity > 1 ? ` · ×${a.quantity}` : ''}
            </Text>
          </View>
          {kind === 'return' ? <Ionicons name="chevron-forward" size={18} color={t.textMuted} /> : null}
        </Card>
      </Pressable>
    );
  };

  // A teammate's bag on a shared trip: show what they're bringing, but with no
  // controls -- RLS won't let you touch their gear, so nothing here is tappable.
  const renderReadonlyRow = (a: (typeof trip.assignments)[number]) => {
    const item = byId[a.gearId];
    return (
      <Card key={a.id} style={{ padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
            {item ? `${item.brand} ${item.name}` : 'Unknown'}
          </Text>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            {((item?.weightLb ?? 0) * a.quantity).toFixed(2)} lb{a.quantity > 1 ? ` · ×${a.quantity}` : ''}
          </Text>
        </View>
        <Chip label={STATUS_LABELS[a.status]} tone={statusTone(a.status)} />
      </Card>
    );
  };

  // Groups any assignment list (plan/pack/return) by the gear's category, in
  // packing-list order, so a bag reads as sections instead of one long list.
  const renderCategoryGroups = (
    list: Assignment[],
    renderRow: (a: Assignment) => React.ReactNode,
  ) => {
    const groups = groupByCategory(list, (a) => byId[a.gearId]?.category ?? 'Other');
    return groups.map(({ category, items: groupItems }) => (
      <View key={category} style={{ marginBottom: 10 }}>
        <RowGroupLabel>{category} · {groupItems.length}</RowGroupLabel>
        {groupItems.map(renderRow)}
      </View>
    ));
  };

  return (
    <Screen maxWidth={isWide ? 860 : 720}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: 6 }}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Display style={{ fontSize: 22 }}>{trip.name}</Display>
            {isSharedTrip ? (
              <Chip
                label="Shared"
                tone="sage"
                icon={<Ionicons name="people" size={12} color={t.softText} />}
              />
            ) : null}
          </View>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
            {trip.shared ? `Shared by ${trip.ownerId ? memberNames[trip.ownerId] ?? 'a friend' : 'a friend'} · ` : ''}
            {trip.location || 'No location'}
          </Text>
        </View>
        <Chip label={LIFECYCLE_META[lifecycle].label} tone={LIFECYCLE_META[lifecycle].tone} />
        <Pressable onPress={() => setShareOpen(true)} hitSlop={12} style={{ marginLeft: 10 }}>
          <Ionicons name="people-outline" size={22} color={isSharedTrip ? t.primary : t.textMuted} />
        </Pressable>
        {iOwnTrip ? (
          <>
            <Pressable onPress={() => setEditTripOpen(true)} hitSlop={12} style={{ marginLeft: 10 }}>
              <Ionicons name="create-outline" size={20} color={t.textMuted} />
            </Pressable>
            <Pressable onPress={() => setConfirmDeleteTrip(true)} hitSlop={12} style={{ marginLeft: 10 }}>
              <Ionicons name="trash-outline" size={20} color={t.textMuted} />
            </Pressable>
          </>
        ) : null}
      </View>

      {mode === null ? (
        <ModeChooser suggested={defaultModeForLifecycle(lifecycle)} onChoose={setMode} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name={MODE_META[mode].icon} size={15} color={t.primary} />
            <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.text, marginLeft: 6 }}>
              {MODE_META[mode].label} mode
            </Text>
            <Text
              style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginLeft: 6, flex: 1 }}
              numberOfLines={1}>
              · {MODE_META[mode].subtitle}
            </Text>
            <Pressable onPress={() => setMode(null)} hitSlop={8}>
              <Text style={{ fontFamily: font.bold, fontSize: 12, color: t.primary }}>Change</Text>
            </Pressable>
          </View>

          {iOwnTrip && !isSharedTrip ? (
            <Pressable onPress={() => setShareOpen(true)} style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: t.soft,
                  borderRadius: 14,
                  padding: 14,
                }}>
                <Ionicons name="person-add-outline" size={22} color={t.softText} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.softText }}>
                    Pack this trip with friends
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                    Share a link — everyone packs their own gear and sees what the others bring.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.softText} />
              </View>
            </Pressable>
          ) : null}

          {trip.locationLat != null && trip.locationLon != null ? (
            <WeatherCard
              lat={trip.locationLat}
              lon={trip.locationLon}
              startDate={trip.startDate}
              endDate={trip.endDate}
            />
          ) : null}

          {mode === 'return' && packed > 0 ? (
            <Pressable
              onPress={() => {
                returnTrip(trip.id, userId ?? undefined);
                tapSuccess();
              }}
              style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: lifecycle === 'needs_return' ? t.alertSoft : t.soft,
                  borderRadius: 14,
                  padding: 14,
                }}>
                <Ionicons
                  name="arrow-undo-circle-outline"
                  size={22}
                  color={lifecycle === 'needs_return' ? t.alertText : t.softText}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: font.bold,
                      fontSize: 14,
                      color: lifecycle === 'needs_return' ? t.alertText : t.softText,
                    }}>
                    {lifecycle === 'needs_return' ? "Trip's over — check gear back in" : 'Return trip'}
                  </Text>
                  <Text
                    style={{
                      fontFamily: font.medium,
                      fontSize: 12,
                      color: lifecycle === 'needs_return' ? t.alertText : t.textMuted,
                      marginTop: 1,
                    }}>
                    Marks {packed} packed item{packed === 1 ? '' : 's'} as returned
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={lifecycle === 'needs_return' ? t.alertText : t.softText}
                />
              </View>
            </Pressable>
          ) : null}

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
              <View
                style={{
                  height: 14,
                  borderRadius: 999,
                  overflow: 'hidden',
                  flexDirection: 'row',
                  backgroundColor: t.track,
                }}>
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
            const toPack = items.filter((a) => a.status === 'reserved');
            const packedItems = items.filter((a) => a.status === 'checked_out');
            const bagW = bagWeight(bag.id);
            const over = bagW > bag.maxWeightLb;
            const editable = canEditBag(bag);
            return (
              <View key={bag.id} style={{ marginBottom: 18 }}>
                <Pressable
                  onPress={() => editable && setBagEdit({ open: true, bagId: bag.id })}
                  disabled={!editable}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: bag.color, marginRight: 8 }} />
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text }} numberOfLines={1}>
                    {bag.label}
                  </Text>
                  {isSharedTrip ? (
                    <View style={{ marginLeft: 8 }}>
                      <Chip label={bagOwnerLabel(bag)} tone={editable ? 'solid' : 'neutral'} />
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }} />
                  <Text
                    style={{
                      fontFamily: font.semibold,
                      fontSize: 13,
                      color: over ? t.alert : t.textMuted,
                      marginRight: 6,
                    }}>
                    {bagW.toFixed(1)} / {bag.maxWeightLb} lb
                  </Text>
                  {editable ? <Ionicons name="ellipsis-horizontal" size={18} color={t.textMuted} /> : null}
                </Pressable>

                <View
                  style={{
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: t.track,
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}>
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
                  <Text
                    style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 8, paddingLeft: 2 }}>
                    {editable ? 'Nothing planned for this bag yet.' : 'Nothing in this bag yet.'}
                  </Text>
                ) : !editable ? (
                  renderCategoryGroups(items, renderReadonlyRow)
                ) : mode === 'plan' ? (
                  renderCategoryGroups(items, renderPlanRow)
                ) : mode === 'pack' ? (
                  toPack.length > 0 ? (
                    renderCategoryGroups(toPack, (a) => renderChecklistRow(a, 'pack'))
                  ) : (
                    <SuccessRow label="Everything in this bag is packed." />
                  )
                ) : packedItems.length > 0 ? (
                  renderCategoryGroups(packedItems, (a) => renderChecklistRow(a, 'return'))
                ) : (
                  <SuccessRow label="Nothing from this bag needs to come back." />
                )}

                {editable && mode === 'plan' ? (
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
                      <Text style={{ fontFamily: font.bold, color: t.primary, fontSize: 14 }}>
                        Add gear to {bag.label}
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {mode === 'plan' ? (
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
          ) : null}
        </>
      )}

      <Sheet visible={!!assignBagId} onClose={() => setAssignBagId(null)} title="Add gear">
        {groupByCategory(gear, (item) => item.category).map(({ category, items: catItems }) => (
          <View key={category} style={{ marginBottom: 10 }}>
            <RowGroupLabel>{category}</RowGroupLabel>
            {catItems.map((item) => {
              const inBag =
                trip.assignments.find((a) => a.gearId === item.id && a.bagId === assignBagId)?.quantity ?? 0;
              const remaining = remainingToAssign(item, trips, trip);
              const expired = isExpiredDate(item.expiration, today);
              const disabled = remaining <= 0;
              return (
                <Pressable
                  key={item.id}
                  disabled={disabled}
                  onPress={() => {
                    if (assignBagId && !disabled) {
                      addAssignment(trip.id, assignBagId, item.id, 1);
                      tapLight();
                    }
                  }}
                  style={{ marginBottom: 8, opacity: disabled ? 0.5 : 1 }}>
                  <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
                        {item.brand} {item.name}
                      </Text>
                      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                        {item.weightLb.toFixed(2)} lb · {remaining} left to pack
                      </Text>
                    </View>
                    {expired ? <Chip label="Expired" tone="alert" /> : null}
                    {inBag > 0 ? <Chip label={`In bag · ${inBag}`} tone="sage" /> : null}
                    <Ionicons
                      name={disabled ? 'lock-closed-outline' : 'add-circle'}
                      size={26}
                      color={disabled ? t.textMuted : t.primary}
                    />
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Sheet>

      <Sheet
        visible={!!statusFor}
        onClose={closeStatusSheet}
        title={
          pendingReasonStatus
            ? `Why ${STATUS_LABELS[pendingReasonStatus].toLowerCase()}?`
            : statusKind === 'return'
              ? 'Check in'
              : 'Set status'
        }>
        {pendingReasonStatus ? (
          <>
            <Field
              label="Reason (optional)"
              value={reasonText}
              onChangeText={setReasonText}
              placeholder={
                pendingReasonStatus === 'lost'
                  ? 'Left it at camp, fell off the pack…'
                  : 'Zipper broke, pole cracked…'
              }
              multiline
            />
            <Button
              label={`Mark ${STATUS_LABELS[pendingReasonStatus].toLowerCase()}`}
              tone="danger"
              onPress={() => applyStatus(pendingReasonStatus, reasonText.trim())}
            />
            <View style={{ height: 8 }} />
            <Button label="Back" tone="ghost" onPress={() => setPendingReasonStatus(null)} />
          </>
        ) : (
          (statusKind === 'return' ? RETURN_OUTCOME_STATUSES : STATUS_ORDER)
            .filter((s) => s !== 'consumed' || byId[statusForAssignment?.gearId ?? '']?.category === 'Food')
            .map((s) => {
              const active = statusForAssignment?.status === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => {
                    if (STATUSES_WITH_REASON.includes(s)) {
                      setPendingReasonStatus(s);
                      return;
                    }
                    applyStatus(s);
                  }}
                  style={{ marginBottom: 8 }}>
                  <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Chip label={STATUS_LABELS[s]} tone={statusTone(s)} />
                    <View style={{ flex: 1 }} />
                    {active ? <Ionicons name="checkmark-circle" size={22} color={t.primary} /> : null}
                  </Card>
                </Pressable>
              );
            })
        )}
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
      <TripFormModal
        visible={editTripOpen}
        onClose={() => setEditTripOpen(false)}
        editTripId={trip.id}
      />
      <ConfirmSheet
        visible={confirmDeleteTrip}
        title="Delete trip?"
        message={
          isSharedTrip
            ? `Delete "${trip.name}"? This is a shared trip — deleting it removes it for everyone you shared with and turns off the link. Each person's own gear stays in their library. This can't be undone.`
            : `Delete "${trip.name}" and its packing list? Your gear stays in your library — only this trip is removed. This can't be undone.`
        }
        confirmLabel="Delete trip"
        onConfirm={() => {
          removeTrip(trip.id);
          router.back();
        }}
        onClose={() => setConfirmDeleteTrip(false)}
      />
      {userId ? (
        <ShareTripSheet
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          trip={trip}
          userId={userId}
          onLeft={() => router.replace('/home')}
        />
      ) : null}
    </Screen>
  );
}

// Shown every time a trip is opened -- asks which of the three phases
// you're in rather than defaulting silently, since guessing wrong means
// the screen shows the wrong controls for what you're about to do.
function ModeChooser({ suggested, onChoose }: { suggested: Mode; onChoose: (m: Mode) => void }) {
  const t = useTheme();
  return (
    <View style={{ paddingTop: 4 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.text, marginBottom: 4 }}>
        What do you want to do?
      </Text>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
        You can switch later from the header.
      </Text>
      {(Object.keys(MODE_META) as Mode[]).map((key) => {
        const isSuggested = key === suggested;
        return (
          <Pressable
            key={key}
            onPress={() => {
              tapLight();
              onChoose(key);
            }}
            style={{ marginBottom: 10 }}>
            <Card style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: t.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={MODE_META[key].icon} size={20} color={t.softText} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{MODE_META[key].label}</Text>
                  {isSuggested ? <Chip label="Suggested" tone="sage" /> : null}
                </View>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 2 }}>
                  {MODE_META[key].subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

function SuccessRow({ label }: { label: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: t.soft,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
      }}>
      <Ionicons name="checkmark-circle" size={18} color={t.softText} />
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.softText }}>{label}</Text>
    </View>
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

function RowGroupLabel({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: font.semibold,
        fontSize: 11,
        color: t.textMuted,
        marginBottom: 6,
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

function Stepper({
  qty,
  onDec,
  onInc,
  atMax,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
  atMax?: boolean;
}) {
  const t = useTheme();
  const btn = { width: 30, height: 30, borderRadius: 8, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable onPress={() => { tapLight(); onDec(); }} style={btn}>
        <Ionicons name={qty <= 1 ? 'trash-outline' : 'remove'} size={16} color={t.text} />
      </Pressable>
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text, minWidth: 16, textAlign: 'center' }}>{qty}</Text>
      <Pressable
        disabled={atMax}
        onPress={() => {
          if (!atMax) {
            tapLight();
            onInc();
          }
        }}
        style={[btn, atMax ? { opacity: 0.4 } : null]}>
        <Ionicons name="add" size={16} color={t.text} />
      </Pressable>
    </View>
  );
}
