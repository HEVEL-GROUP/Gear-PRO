import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import {
  KeyboardTypeOptions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Display } from '@/components/ui';
import { font, useTheme } from '@/theme/tokens';

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(18,16,12,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: t.bg,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 34,
            maxHeight: '90%',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Display style={{ fontSize: 22, flex: 1 }}>{title}</Display>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={t.textMuted} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text
      style={{
        fontFamily: font.bold,
        fontSize: 11,
        color: t.softText,
        marginBottom: 7,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
      {children}
    </Text>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        style={{
          fontFamily: font.medium,
          fontSize: 16,
          color: t.text,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: multiline ? 76 : 48,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export function ChipPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((opt) => {
          const on = opt === value;
          return (
            <Pressable key={opt} onPress={() => onChange(opt)}>
              <View
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: on ? t.primary : t.surface,
                  borderWidth: 1,
                  borderColor: on ? t.primary : t.border,
                }}>
                <Text
                  style={{ fontFamily: font.semibold, fontSize: 13, color: on ? t.onPrimary : t.textMuted }}>
                  {opt}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ButtonTone = 'primary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  tone = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  icon?: ReactNode;
}) {
  const t = useTheme();
  const bg = tone === 'primary' ? t.primary : 'transparent';
  const fg = tone === 'primary' ? t.onPrimary : tone === 'danger' ? t.alert : t.text;
  const borderColor = tone === 'danger' ? t.alert : t.border;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: bg,
          borderRadius: 14,
          paddingVertical: 15,
          borderWidth: tone === 'primary' ? 0 : 1,
          borderColor,
        }}>
        {icon}
        <Text style={{ fontFamily: font.bold, fontSize: 16, color: fg }}>{label}</Text>
      </View>
    </Pressable>
  );
}
