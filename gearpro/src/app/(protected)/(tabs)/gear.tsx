import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { CategoryFilterSheet } from '@/components/CategoryFilterSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { ExpiringGearSheet } from '@/components/ExpiringGearSheet';
import { GearFormModal } from '@/components/GearFormModal';
import { ImportGearSheet } from '@/components/ImportGearSheet';
import { ManageCategoriesSheet } from '@/components/ManageCategoriesSheet';
import { NeedsAttentionSheet } from '@/components/NeedsAttentionSheet';
import { Card, Chip, Display, Screen, Touchable } from '@/components/ui';
import { tapLight } from '@/lib/haptics';
import { font, radius, useTheme } from '@/theme/tokens';
import {
  expiringGear,
  flaggedAssignments,
  GearItem,
  groupByCategory,
  isExpiredDate,
  todayStamp,
  useGearStore,
} from '@/store/useGearStore';

export default function GearScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const allCategories = useGearStore((s) => s.categories);
  const removeGear = useGearStore((s) => s.removeGear);
  const removeGearBulk = useGearStore((s) => s.removeGearBulk);
  const today = todayStamp();
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editId: string | null; notice?: string }>({
    open: false,
    editId: null,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [confirmGear, setConfirmGear] = useState<{ id: string; name: string } | null>(null);
  const [expiringOpen, setExpiringOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);

  const flaggedCount = useMemo(() => flaggedAssignments(trips).length, [trips]);
  const expiringCount = useMemo(() => expiringGear(gear, today).length, [gear, today]);

  // Ids of gear packed on any trip (any status). These can't be quick-deleted
  // -- same guard as the single-row trash icon -- so they're locked out of
  // selection. Computed once here instead of per row.
  const inUseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tr of trips) for (const a of tr.assignments) ids.add(a.gearId);
    return ids;
  }, [trips]);

  const usedCategories = useMemo(
    () => allCategories.filter((c) => gear.some((g) => g.category === c)),
    [allCategories, gear],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of gear) counts[g.category] = (counts[g.category] ?? 0) + 1;
    return counts;
  }, [gear]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = query
      ? gear.filter((g) => `${g.brand} ${g.name} ${g.category}`.toLowerCase().includes(query))
      : gear;
    if (activeCategory) list = list.filter((g) => g.category === activeCategory);
    return list;
  }, [gear, q, activeCategory]);

  const groups = useMemo(
    () => groupByCategory(filtered, (g: GearItem) => g.category),
    [filtered],
  );

  const totalWeight = gear.reduce((s, g) => s + g.weightLb * g.quantity, 0);

  // The deletable gear currently in view (respects search + category filter,
  // excludes locked-in-use items) -- what "Select all" operates on.
  const selectableFilteredIds = useMemo(
    () => filtered.filter((g) => !inUseIds.has(g.id)).map((g) => g.id),
    [filtered, inUseIds],
  );
  const allFilteredSelected =
    selectableFilteredIds.length > 0 && selectableFilteredIds.every((id) => selected.has(id));

  const enterSelectMode = () => {
    tapLight();
    setSelectMode(true);
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const toggleSelected = (id: string) => {
    tapLight();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    tapLight();
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of selectableFilteredIds) next.delete(id);
      } else {
        for (const id of selectableFilteredIds) next.add(id);
      }
      return next;
    });
  };

  // A gear item assigned to any trip (any status) can't be quick-deleted --
  // tapping the trash icon instead opens the edit modal, which already
  // explains why and where to unassign it first. In select mode the same items
  // are locked (shown with a lock icon) and can't be checked for bulk delete.
  const renderGearRow = (g: GearItem) => {
    const inUse = inUseIds.has(g.id);
    const isSelected = selected.has(g.id);
    return (
      <View key={g.id} style={{ marginBottom: 10 }}>
        <Touchable
          onPress={() => {
            if (selectMode) {
              if (!inUse) toggleSelected(g.id);
              return;
            }
            setModal({ open: true, editId: g.id });
          }}>
          <Card
            style={{
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderColor: isSelected ? t.primary : t.border,
              borderWidth: isSelected ? 2 : 1,
              opacity: selectMode && inUse ? 0.55 : 1,
            }}>
            {g.photoUri ? (
              <Image
                source={{ uri: g.photoUri }}
                style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: t.surfaceAlt }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: t.soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="image-outline" size={22} color={t.softText} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>
                {g.brand} {g.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                  {g.weightLb.toFixed(2)} lb · qty {g.quantity}
                </Text>
                {g.isDemo ? <Chip label="Demo" tone="alert" /> : null}
                {isExpiredDate(g.expiration, today) ? <Chip label="Expired" tone="alert" /> : null}
                {selectMode && inUse ? <Chip label="Packed" tone="neutral" /> : null}
              </View>
            </View>
            {selectMode ? (
              <Ionicons
                name={inUse ? 'lock-closed' : isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={inUse ? t.textMuted : isSelected ? t.primary : t.textMuted}
              />
            ) : (
              <>
                <Pressable
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (inUse) {
                      setModal({
                        open: true,
                        editId: g.id,
                        notice: "Can't delete — this item is packed on a trip. Unassign it there first.",
                      });
                      return;
                    }
                    tapLight();
                    setConfirmGear({ id: g.id, name: `${g.brand} ${g.name}`.trim() });
                  }}>
                  <Ionicons name="trash-outline" size={18} color={inUse ? t.textMuted : t.alert} />
                </Pressable>
                <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
              </>
            )}
          </Card>
        </Touchable>
      </View>
    );
  };

  return (
    <Screen maxWidth={isWide ? 860 : 720}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, paddingBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Display style={{ fontSize: 26 }}>Gear library</Display>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
            {selectMode
              ? `${selected.size} selected`
              : `${gear.length} items · ${totalWeight.toFixed(1)} lb owned`}
          </Text>
        </View>
        {selectMode ? (
          <Pressable onPress={exitSelectMode} hitSlop={10} style={{ padding: 6, marginTop: 2 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.primary }}>Done</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={() => setCategoriesOpen(true)} hitSlop={10} style={{ padding: 6, marginTop: 2 }}>
              <Ionicons name="pricetags-outline" size={22} color={t.primary} />
            </Pressable>
            <Pressable onPress={() => setImportOpen(true)} hitSlop={10} style={{ padding: 6, marginTop: 2 }}>
              <Ionicons name="cloud-upload-outline" size={22} color={t.primary} />
            </Pressable>
            {gear.length > 0 ? (
              <Pressable onPress={enterSelectMode} hitSlop={10} style={{ padding: 6, marginTop: 2 }}>
                <Ionicons name="checkbox-outline" size={22} color={t.primary} />
              </Pressable>
            ) : null}
            {/* Same action as the "Add gear" row at the bottom of the list --
                this one's reachable without scrolling past a long library. */}
            <Pressable
              onPress={() => setModal({ open: true, editId: null })}
              hitSlop={10}
              style={{ padding: 6, marginTop: 2 }}>
              <Ionicons name="add-circle-outline" size={22} color={t.primary} />
            </Pressable>
          </>
        )}
      </View>

      {selectMode ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: t.surfaceAlt,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.md,
            paddingVertical: 10,
            paddingHorizontal: 12,
            marginBottom: 14,
          }}>
          <Pressable onPress={toggleSelectAll} hitSlop={8} disabled={selectableFilteredIds.length === 0}>
            <Text
              style={{
                fontFamily: font.bold,
                fontSize: 14,
                color: selectableFilteredIds.length === 0 ? t.textMuted : t.primary,
              }}>
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => {
              tapLight();
              setConfirmBulk(true);
            }}
            hitSlop={8}
            disabled={selected.size === 0}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              opacity: selected.size === 0 ? 0.45 : pressed ? 0.8 : 1,
            })}>
            <Ionicons name="trash-outline" size={18} color={t.alert} />
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.alert }}>
              Delete{selected.size > 0 ? ` (${selected.size})` : ''}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {flaggedCount > 0 ? (
        <Pressable onPress={() => setAttentionOpen(true)} style={{ marginBottom: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: t.alertSoft,
              borderRadius: 14,
              padding: 14,
            }}>
            <Ionicons name="alert-circle-outline" size={20} color={t.alertText} />
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.alertText, flex: 1 }}>
              {flaggedCount} item{flaggedCount === 1 ? '' : 's'} need{flaggedCount === 1 ? 's' : ''} attention
            </Text>
            <Ionicons name="chevron-forward" size={18} color={t.alertText} />
          </View>
        </Pressable>
      ) : null}

      {expiringCount > 0 ? (
        <Pressable onPress={() => setExpiringOpen(true)} style={{ marginBottom: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: t.alertSoft,
              borderRadius: 14,
              padding: 14,
            }}>
            <Ionicons name="time-outline" size={20} color={t.alertText} />
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.alertText, flex: 1 }}>
              {expiringCount} item{expiringCount === 1 ? '' : 's'} expired or expiring soon
            </Text>
            <Ionicons name="chevron-forward" size={18} color={t.alertText} />
          </View>
        </Pressable>
      ) : null}

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
          placeholder="Search gear"
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
            <CategoryFilterChip
              label="All"
              active={activeCategory === null}
              onPress={() => setActiveCategory(null)}
            />
            {usedCategories.map((c) => (
              <CategoryFilterChip
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
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, textAlign: 'center', marginTop: 24 }}>
          No gear found.
        </Text>
      ) : (
        groups.map(({ category, items }) => {
          const catWeight = items.reduce((s, g) => s + g.weightLb * g.quantity, 0);
          return (
            <View key={category} style={{ marginBottom: 18 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}>
                <Text
                  style={{
                    fontFamily: font.bold,
                    fontSize: 13,
                    color: t.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}>
                  {category}
                </Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                  {items.length} · {catWeight.toFixed(1)} lb
                </Text>
              </View>
              {items.map(renderGearRow)}
            </View>
          );
        })
      )}

      {selectMode ? null : (
        <Touchable onPress={() => setModal({ open: true, editId: null })}>
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
            <Text style={{ fontFamily: font.bold, color: t.primary, fontSize: 15 }}>Add gear</Text>
          </View>
        </Touchable>
      )}

      <GearFormModal
        visible={modal.open}
        editId={modal.editId}
        notice={modal.notice}
        onClose={() => setModal({ open: false, editId: null })}
      />
      <ImportGearSheet visible={importOpen} onClose={() => setImportOpen(false)} />
      <NeedsAttentionSheet visible={attentionOpen} onClose={() => setAttentionOpen(false)} />
      <ExpiringGearSheet
        visible={expiringOpen}
        onClose={() => setExpiringOpen(false)}
        onEdit={(id) => setModal({ open: true, editId: id })}
      />
      <ManageCategoriesSheet visible={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      <CategoryFilterSheet
        visible={categoryFilterOpen}
        onClose={() => setCategoryFilterOpen(false)}
        categories={usedCategories}
        counts={categoryCounts}
        totalCount={gear.length}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />
      <ConfirmSheet
        visible={confirmGear !== null}
        title="Delete gear?"
        message={confirmGear ? `Delete "${confirmGear.name}" from your library? This can't be undone.` : ''}
        confirmLabel="Delete gear"
        onConfirm={() => {
          if (confirmGear) removeGear(confirmGear.id);
        }}
        onClose={() => setConfirmGear(null)}
      />
      <ConfirmSheet
        visible={confirmBulk}
        title={`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`}
        message={`Delete ${selected.size} item${selected.size === 1 ? '' : 's'} from your library? This can't be undone.`}
        confirmLabel={`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}`}
        onConfirm={() => {
          removeGearBulk([...selected]);
          exitSelectMode();
        }}
        onClose={() => setConfirmBulk(false)}
      />
    </Screen>
  );
}

function CategoryFilterChip({
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
    <Pressable onPress={onPress}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.pill,
          backgroundColor: active ? t.primary : t.surfaceAlt,
          borderWidth: 1,
          borderColor: active ? t.primary : t.border,
        }}>
        <Text style={{ fontFamily: font.bold, fontSize: 13, color: active ? t.onPrimary : t.textMuted }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
