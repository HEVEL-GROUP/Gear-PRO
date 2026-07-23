import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Sheet } from '@/components/form';
import { Card, Chip } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';
import { daysUntilExpiration, expiringGear, todayStamp, useGearStore } from '@/store/useGearStore';

type Props = { visible: boolean; onClose: () => void; onEdit: (id: string) => void };

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return '';
  return `${MONTHS_SHORT[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function labelFor(days: number): string {
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

export function ExpiringGearSheet({ visible, onClose, onEdit }: Props) {
  const t = useTheme();
  const gear = useGearStore((s) => s.gear);
  const today = todayStamp();
  const items = expiringGear(gear, today);

  return (
    <Sheet visible={visible} onClose={onClose} title="Expiring gear">
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
        Gear that&apos;s expired or expires within the next 3 months. Tap an item to update or replace it.
      </Text>
      {items.length === 0 ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, textAlign: 'center' }}>
          Nothing expiring soon.
        </Text>
      ) : (
        items.map((g) => {
          const days = daysUntilExpiration(g.expiration, today) ?? 0;
          const expired = days < 0;
          return (
            <Pressable
              key={g.id}
              onPress={() => {
                onEdit(g.id);
                onClose();
              }}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text }}>
                    {g.brand} {g.name}
                  </Text>
                  <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                    {labelFor(days)} · {fmtDate(g.expiration!)}
                  </Text>
                </View>
                <Chip label={expired ? 'Expired' : 'Soon'} tone={expired ? 'alert' : 'neutral'} />
                <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
              </Card>
            </Pressable>
          );
        })
      )}
    </Sheet>
  );
}
