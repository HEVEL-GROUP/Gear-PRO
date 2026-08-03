import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, ChipPicker, Field, Label, Sheet } from '@/components/form';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { font, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '';
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

type Props = { visible: boolean; onClose: () => void; editId?: string | null; notice?: string };

const blank = {
  brand: '',
  name: '',
  category: 'Shelter',
  weight: '',
  quantity: '1',
  notes: '',
  expiration: '',
};

const isValidDate = (s: string) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

export function GearFormModal({ visible, onClose, editId, notice }: Props) {
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setConfirmingDelete(false);
    setForm(
      editing
        ? {
            brand: editing.brand,
            name: editing.name,
            category: editing.category,
            weight: String(editing.weightLb),
            quantity: String(editing.quantity),
            notes: editing.notes ?? '',
            expiration: editing.expiration ?? '',
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
      expiration: form.expiration.trim() || undefined,
    };
    if (editing) updateGear(editing.id, payload);
    else addGear(payload);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit gear' : 'Add gear'}>
      {notice ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: t.alertSoft,
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}>
          <Ionicons name="alert-circle-outline" size={18} color={t.alertText} />
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: t.alertText }}>{notice}</Text>
        </View>
      ) : null}
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

      <Label>Expiration date (optional)</Label>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Pressable onPress={() => setDatePickerOpen(true)} style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              height: 48,
            }}>
            <Ionicons name="calendar-outline" size={18} color={t.textMuted} />
            <Text
              style={{
                fontFamily: font.medium,
                fontSize: 15,
                color: form.expiration ? t.text : t.textMuted,
              }}>
              {form.expiration ? fmtDate(form.expiration) : 'Add expiration date'}
            </Text>
          </View>
        </Pressable>
        {form.expiration ? (
          <Pressable onPress={() => setForm((f) => ({ ...f, expiration: '' }))} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={t.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <Field label="Notes" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Maintenance, fit, replacement…" multiline />

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={editing ? 'Save changes' : 'Add to library'} onPress={save} />

      {editing ? (
        <View style={{ marginTop: 10 }}>
          {inUse ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: t.alertSoft,
                borderRadius: 12,
                padding: 12,
              }}>
              <Ionicons name="alert-circle-outline" size={18} color={t.alertText} />
              <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 13, color: t.alertText }}>
                Can't delete — assigned to a trip. Remove it there first.
              </Text>
            </View>
          ) : confirmingDelete ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, textAlign: 'center' }}>
                Delete {editing.brand} {editing.name} forever? This can&apos;t be undone.
              </Text>
              <Button
                label="Yes, delete"
                tone="danger"
                onPress={() => {
                  removeGear(editing.id);
                  onClose();
                }}
              />
              <Button label="Cancel" tone="ghost" onPress={() => setConfirmingDelete(false)} />
            </View>
          ) : (
            <Button label="Delete gear" tone="danger" onPress={() => setConfirmingDelete(true)} />
          )}
        </View>
      ) : null}

      <DatePickerSheet
        visible={datePickerOpen}
        value={form.expiration}
        title="Expiration date"
        onChange={(v) => setForm((f) => ({ ...f, expiration: v }))}
        onClose={() => setDatePickerOpen(false)}
      />
    </Sheet>
  );
}
