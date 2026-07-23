import { Text, View } from 'react-native';

import { Button, Sheet } from '@/components/form';
import { font, useTheme } from '@/theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * A lightweight "are you sure?" gate for destructive, hard-to-undo actions
 * (deleting a trip, gear item, bag, or category). Confirming runs onConfirm
 * then closes; Cancel just closes.
 */
export function ConfirmSheet({ visible, title, message, confirmLabel = 'Delete', onConfirm, onClose }: Props) {
  const t = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, lineHeight: 21, marginBottom: 18 }}>
        {message}
      </Text>
      <Button
        label={confirmLabel}
        tone="danger"
        onPress={() => {
          onConfirm();
          onClose();
        }}
      />
      <View style={{ height: 8 }} />
      <Button label="Cancel" tone="ghost" onPress={onClose} />
    </Sheet>
  );
}
