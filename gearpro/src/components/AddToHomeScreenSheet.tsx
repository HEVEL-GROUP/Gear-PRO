import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';

function Step({ number, children }: { number: number; children: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: t.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 13, color: t.onPrimary }}>{number}</Text>
      </View>
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: t.text, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  );
}

// iOS Safari has no API to trigger "Add to Home Screen" programmatically --
// unlike Android Chrome's beforeinstallprompt, Apple exposes nothing a page
// can call. This is the honest fallback: show the manual steps instead of a
// one-tap install button, since a real one isn't possible here.
export function AddToHomeScreenSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title="Add to Home Screen">
      <Step number={1}>
        Tap the Share icon in Safari&apos;s toolbar (a square with an arrow pointing up).
      </Step>
      <Step number={2}>Scroll down and tap &quot;Add to Home Screen.&quot;</Step>
      <Step number={3}>Tap &quot;Add&quot; in the top right.</Step>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Ionicons name="information-circle-outline" size={16} color={t.textMuted} />
        <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>
          GearPro will open full-screen from your home screen, just like any other app.
        </Text>
      </View>
    </Sheet>
  );
}
