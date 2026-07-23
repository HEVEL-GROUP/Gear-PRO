import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button, Sheet } from '@/components/form';
import { Card } from '@/components/ui';
import { deleteAccount } from '@/lib/account/deleteAccount';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tapSuccess } from '@/lib/haptics';
import { useGearStore } from '@/store/useGearStore';
import { font, useTheme } from '@/theme/tokens';

type Props = { visible: boolean; onClose: () => void };

const CONFIRM_WORD = 'DELETE';

export function DeleteAccountSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const router = useRouter();
  const { signOut } = useAuth();
  const resetLocal = useGearStore((s) => s.resetLocal);

  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleClose = () => {
    setConfirmText('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!canDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      await signOut();
      resetLocal();
      tapSuccess();
      handleClose();
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={handleClose} title="Delete account">
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
        This permanently deletes your account, gear, trips, and any active subscription. This can't be
        undone.
      </Text>
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.text, marginBottom: 8 }}>
          Type DELETE to confirm
        </Text>
        <TextInput
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
          placeholderTextColor={t.textMuted}
          style={{
            fontFamily: font.semibold,
            fontSize: 15,
            color: t.text,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
      </Card>
      {error && (
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.alert, marginBottom: 12 }}>{error}</Text>
      )}
      <Button
        label={busy ? 'Deleting…' : 'Delete my account'}
        tone="danger"
        onPress={handleDelete}
        disabled={!canDelete || busy}
      />
      <View style={{ height: 8 }} />
      <Button label="Cancel" tone="ghost" onPress={handleClose} />
    </Sheet>
  );
}
