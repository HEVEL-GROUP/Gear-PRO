import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Mark } from '@/components/Mark';
import { Card, Display, Screen } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';
import { useGearStore } from '@/store/useGearStore';

function Row({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: t.soft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={19} color={t.softText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>{title}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, marginTop: 1 }}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export default function YouScreen() {
  const t = useTheme();
  const resetSeed = useGearStore((s) => s.resetSeed);

  return (
    <Screen>
      <View style={{ paddingTop: 8, paddingBottom: 14 }}>
        <Display style={{ fontSize: 26 }}>You</Display>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Mark size={44} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 20, marginTop: 10 }}>Gear Pro</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 2 }}>
          Everything saved on this device
        </Text>
      </Card>

      <View style={{ height: 12 }} />

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="cloud-offline-outline" title="Works offline" subtitle="Your gear and trips live on this device" />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Row icon="cloud-upload-outline" title="Cloud sync" subtitle="Sign in to sync across devices — coming soon" />
        <View style={{ height: 1, backgroundColor: t.border }} />
        <Row icon="download-outline" title="Backup & export" subtitle="Save a copy of your data — coming soon" />
      </Card>

      <View style={{ height: 16 }} />

      <Pressable onPress={() => resetSeed()}>
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: t.border,
          }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.textMuted }}>
            Reset demo data
          </Text>
        </View>
      </Pressable>

      <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted, textAlign: 'center', marginTop: 16 }}>
        Gear Pro v2 · web preview
      </Text>
    </Screen>
  );
}
