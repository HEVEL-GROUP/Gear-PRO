import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Display, Screen } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

export default function PackScreen() {
  const t = useTheme();
  return (
    <Screen>
      <View style={{ paddingTop: 8, paddingBottom: 12 }}>
        <Display style={{ fontSize: 26 }}>Packing</Display>
      </View>
      <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, gap: 12 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: t.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="list-outline" size={34} color={t.softText} />
        </View>
        <Display style={{ fontSize: 20, textAlign: 'center' }}>Pack a trip</Display>
        <Text
          style={{
            fontFamily: font.medium,
            fontSize: 14,
            color: t.textMuted,
            textAlign: 'center',
            lineHeight: 21,
          }}>
          Pick a trip, drop gear into your bags, then check items out as you pack and back in when you
          return. Coming next.
        </Text>
      </View>
    </Screen>
  );
}
