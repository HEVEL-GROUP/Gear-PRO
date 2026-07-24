import { type Href, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Field } from '@/components/form';
import { AuthDivider, GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { takePendingJoin } from '@/lib/sharing/pendingJoin';
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

  // Single post-auth routing point: fires the moment the session becomes real
  // (email/password OR Google), and forwards to a pending share-link join if
  // one is waiting. onSubmit deliberately doesn't navigate itself, so there's
  // no race between two redirects.
  if (!authLoading && session) {
    const pending = takePendingJoin();
    return <Redirect href={pending ? (`/join/${pending}` as Href) : '/home'} />;
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
    // No navigation here -- the reactive Redirect above takes over once the
    // session propagates, so a pending join link is honored consistently.
  };

  return (
    <Screen>
      <View style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center' }}>
        <Mark size={36} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
        <Display style={{ fontSize: 22, marginTop: 12 }}>Welcome back</Display>
      </View>

      <GoogleSignInButton onError={setError} />
      <AuthDivider />

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

      <Pressable onPress={() => router.push('/forgot-password' as Href)} style={{ marginTop: 14, alignSelf: 'center' }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.textMuted }}>Forgot password?</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>New here?</Text>
        <Pressable onPress={() => router.push('/signup')}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.primary }}>Create an account</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 14 }}>
        <Pressable onPress={() => router.push('/terms')}>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>Terms of Service</Text>
        </Pressable>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>·</Text>
        <Pressable onPress={() => router.push('/privacy')}>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.textMuted }}>Privacy Policy</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
