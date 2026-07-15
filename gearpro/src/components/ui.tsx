import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tapLight } from '@/lib/haptics';
import { font, radius, useTheme } from '@/theme/tokens';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: t.border,
          padding: 16,
          shadowColor: '#201e1d',
          shadowOpacity: t.mode === 'dark' ? 0.35 : 0.07,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Touchable({
  children,
  onPress,
  style,
  haptics = true,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  haptics?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (haptics) tapLight();
        onPress?.();
      }}
      style={({ pressed }) => [
        { transform: [{ scale: pressed ? 0.975 : 1 }], opacity: pressed ? 0.94 : 1 },
        style,
      ]}>
      {children}
    </Pressable>
  );
}

type ChipTone = 'sage' | 'solid' | 'alert' | 'neutral';

export function Chip({ label, tone = 'neutral', icon }: { label: string; tone?: ChipTone; icon?: ReactNode }) {
  const t = useTheme();
  const map: Record<ChipTone, { bg: string; fg: string }> = {
    sage: { bg: t.soft, fg: t.softText },
    solid: { bg: t.primary, fg: t.onPrimary },
    alert: { bg: t.alertSoft, fg: t.alertText },
    neutral: { bg: t.surfaceAlt, fg: t.textMuted },
  };
  const c = map[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: c.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
      }}>
      {icon}
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: c.fg }}>{label}</Text>
    </View>
  );
}

export function Display({ children, style }: { children: ReactNode; style?: TextStyle }) {
  const t = useTheme();
  return <Text style={[{ fontFamily: font.display, color: t.text, fontSize: 24 }, style]}>{children}</Text>;
}

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 0.5, color: color ?? t.primary }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { alignItems: 'center', paddingBottom: 120 },
  inner: { width: '100%', maxWidth: 720, paddingHorizontal: 18 },
});
