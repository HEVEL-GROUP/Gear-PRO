import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { GearFormModal } from '@/components/GearFormModal';
import { Card, Chip, Display, Screen, Touchable } from '@/components/ui';
import { font, radius, useTheme } from '@/theme/tokens';
import { CATEGORIES, GearItem, groupByCategory, isExpiredDate, todayStamp, useGearStore } from '@/store/useGearStore';

export default function GearScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 880;
  const gear = useGearStore((s) => s.gear);
  const today = todayStamp();
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editId: string | null }>({
    open: false,
    editId: null,
  });

  const usedCategories = useMemo(
    () => CATEGORIES.filter((c) => gear.some((g) => g.category === c)),
    [gear],
  );

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

  const renderGearRow = (g: GearItem) => (
    <View key={g.id} style={{ marginBottom: 10 }}>
      <Touchable onPress={() => setModal({ open: true, editId: g.id })}>
        <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
              {isExpiredDate(g.expiration, today) ? <Chip label="Expired" tone="alert" /> : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
        </Card>
      </Touchable>
    </View>
  );

  return (
    <Screen maxWidth={isWide ? 860 : 720}>
      <View style={{ paddingTop: 8, paddingBottom: 12 }}>
        <Display style={{ fontSize: 26 }}>Gear library</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          {gear.length} items · {totalWeight.toFixed(1)} lb owned
        </Text>
      </View>

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          style={{ marginBottom: 14 }}>
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

      <GearFormModal
        visible={modal.open}
        editId={modal.editId}
        onClose={() => setModal({ open: false, editId: null })}
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
