import { type Href, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Field } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { font, useTheme } from '@/theme/tokens';

/**
 * Reached after the user clicks the reset link in their email: /auth/callback
 * exchanges the recovery token (giving them a temporary session) and routes
 * here. With that session, updateUser sets the new password.
 */
export default function ResetPasswordScreen() {
  const t = useTheme();
  const router = useRouter();
  const { session, isLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // No recovery session -> the link was invalid/expired or opened on the wrong
  // device. Send them to request a fresh one.
  if (!isLoading && !session) {
    return <Redirect href={'/forgot-password' as Href} />;
  }

  const onSubmit = async () => {
    if (submitting) return;
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace('/home');
  };

  return (
    <Screen>
      <View style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center' }}>
        <Mark size={36} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 22, marginTop: 12 }}>Set a new password</Display>
      </View>

      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />
      <Field
        label="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Re-enter new password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={submitting ? 'Saving…' : 'Save new password'} onPress={onSubmit} />
    </Screen>
  );
}
