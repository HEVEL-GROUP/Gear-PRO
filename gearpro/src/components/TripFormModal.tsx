import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CalendarSheet } from '@/components/CalendarSheet';
import { Button, Field, Label, Sheet } from '@/components/form';
import { PlaceField } from '@/components/PlaceField';
import { font, useTheme } from '@/theme/tokens';
import { uid, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void; onCreated?: (id: string) => void };

const blank = { name: '', location: '', startDate: '', endDate: '' };

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function fmtDate(s: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return '';
  return `${MONTH_SHORT[Number(match[2]) - 1]} ${Number(match[3])}`;
}

export function TripFormModal({ visible, onClose, onCreated }: Props) {
  const t = useTheme();
  const addTrip = useGearStore((s) => s.addTrip);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(blank);
      setError('');
    }
  }, [visible]);

  const save = () => {
    if (!form.name.trim()) return setError('Give the trip a name.');
    if (!form.startDate || !form.endDate) return setError('Pick a start and end date.');
    if (form.endDate < form.startDate) return setError('End date can’t be before the start date.');
    const id = addTrip({
      name: form.name.trim(),
      location: form.location.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      bags: [{ id: uid(), label: 'My Pack', maxWeightLb: 45, color: '#7a8a5e' }],
      assignments: [],
    });
    onClose();
    onCreated?.(id);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="New trip">
      <Field label="Trip name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Elk season · Bighorns" />
      <PlaceField
        label="Location"
        value={form.location}
        onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
        placeholder="Bighorn Mountains, WY"
      />

      <Label>Trip dates</Label>
      <Pressable onPress={() => setCalendarOpen(true)} style={{ marginBottom: 14 }}>
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
            minHeight: 48,
          }}>
          <Ionicons name="calendar-outline" size={18} color={t.textMuted} />
          <Text
            style={{
              flex: 1,
              fontFamily: font.medium,
              fontSize: 16,
              color: form.startDate ? t.text : t.textMuted,
            }}>
            {form.startDate
              ? `${fmtDate(form.startDate)} – ${fmtDate(form.endDate || form.startDate)}`
              : 'Select dates'}
          </Text>
        </View>
      </Pressable>

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}
      <Button label="Create trip" onPress={save} />
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 12 }}>
        Starts with a My Pack bag — add gear next.
      </Text>

      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        startDate={form.startDate}
        endDate={form.endDate}
        onChange={(start, end) => setForm((f) => ({ ...f, startDate: start, endDate: end }))}
      />
    </Sheet>
  );
}
