import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';

import { Sheet } from '@/components/form';
import { Card } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  categories: string[];
  counts: Record<string, number>;
  totalCount: number;
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
};

export function CategoryFilterSheet({
  visible,
  onClose,
  categories,
  counts,
  totalCount,
  activeCategory,
  onSelect,
}: Props) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Filter by category">
      <CategoryRow
        label="All"
        count={totalCount}
        active={activeCategory === null}
        onPress={() => {
          onSelect(null);
          onClose();
        }}
      />
      {categories.map((c) => (
        <CategoryRow
          key={c}
          label={c}
          count={counts[c] ?? 0}
          active={activeCategory === c}
          onPress={() => {
            onSelect(c);
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}

function CategoryRow({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 12,
          marginBottom: 8,
          borderWidth: active ? 2 : 1,
          borderColor: active ? t.primary : t.border,
        }}>
        <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14, color: t.text }}>{label}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted, marginRight: active ? 8 : 0 }}>
          {count}
        </Text>
        {active ? <Ionicons name="checkmark-circle" size={18} color={t.primary} /> : null}
      </Card>
    </Pressable>
  );
}
