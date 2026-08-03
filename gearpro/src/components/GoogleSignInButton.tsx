import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { signInWithGoogle } from '@/lib/auth/googleSignIn';
import { font, useTheme } from '@/theme/tokens';

export function GoogleSignInButton({
  onError,
  blocked,
  blockedMessage,
}: {
  onError: (message: string) => void;
  /** When set, pressing the button reports blockedMessage instead of
   * starting the OAuth flow -- e.g. signup requiring the terms checkbox
   * first. Login has no such gate, so both props are optional and unused
   * there. */
  blocked?: boolean;
  blockedMessage?: string;
}) {
  const t = useTheme();
  const [submitting, setSubmitting] = useState(false);

  return (
    <Pressable
      disabled={submitting}
      onPress={async () => {
        if (blocked) {
          onError(blockedMessage ?? 'Please try again.');
          return;
        }
        setSubmitting(true);
        const error = await signInWithGoogle();
        if (error) {
          setSubmitting(false);
          onError(error);
        }
        // On success the page redirects to Google immediately -- nothing more to do here.
      }}
      style={{ opacity: submitting ? 0.7 : 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 14,
          paddingVertical: 14,
        }}>
        <Ionicons name="logo-google" size={18} color={t.text} />
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>
          {submitting ? 'Redirecting…' : 'Continue with Google'}
        </Text>
      </View>
    </Pressable>
  );
}

export function AuthDivider() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.textMuted }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
    </View>
  );
}
