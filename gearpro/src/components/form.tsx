import { Ionicons } from '@expo/vector-icons';
import { ReactNode, Ref, useState } from 'react';
import {
  KeyboardAvoidingView,
  KeyboardTypeOptions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Display } from '@/components/ui';
import { tapLight } from '@/lib/haptics';
import { sheetMaxHeightPx } from '@/lib/keyboardInset';
import { useSheetKeyboard } from '@/lib/useSheetKeyboard';
import { font, useTheme } from '@/theme/tokens';

function scrollFocusedFieldIntoView(target: unknown) {
  if (Platform.OS !== 'web' || !target || typeof target !== 'object') return;
  const node = target as { scrollIntoView?: (opts?: ScrollIntoViewOptions) => void };
  requestAnimationFrame(() => {
    node.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  });
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Stays pinned under the scrolling body, above the keyboard. */
  footer?: ReactNode;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 640;
  const { lift, layoutHeight } = useSheetKeyboard(visible);
  const [headerHeight, setHeaderHeight] = useState(46);
  const [measuredFooter, setMeasuredFooter] = useState(0);
  const footerHeight = footer ? measuredFooter || 72 : 0;

  const bottomPad = lift > 0 ? 12 : isWide ? 22 : 34;
  const paddingTop = 18;
  // onLayout reports the title row without its margin, which still occupies space.
  const headerGap = 16;
  const footerGap = footer ? 4 : 0;
  const sheetMax = sheetMaxHeightPx(layoutHeight, lift, isWide);
  const scrollMax = Math.max(
    120,
    sheetMax - paddingTop - bottomPad - headerHeight - headerGap - footerHeight - footerGap,
  );

  return (
    <Modal visible={visible} transparent animationType={isWide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios' && lift === 0}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(18,16,12,0.55)',
            justifyContent: isWide ? 'center' : 'flex-end',
            alignItems: isWide ? 'center' : 'stretch',
            paddingBottom: lift,
          }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View
            style={{
              backgroundColor: t.bg,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderBottomLeftRadius: isWide ? 26 : 0,
              borderBottomRightRadius: isWide ? 26 : 0,
              paddingHorizontal: 20,
              paddingTop,
              paddingBottom: bottomPad,
              maxHeight: sheetMax,
              width: isWide ? 520 : '100%',
              maxWidth: isWide ? '92%' : undefined,
            }}>
            <View
              onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Display style={{ fontSize: 22, flex: 1 }}>{title}</Display>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={26} color={t.textMuted} />
              </Pressable>
            </View>
            <ScrollView
              style={{ maxHeight: scrollMax, flexGrow: 0 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag">
              {children}
            </ScrollView>
            {footer ? (
              <View
                onLayout={(e) => setMeasuredFooter(e.nativeEvent.layout.height)}
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: t.border,
                  marginTop: 4,
                }}>
                {footer}
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  secureTextEntry,
  autoComplete,
  inputRef,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  autoComplete?: 'email' | 'password' | 'off';
  inputRef?: Ref<TextInput>;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={(e) => scrollFocusedFieldIntoView(e.target)}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete}
        textContentType={secureTextEntry ? 'password' : autoComplete === 'email' ? 'emailAddress' : undefined}
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
  onAddCustom,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  // When set, a trailing "+ Add" chip lets the user type a brand-new option
  // (a custom category) instead of being limited to the fixed list.
  onAddCustom?: (name: string) => void;
}) {
  const t = useTheme();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onAddCustom?.(trimmed);
      onChange(trimmed);
    }
    setDraft('');
    setAdding(false);
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
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
        {onAddCustom ? (
          adding ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 999,
                paddingLeft: 13,
                paddingRight: 6,
                paddingVertical: 4,
              }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={commit}
                autoFocus
                placeholder="New category"
                placeholderTextColor={t.textMuted}
                style={{
                  fontFamily: font.semibold,
                  fontSize: 13,
                  color: t.text,
                  minWidth: 90,
                  paddingVertical: 4,
                }}
              />
              <Pressable onPress={commit} hitSlop={8}>
                <Ionicons name="checkmark-circle" size={22} color={t.primary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setDraft('');
                  setAdding(false);
                }}
                hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={t.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setAdding(true)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderStyle: 'dashed',
                }}>
                <Ionicons name="add" size={14} color={t.primary} />
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.primary }}>Add</Text>
              </View>
            </Pressable>
          )
        ) : null}
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
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const t = useTheme();
  const bg = tone === 'primary' ? t.primary : 'transparent';
  const fg = tone === 'primary' ? t.onPrimary : tone === 'danger' ? t.alert : t.text;
  const borderColor = tone === 'danger' ? t.alert : t.border;
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tapLight();
        onPress();
      }}
      style={({ pressed }) => ({
        opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
      })}>
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
