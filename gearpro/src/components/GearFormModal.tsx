import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ChipPicker, Field, Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void; editId?: string | null };

const blank = { brand: '', name: '', category: 'Shelter', weight: '', quantity: '1', notes: '' };

export function GearFormModal({ visible, onClose, editId }: Props) {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const categories = useGearStore((s) => s.categories);
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
            weight: String(editing.weight),
            quantity: String(editing.quantity),
            notes: editing.notes ?? '',
          }
        : blank,
    );
  }, [visible, editId]);

  const inUse = editing
    ? trips.some((tr) => tr.assignments.some((a) => a.gearId === editing.id))
    : false;

  const save = () => {
    const weight = Number(form.weight);
    const quantity = Number(form.quantity);
    if (!form.brand.trim() || !form.name.trim() || !(weight > 0) || !(quantity >= 1)) {
      setError('Add a brand, name, a weight above 0, and quantity of at least 1.');
      return;
    }
    const payload = {
      brand: form.brand.trim(),
      name: form.name.trim(),
      category: form.category,
      weightLb: weight,
      quantity: Math.round(quantity),
      notes: form.notes.trim() || undefined,
    };
    if (editing) updateGear(editing.id, payload);
    else addGear(payload);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit gear' : 'Add gear'}>
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
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Weight (lb)" value={form.weight} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} placeholder="0.0" keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Owned qty" value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} placeholder="1" keyboardType="number-pad" />
        </View>
      </View>

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
