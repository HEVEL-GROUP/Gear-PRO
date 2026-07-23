import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/form';
import { Card } from '@/components/ui';
import { tapLight, tapSuccess } from '@/lib/haptics';
import { font, useTheme } from '@/theme/tokens';
import { CATEGORIES, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void };

export function ManageCategoriesSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const customCategories = useGearStore((s) => s.customCategories);
  const addCategory = useGearStore((s) => s.addCategory);
  const renameCategory = useGearStore((s) => s.renameCategory);
  const removeCategory = useGearStore((s) => s.removeCategory);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState('');

  const countFor = (name: string) => gear.filter((g) => g.category === name).length;

  const commitRename = (name: string) => {
    const trimmed = draft.trim();
    if (trimmed) renameCategory(name, trimmed);
    setEditing(null);
    setDraft('');
  };

  const commitAdd = () => {
    const trimmed = newDraft.trim();
    if (trimmed) {
      addCategory(trimmed);
      tapSuccess();
    }
    setNewDraft('');
    setAdding(false);
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setEditing(null);
        setDraft('');
        setAdding(false);
        setNewDraft('');
        onClose();
      }}
      title="Manage categories">
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
        Built-in categories can&apos;t be renamed or removed. Custom ones can — as long as no gear
        is using them.
      </Text>

      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 11,
          color: t.softText,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}>
        Built-in
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <View
            key={c}
            style={{
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: t.surfaceAlt,
              borderWidth: 1,
              borderColor: t.border,
            }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.textMuted }}>{c}</Text>
          </View>
        ))}
      </View>

      <Text
        style={{
          fontFamily: font.bold,
          fontSize: 11,
          color: t.softText,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}>
        Custom
      </Text>
      {customCategories.length === 0 ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 12 }}>
          None yet.
        </Text>
      ) : (
        customCategories.map((c) => {
          const count = countFor(c);
          const inUse = count > 0;

          if (editing === c) {
            return (
              <Card
                key={c}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, marginBottom: 8 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => commitRename(c)}
                  autoFocus
                  style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: t.text, paddingVertical: 4 }}
                />
                <Pressable onPress={() => commitRename(c)} hitSlop={8}>
                  <Ionicons name="checkmark-circle" size={22} color={t.primary} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditing(null);
                    setDraft('');
                  }}
                  hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={t.textMuted} />
                </Pressable>
              </Card>
            );
          }

          return (
            <Card key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>{c}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
                  {count} item{count === 1 ? '' : 's'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditing(c);
                  setDraft(c);
                }}
                hitSlop={8}>
                <Ionicons name="pencil-outline" size={18} color={t.text} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (inUse) return;
                  tapLight();
                  removeCategory(c);
                }}>
                <Ionicons name="trash-outline" size={18} color={inUse ? t.textMuted : t.alert} />
              </Pressable>
            </Card>
          );
        })
      )}

      <View style={{ height: 8 }} />

      {adding ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 }}>
          <TextInput
            value={newDraft}
            onChangeText={setNewDraft}
            onSubmitEditing={commitAdd}
            autoFocus
            placeholder="Category name"
            placeholderTextColor={t.textMuted}
            style={{ flex: 1, fontFamily: font.semibold, fontSize: 14, color: t.text, paddingVertical: 4 }}
          />
          <Pressable onPress={commitAdd} hitSlop={8}>
            <Ionicons name="checkmark-circle" size={22} color={t.primary} />
          </Pressable>
          <Pressable
            onPress={() => {
              setAdding(false);
              setNewDraft('');
            }}
            hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={t.textMuted} />
          </Pressable>
        </Card>
      ) : (
        <Pressable onPress={() => setAdding(true)}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.border,
              borderStyle: 'dashed',
              paddingVertical: 14,
            }}>
            <Ionicons name="add" size={18} color={t.primary} />
            <Text style={{ fontFamily: font.bold, color: t.primary, fontSize: 14 }}>Add category</Text>
          </View>
        </Pressable>
      )}
    </Sheet>
  );
}
