import { Ionicons } from '@expo/vector-icons';
import { type Href, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Field } from '@/components/form';
import { AuthDivider, GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Mark } from '@/components/Mark';
import { Display, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { peekPendingJoin, takePendingJoin } from '@/lib/sharing/pendingJoin';
import { supabase } from '@/lib/supabase/client';
import { font, useTheme } from '@/theme/tokens';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export default function SignupScreen() {
  const t = useTheme();
  const router = useRouter();
  const { session, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);

  // Honor a pending share-link join (auto-confirm projects land here with a
  // session immediately after signUp).
  if (!authLoading && session) {
    const pending = takePendingJoin();
    return <Redirect href={pending ? (`/join/${pending}` as Href) : '/home'} />;
  }

  const onSubmit = async () => {
    if (submitting) return;
    setError('');
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy first.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    // If a share link is mid-join, carry its token through the confirmation
    // link (?join=) so clicking it -- even on another device -- finishes the
    // join instead of landing on /home.
    const pendingJoin = peekPendingJoin();
    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback${pendingJoin ? `?join=${encodeURIComponent(pendingJoin)}` : ''}`
        : undefined;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    // Supabase silently no-ops signUp for an already-registered, confirmed email
    // (no error, no new identity) rather than leaking which emails exist.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('That email already has an account. Try logging in instead.');
      return;
    }
    if (data.session) {
      // Email confirmation is ON, so signUp normally returns no session and we
      // fall through to the check-email screen below. But if the project is
      // ever switched to auto-confirm, signUp returns a session immediately --
      // handle that by going straight into the app.
      router.replace('/home');
      return;
    }
    setCheckEmail(true);
  };

  if (checkEmail) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 }}>
          <Mark size={40} fill={t.primary} check={t.mode === 'dark' ? t.bg : t.cream} />
          <Display style={{ fontSize: 20, textAlign: 'center' }}>Check your email</Display>
          <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.textMuted, textAlign: 'center', lineHeight: 21 }}>
            We sent a confirmation link to {email.trim()}. Click it to finish creating your account.
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
        <Display style={{ fontSize: 22, marginTop: 12 }}>Create your account</Display>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted, marginTop: 4 }}>
          Free forever, offline. Sync when you're ready.
        </Text>
      </View>

      <GoogleSignInButton
        onError={setError}
        blocked={!agreed}
        blockedMessage="Please agree to the Terms of Service and Privacy Policy first."
      />
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
        placeholder="At least 8 characters"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="password"
      />

      <Pressable
        onPress={() => setAgreed((a) => !a)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 16 }}>
        <Ionicons
          name={agreed ? 'checkbox' : 'square-outline'}
          size={20}
          color={agreed ? t.primary : t.textMuted}
          style={{ marginTop: 1 }}
        />
        <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: t.textMuted, lineHeight: 19 }}>
          I agree to the{' '}
          <Text onPress={() => router.push('/terms')} style={{ color: t.primary, fontFamily: font.bold }}>
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text onPress={() => router.push('/privacy')} style={{ color: t.primary, fontFamily: font.bold }}>
            Privacy Policy
          </Text>
        </Text>
      </Pressable>

      {error ? (
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.alert, marginBottom: 10 }}>{error}</Text>
      ) : null}

      <Button label={submitting ? 'Creating account…' : 'Create account'} onPress={onSubmit} />

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 18 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.textMuted }}>Already have an account?</Text>
        <Pressable onPress={() => router.push('/login')}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: t.primary }}>Log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
