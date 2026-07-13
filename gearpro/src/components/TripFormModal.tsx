import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Field, Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';
import { uid, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void; onCreated?: (id: string) => void };

const blank = { name: '', location: '', startDate: '', endDate: '' };
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

export function TripFormModal({ visible, onClose, onCreated }: Props) {
  const t = useTheme();
  const addTrip = useGearStore((s) => s.addTrip);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setForm(blank);
      setError('');
    }
  }, [visible]);

  const save = () => {
    if (!form.name.trim()) return setError('Give the trip a name.');
    if (!isDate(form.startDate) || !isDate(form.endDate)) return setError('Use dates like 2026-10-12.');
    if (form.endDate < form.startDate) return setError('End date can’t be before the start date.');
    const id = addTrip({
      name: form.name.trim(),
      location: form.location.trim(),
      startDate: form.startDate.trim(),
      endDate: form.endDate.trim(),
      bags: [{ id: uid(), label: 'My Pack', maxWeightLb: 45, color: '#7a8a5e' }],
      assignments: [],
    });
    onClose();
    onCreated?.(id);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="New trip">
      <Field label="Trip name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Elk season · Bighorns" />
      <Field label="Location" value={form.location} onChangeText={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Bighorn Mountains, WY" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field label="Start" value={form.startDate} onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))} placeholder="2026-10-12" autoCapitalize="none" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="End" value={form.endDate} onChangeText={(v) => setForm((f) => ({ ...f, endDate: v }))} placeholder="2026-10-16" autoCapitalize="none" />
        </View>
      </View>
      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}
      <Button label="Create trip" onPress={save} />
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 12 }}>
        Starts with a My Pack bag — add gear next.
      </Text>
    </Sheet>
  );
}
