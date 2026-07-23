import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Button, Sheet } from '@/components/form';
import { Card } from '@/components/ui';
import { tapSuccess } from '@/lib/haptics';
import { font, useTheme } from '@/theme/tokens';
import { demoDataCounts, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void };

export function ClearDemoDataSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const trips = useGearStore((s) => s.trips);
  const clearDemoData = useGearStore((s) => s.clearDemoData);

  const counts = demoDataCounts(gear, trips);
  const nothingLeft = counts.gear === 0 && counts.trips === 0;

  return (
    <Sheet visible={visible} onClose={onClose} title="Clear demo data">
      {nothingLeft ? (
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Ionicons name="checkmark-circle" size={28} color={t.primary} />
          <Text
            style={{
              fontFamily: font.medium,
              fontSize: 13,
              color: t.textMuted,
              textAlign: 'center',
              marginTop: 10,
            }}>
            No demo data left — everything in your library is yours.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
            Gear Pro ships with a few sample items and trips so the app isn't empty on first open.
            Clearing them won't touch anything you've added yourself.
          </Text>
          <Card style={{ padding: 14, marginBottom: 16 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>Will be removed</Text>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
              {counts.gear} demo gear item{counts.gear === 1 ? '' : 's'} · {counts.trips} demo trip
              {counts.trips === 1 ? '' : 's'}
            </Text>
          </Card>
          <Button
            label="Clear demo data"
            tone="danger"
            onPress={() => {
              clearDemoData();
              tapSuccess();
              onClose();
            }}
          />
        </>
      )}
    </Sheet>
  );
}
