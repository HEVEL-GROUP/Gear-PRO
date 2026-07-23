import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstWeekday = (y: number, m: number) => new Date(y, m, 1).getDay();

type Props = {
  visible: boolean;
  onClose: () => void;
  value: string;
  title?: string;
  onChange: (value: string) => void;
};

/** Single-date calendar picker (used for gear expiration dates). */
export function DatePickerSheet({ visible, onClose, value, title = 'Pick a date', onChange }: Props) {
  const t = useTheme();
  const now = new Date();
  const initial = parseYmd(value) ?? { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    const p = parseYmd(value);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [visible, value]);

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const total = daysInMonth(viewYear, viewMonth);
  const offset = firstWeekday(viewYear, viewMonth);
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => ymd(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={20} color={t.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 15, color: t.text }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="chevron-forward" size={20} color={t.text} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: t.textMuted }}>{w}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <View key={i} style={{ width: '14.2857%', aspectRatio: 1 }} />;
          const selected = dateStr === draft;
          const day = Number(dateStr.slice(-2));
          return (
            <View key={i} style={{ width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => setDraft(dateStr)}
                style={{
                  width: '82%',
                  height: '82%',
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? t.primary : 'transparent',
                }}>
                <Text
                  style={{
                    fontFamily: selected ? font.bold : font.medium,
                    fontSize: 13,
                    color: selected ? t.onPrimary : t.text,
                  }}>
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Clear"
            tone="ghost"
            onPress={() => {
              onChange('');
              onClose();
            }}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Button
            label="Done"
            onPress={() => {
              onChange(draft);
              onClose();
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
