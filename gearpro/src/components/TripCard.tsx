import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Card, Chip, Display, Eyebrow } from '@/components/ui';
import { WeightRing } from '@/components/WeightRing';
import { font, useTheme } from '@/theme/tokens';
import { TripLifecycle } from '@/store/useGearStore';

const FEATURED_EYEBROW: Record<TripLifecycle, string> = {
  needs_return: 'NEEDS RETURN',
  active: 'ACTIVE NOW',
  upcoming: 'NEXT UP',
  closed: 'CLOSED',
};

export function FeaturedCard(props: {
  weight: number;
  target: number;
  bags: number;
  items: number;
  packed: number;
  name: string;
  range: string;
  breakdown: { category: string; weight: number }[];
  barColors: string[];
  lifecycle: TripLifecycle;
}) {
  const t = useTheme();
  const maxCat = Math.max(...props.breakdown.map((b) => b.weight), 1);
  const eyebrowColor = props.lifecycle === 'needs_return' ? t.alert : t.primary;
  return (
    <Card>
      <Eyebrow color={eyebrowColor}>{`${FEATURED_EYEBROW[props.lifecycle]} · ${props.range}`}</Eyebrow>
      <Display style={{ marginTop: 4, marginBottom: 14 }}>{props.name}</Display>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <WeightRing value={props.weight} target={props.target} />
        <View style={{ flex: 1, gap: 10 }}>
          {props.breakdown.map((b, i) => (
            <View key={b.category}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.softText }}>{b.category}</Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>
                  {b.weight.toFixed(1)}
                </Text>
              </View>
              <View style={{ height: 8, borderRadius: 999, backgroundColor: t.track, overflow: 'hidden' }}>
                <View
                  style={{
                    height: 8,
                    borderRadius: 999,
                    width: `${Math.round((b.weight / maxCat) * 100)}%`,
                    backgroundColor: props.barColors[i % props.barColors.length],
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 7, marginTop: 16, flexWrap: 'wrap' }}>
        <Chip label={`${props.bags} bags`} tone="sage" icon={<Ionicons name="briefcase-outline" size={13} color={t.softText} />} />
        <Chip label={`${props.items} items`} tone="sage" />
        {props.lifecycle === 'needs_return' ? (
          <Chip
            label={`${props.packed} to check in`}
            tone="alert"
            icon={<Ionicons name="arrow-undo-outline" size={13} color={t.alertText} />}
          />
        ) : (
          <Chip label={`${props.packed} packed`} tone="solid" icon={<Ionicons name="checkmark" size={13} color={t.onPrimary} />} />
        )}
      </View>
    </Card>
  );
}
