import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Field } from '@/components/form';
import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { font, useTheme } from '@/theme/tokens';

export default function LoginScreen() {
  const t = useTheme();
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!authLoading && session) {
    return <Redirect href="/home" />;
  }

  const onSubmit = async () => {
    if (submitting) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(
        signInError.message.includes('Invalid login credentials')
          ? 'Incorrect email or password.'
          : signInError.message,
      );
      return;
    }
    router.replace('/home');
  };

  return (
    <Screen>
      <View style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center' }}>
        <Mark size={36} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 22, marginTop: 12 }}>Welcome back</Display>
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
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={submitting ? 'Logging in…' : 'Log in'} onPress={onSubmit} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>New here?</Text>
        <Pressable onPress={() => router.push('/signup')}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.primary }}>Create an account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
