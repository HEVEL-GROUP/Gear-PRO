import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Field, Label, Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';
import { BAG_COLORS, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void; tripId: string; editBagId?: string | null };

export function BagFormSheet({ visible, onClose, tripId, editBagId }: Props) {
  const t = useTheme();
  const trips = useGearStore((s) => s.trips);
  const addBag = useGearStore((s) => s.addBag);
  const updateBag = useGearStore((s) => s.updateBag);
  const removeBag = useGearStore((s) => s.removeBag);

  const trip = trips.find((x) => x.id === tripId);
  const editing = editBagId ? trip?.bags.find((b) => b.id === editBagId) : null;
  const canDelete = (trip?.bags.length ?? 0) > 1;

  const [label, setLabel] = useState('');
  const [maxW, setMaxW] = useState('35');
  const [color, setColor] = useState(BAG_COLORS[0]);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setConfirmingDelete(false);
    if (editing) {
      setLabel(editing.label);
      setMaxW(String(editing.maxWeightLb));
      setColor(editing.color);
    } else {
      const n = (trip?.bags.length ?? 0) + 1;
      setLabel(`Bag ${n}`);
      setMaxW('35');
      const used = new Set(trip?.bags.map((b) => b.color));
      setColor(BAG_COLORS.find((c) => !used.has(c)) ?? BAG_COLORS[(trip?.bags.length ?? 0) % BAG_COLORS.length]);
    }
  }, [visible, editBagId]);

  const save = () => {
    const m = Number(maxW);
    if (!label.trim() || !(m > 0)) {
      setError('Add a name and a max weight above 0.');
      return;
    }
    if (editing) updateBag(tripId, editing.id, { label: label.trim(), maxWeightLb: m, color });
    else addBag(tripId, { label: label.trim(), maxWeightLb: m, color });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit bag' : 'Add bag'}>
      <Field label="Bag name" value={label} onChangeText={setLabel} placeholder="Day pack" />
      <Field
        label="Max weight (lb)"
        value={maxW}
        onChangeText={setMaxW}
        placeholder="35"
        keyboardType="decimal-pad"
      />
      <Label>Color</Label>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
        {BAG_COLORS.map((c) => (
          <Pressable key={c} onPress={() => setColor(c)}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: color === c ? t.text : 'transparent',
              }}
            />
          </Pressable>
        ))}
      </View>
      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}
      <Button label={editing ? 'Save bag' : 'Add bag'} onPress={save} />
      {editing && canDelete ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          {confirmingDelete ? (
            <>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, textAlign: 'center' }}>
                Delete {editing.label} and everything packed in it? This can&apos;t be undone.
              </Text>
              <Button
                label="Yes, delete bag"
                tone="danger"
                onPress={() => {
                  removeBag(tripId, editing.id);
                  onClose();
                }}
              />
              <Button label="Cancel" tone="ghost" onPress={() => setConfirmingDelete(false)} />
            </>
          ) : (
            <Button label="Delete bag & its gear" tone="danger" onPress={() => setConfirmingDelete(true)} />
          )}
        </View>
      ) : null}
      {editing && !canDelete ? (
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 10 }}>
          A trip needs at least one bag.
        </Text>
      ) : null}
    </Sheet>
  );
}
