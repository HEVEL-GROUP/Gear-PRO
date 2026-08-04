import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Sheet } from '@/components/form';
import { EMOJI_LIST } from '@/lib/emojiList';
import { font, radius, useTheme } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  onClear: () => void;
  hasEmoji: boolean;
};

export function EmojiPickerSheet({ visible, onClose, onSelect, onClear, hasEmoji }: Props) {
  const t = useTheme();
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return EMOJI_LIST;
    return EMOJI_LIST.filter((e) => e.keywords.includes(query));
  }, [q]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Pick an emoji">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          height: 44,
          marginBottom: 14,
        }}>
        <Ionicons name="search" size={18} color={t.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search (tent, boot, fire…)"
          placeholderTextColor={t.textMuted}
          autoFocus
          style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: t.text }}
        />
      </View>

      {hasEmoji ? (
        <Pressable
          onPress={() => {
            onClear();
            onClose();
          }}
          style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.alert }}>Remove emoji</Text>
        </Pressable>
      ) : null}

      {results.length === 0 ? (
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, textAlign: 'center', marginTop: 12 }}>
          No matches.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {results.map((e, i) => (
            <Pressable
              key={`${e.emoji}-${i}`}
              onPress={() => {
                onSelect(e.emoji);
                onClose();
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: t.soft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ fontSize: 24 }}>{e.emoji}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}
