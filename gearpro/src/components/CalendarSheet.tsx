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

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function firstWeekday(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}

function fmtShort(s: string): string {
  const p = parseYmd(s);
  if (!p) return '';
  return `${MONTH_NAMES[p.m].slice(0, 3)} ${p.d}`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
};

export function CalendarSheet({ visible, onClose, startDate, endDate, onChange }: Props) {
  const t = useTheme();
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const initial = parseYmd(startDate) ?? { y: new Date().getFullYear(), m: new Date().getMonth(), d: 1 };
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m);

  useEffect(() => {
    if (!visible) return;
    setDraftStart(startDate);
    setDraftEnd(endDate);
    const p = parseYmd(startDate);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    }
  }, [visible, startDate, endDate]);

  const handleTapDay = (dateStr: string) => {
    if (!draftStart || draftEnd) {
      setDraftStart(dateStr);
      setDraftEnd('');
      return;
    }
    if (dateStr < draftStart) {
      setDraftStart(dateStr);
      setDraftEnd('');
      return;
    }
    setDraftEnd(dateStr);
  };

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
    <Sheet visible={visible} onClose={onClose} title="Trip dates">
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={20} color={t.text} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: font.bold,
            fontSize: 15,
            color: t.text,
          }}>
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
          if (!dateStr) {
            return <View key={i} style={{ width: '14.2857%', aspectRatio: 1 }} />;
          }
          const isStart = dateStr === draftStart;
          const isEnd = dateStr === draftEnd;
          const inRange = !!draftStart && !!draftEnd && dateStr > draftStart && dateStr < draftEnd;
          const isEndpoint = isStart || isEnd;
          const day = Number(dateStr.slice(-2));
          return (
            <View key={i} style={{ width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => handleTapDay(dateStr)}
                style={{
                  width: '82%',
                  height: '82%',
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isEndpoint ? t.primary : inRange ? t.soft : 'transparent',
                }}>
                <Text
                  style={{
                    fontFamily: isEndpoint ? font.bold : font.medium,
                    fontSize: 13,
                    color: isEndpoint ? t.onPrimary : inRange ? t.softText : t.text,
                  }}>
                  {day}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 6 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>
          {draftStart ? fmtShort(draftStart) : 'Start'} → {draftEnd ? fmtShort(draftEnd) : draftStart ? fmtShort(draftStart) : 'End'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Clear"
            tone="ghost"
            onPress={() => {
              setDraftStart('');
              setDraftEnd('');
            }}
          />
        </View>
        <View style={{ flex: 2 }}>
          <Button
            label="Done"
            onPress={() => {
              if (!draftStart) return;
              onChange(draftStart, draftEnd || draftStart);
              onClose();
            }}
          />
        </View>
      </View>
    </Sheet>
  );
}
