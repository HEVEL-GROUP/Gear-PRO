import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { GearFormModal } from '@/components/GearFormModal';
import { Card, Chip, Display, Screen } from '@/components/ui';
import { font, radius, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

export default function GearScreen() {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editId: string | null }>({
    open: false,
    editId: null,
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? gear.filter((g) => `${g.brand} ${g.name} ${g.category}`.toLowerCase().includes(query))
      : gear;
    return [...list].sort((a, b) => a.category.localeCompare(b.category));
  }, [gear, q]);

  const totalWeight = gear.reduce((s, g) => s + g.weightLb * g.quantity, 0);

  return (
    <Screen>
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

      {filtered.map((g) => (
        <Pressable key={g.id} onPress={() => setModal({ open: true, editId: g.id })} style={{ marginBottom: 10 }}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Chip label={g.category} tone="neutral" />
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                  {g.weightLb.toFixed(2)} lb · qty {g.quantity}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </Card>
        </Pressable>
      ))}

      <Pressable onPress={() => setModal({ open: true, editId: null })}>
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
      </Pressable>

      <GearFormModal
        visible={modal.open}
        editId={modal.editId}
        onClose={() => setModal({ open: false, editId: null })}
      />
    </Screen>
  );
}
