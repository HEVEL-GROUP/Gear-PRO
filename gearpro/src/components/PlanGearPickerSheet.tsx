import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { CategoryFilterSheet } from '@/components/CategoryFilterSheet';
import { GearFormModal } from '@/components/GearFormModal';
import { Sheet } from '@/components/form';
import { Card, Chip } from '@/components/ui';
import { tapLight, tapSuccess } from '@/lib/haptics';
import { font, radius, useTheme } from '@/theme/tokens';
import {
  filterGearInventory,
  groupByCategory,
  isExpiredDate,
  remainingToAssign,
  Trip,
  useGearStore,
} from '@/store/useGearStore';

type Props = {
  visible: boolean;
  onClose: () => void;
  trip: Trip;
  bagId: string;
  today: string;
};

export function PlanGearPickerSheet({ visible, onClose, trip, bagId, today }: Props) {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const allCategories = useGearStore((s) => s.categories);
  const addAssignment = useGearStore((s) => s.addAssignment);

  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const closePicker = () => {
    setQ('');
    setActiveCategory(null);
    setCategoryFilterOpen(false);
    setCreateOpen(false);
    onClose();
  };

  const usedCategories = useMemo(
    () => allCategories.filter((c) => gear.some((g) => g.category === c)),
    [allCategories, gear],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of gear) counts[g.category] = (counts[g.category] ?? 0) + 1;
    return counts;
  }, [gear]);

  const filtered = useMemo(
    () => filterGearInventory(gear, { query: q, category: activeCategory }),
    [gear, q, activeCategory],
  );

  const groups = useMemo(() => groupByCategory(filtered, (item) => item.category), [filtered]);

  const addToBag = (gearId: string) => {
    addAssignment(trip.id, bagId, gearId, 1);
    tapLight();
  };

  return (
    <>
      <Sheet visible={visible && !createOpen} onClose={closePicker} title="Add gear">
        <Pressable
          onPress={() => {
            tapLight();
            setCreateOpen(true);
          }}
          style={{ marginBottom: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.border,
              borderStyle: 'dashed',
              paddingVertical: 12,
            }}>
            <Ionicons name="add-circle-outline" size={20} color={t.primary} />
            <Text style={{ fontFamily: font.bold, color: t.primary, fontSize: 14 }}>Create new gear</Text>
          </View>
        </Pressable>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            height: 44,
            marginBottom: 14,
          }}>
          <Ionicons name="search" size={18} color={t.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search by name, brand, or notes"
            placeholderTextColor={t.textMuted}
            style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: t.text }}
          />
        </View>

        {usedCategories.length > 1 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Pressable onPress={() => setCategoryFilterOpen(true)} hitSlop={8}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.pill,
                  backgroundColor: t.surfaceAlt,
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="filter-outline" size={16} color={t.text} />
              </View>
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              style={{ flex: 1 }}>
              <CategoryChip
                label="All"
                active={activeCategory === null}
                onPress={() => setActiveCategory(null)}
              />
              {usedCategories.map((c) => (
                <CategoryChip
                  key={c}
                  label={c}
                  active={activeCategory === c}
                  onPress={() => setActiveCategory(c)}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {groups.length === 0 ? (
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 14,
              color: t.textMuted,
              textAlign: 'center',
              marginTop: 8,
              marginBottom: 8,
            }}>
            {gear.length === 0 ? 'No gear in your library yet — create one above.' : 'No gear matches your search.'}
          </Text>
        ) : (
          groups.map(({ category, items: catItems }) => (
            <View key={category} style={{ marginBottom: 10 }}>
              <Text
                style={{
                  fontFamily: font.semibold,
                  fontSize: 11,
                  color: t.textMuted,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}>
                {category}
              </Text>
              {catItems.map((item) => {
                const inBag =
                  trip.assignments.find((a) => a.gearId === item.id && a.bagId === bagId)?.quantity ?? 0;
                const remaining = remainingToAssign(item, trips, trip);
                const expired = isExpiredDate(item.expiration, today);
                const disabled = remaining <= 0;
                return (
                  <Pressable
                    key={item.id}
                    disabled={disabled}
                    onPress={() => {
                      if (!disabled) addToBag(item.id);
                    }}
                    style={{ marginBottom: 8, opacity: disabled ? 0.5 : 1 }}>
                    <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
                          {item.brand} {item.name}
                        </Text>
                        <Text
                          style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
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
          ))
        )}
      </Sheet>

      <CategoryFilterSheet
        visible={categoryFilterOpen}
        onClose={() => setCategoryFilterOpen(false)}
        categories={usedCategories}
        counts={categoryCounts}
        totalCount={gear.length}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      <GearFormModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(gearId) => {
          addAssignment(trip.id, bagId, gearId, 1);
          tapSuccess();
          setCreateOpen(false);
        }}
      />
    </>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={() => { tapLight(); onPress(); }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.pill,
          backgroundColor: active ? t.primary : t.surfaceAlt,
          borderWidth: 1,
          borderColor: active ? t.primary : t.border,
        }}>
        <Text
          style={{
            fontFamily: font.bold,
            fontSize: 13,
            color: active ? t.onPrimary : t.text,
          }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
