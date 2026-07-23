import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { supabase } from '@/lib/supabase/client';
import { font, useTheme } from '@/theme/tokens';

export default function AuthCallback() {
  const t = useTheme();
  const router = useRouter();
  const navigated = useRef(false);

  useEffect(() => {
    const go = (href: Href) => {
      if (navigated.current) return;
      navigated.current = true;
      router.replace(href);
    };

    // `detectSessionInUrl` on the client exchanges the ?code= param
    // asynchronously — check immediately in case it already landed, then
    // listen for the SIGNED_IN event the exchange fires when it completes.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go('/home');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) go('/home');
    });

    // Expired/invalid confirmation link — don't leave the user stuck on a spinner.
    const timeout = setTimeout(() => go('/login'), 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 15, color: t.text }}>Signing you in…</Text>
    </View>
  );
}
