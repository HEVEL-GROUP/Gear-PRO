import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Button, Field } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase/client';
import { font, useTheme } from '@/theme/tokens';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// The reset link Supabase emails must land back on /auth/callback, which
// detects the PASSWORD_RECOVERY event and routes to the set-new-password
// screen. On web that's the current origin; native falls back to the prod URL.
function callbackUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return 'https://gearpro.app/auth/callback';
}

export default function ForgotPasswordScreen() {
  const t = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    if (submitting) return;
    setError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl(),
    });
    setSubmitting(false);
    // Always show the same confirmation whether or not the email exists, so we
    // don't leak which addresses have accounts.
    if (resetError && !resetError.message.toLowerCase().includes('rate')) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 }}>
          <Mark size={40} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
          <Display style={{ fontSize: 20, textAlign: 'center' }}>Check your email</Display>
          <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 21 }}>
            If an account exists for {email.trim()}, we sent a link to reset your password. Open it on this
            device to set a new one.
          </Text>
          <Pressable onPress={() => router.replace('/login')} style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: t.primary }}>Back to log in</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center' }}>
        <Mark size={36} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 22, marginTop: 12 }}>Reset your password</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4, textAlign: 'center' }}>
          Enter your email and we&apos;ll send you a reset link.
        </Text>
      </View>

      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={submitting ? 'Sending…' : 'Send reset link'} onPress={onSubmit} />

      <Pressable onPress={() => router.replace('/login')} style={{ marginTop: 18, alignSelf: 'center' }}>
        <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.primary }}>Back to log in</Text>
      </Pressable>
    </Screen>
  );
}
