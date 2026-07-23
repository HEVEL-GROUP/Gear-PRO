import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, ChipPicker, Field, Label, Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void; editId?: string | null };

const blank = {
  brand: '',
  name: '',
  category: 'Shelter',
  weight: '',
  quantity: '1',
  notes: '',
  photoUri: '',
  expiration: '',
};

const isValidDate = (s: string) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

export function GearFormModal({ visible, onClose, editId }: Props) {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const categories = useGearStore((s) => s.categories);
  const addCategory = useGearStore((s) => s.addCategory);
  const addGear = useGearStore((s) => s.addGear);
  const updateGear = useGearStore((s) => s.updateGear);
  const removeGear = useGearStore((s) => s.removeGear);

  const editing = editId ? gear.find((g) => g.id === editId) : null;
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setForm(
      editing
        ? {
            brand: editing.brand,
            name: editing.name,
            category: editing.category,
            weight: String(editing.weightLb),
            quantity: String(editing.quantity),
            notes: editing.notes ?? '',
            photoUri: editing.photoUri ?? '',
            expiration: editing.expiration ?? '',
          }
        : blank,
    );
  }, [visible, editId]);

  const inUse = editing
    ? trips.some((tr) => tr.assignments.some((a) => a.gearId === editing.id))
    : false;

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    const uri = asset.base64
      ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
      : asset.uri;
    setForm((f) => ({ ...f, photoUri: uri }));
  };

  const save = () => {
    const weight = Number(form.weight);
    const quantity = Number(form.quantity);
    if (!form.brand.trim() || !form.name.trim() || !(weight > 0) || !(quantity >= 1)) {
      setError('Add a brand, name, a weight above 0, and quantity of at least 1.');
      return;
    }
    if (!isValidDate(form.expiration)) {
      setError('Expiration date should look like 2026-12-31, or leave it blank.');
      return;
    }
    const payload = {
      brand: form.brand.trim(),
      name: form.name.trim(),
      category: form.category,
      weightLb: weight,
      quantity: Math.round(quantity),
      notes: form.notes.trim() || undefined,
      photoUri: form.photoUri || undefined,
      expiration: form.expiration.trim() || undefined,
    };
    if (editing) updateGear(editing.id, payload);
    else addGear(payload);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit gear' : 'Add gear'}>
      <Label>Photo</Label>
      {form.photoUri ? (
        <View style={{ marginBottom: 14 }}>
          <Pressable onPress={pickPhoto}>
            <Image
              source={{ uri: form.photoUri }}
              style={{ width: '100%', height: 170, borderRadius: 14, backgroundColor: t.surfaceAlt }}
              contentFit="cover"
            />
          </Pressable>
          <Pressable onPress={() => setForm((f) => ({ ...f, photoUri: '' }))} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.alert }}>Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={pickPhoto} style={{ marginBottom: 14 }}>
          <View
            style={{
              height: 120,
              borderRadius: 14,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: t.border,
              backgroundColor: t.surface,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
            <Ionicons name="camera-outline" size={26} color={t.primary} />
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>Add photo</Text>
          </View>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Brand" value={form.brand} onChangeText={(v) => setForm((f) => ({ ...f, brand: v }))} placeholder="KUIU" />
        </View>
        <View style={{ flex: 1.4 }}>
          <Field label="Item name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Super Down jacket" />
        </View>
      </View>

      <ChipPicker
        label="Category"
        value={form.category}
        options={categories}
        onChange={(v) => setForm((f) => ({ ...f, category: v }))}
        onAddCustom={addCategory}
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Weight (lb)" value={form.weight} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} placeholder="0.0" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Owned qty" value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} placeholder="1" keyboardType="number-pad" />
        </View>
      </View>

      <Field
        label="Expiration date (optional)"
        value={form.expiration}
        onChangeText={(v) => setForm((f) => ({ ...f, expiration: v }))}
        placeholder="2026-12-31"
        autoCapitalize="none"
      />

      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Maintenance, fit, replacement…" multiline />

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={editing ? 'Save changes' : 'Add to library'} onPress={save} />

      {editing ? (
        <View style={{ marginTop: 10 }}>
          {inUse ? (
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center' }}>
              Assigned to a trip — remove it there before deleting.
            </Text>
          ) : (
            <Button
              label="Delete gear"
              tone="danger"
              onPress={() => {
                removeGear(editing.id);
                onClose();
              }}
            />
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
