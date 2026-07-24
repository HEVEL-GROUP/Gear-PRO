import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { takePendingJoin } from '@/lib/sharing/pendingJoin';
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

    // A password-reset link lands here carrying a recovery token (type=recovery
    // in the URL). We must route those to the set-new-password screen, not into
    // the app -- even though the token also produces a (temporary) session.
    const isRecovery =
      typeof window !== 'undefined' && /type=recovery/.test(window.location.hash + window.location.search);

    // A share link that went through Google SSO / email confirmation lands here
    // after a full page reload. Recover the join token from the callback URL
    // (?join=, threaded through the OAuth/email redirect) or the persisted
    // pendingJoin store, and finish the join instead of dropping the user on
    // /home. URL param wins so a cross-device email confirmation still works.
    const urlJoin =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('join')
        : null;
    const joinToken = urlJoin || takePendingJoin();
    const postAuthHref: Href = joinToken ? (`/join/${joinToken}` as Href) : '/home';

    // `detectSessionInUrl` on the client exchanges the token asynchronously —
    // check immediately in case it already landed, then listen for the event
    // the exchange fires when it completes.
    const recoveryHref = '/reset-password' as Href;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go(isRecovery ? recoveryHref : postAuthHref);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') go(recoveryHref);
      else if (event === 'SIGNED_IN' && session) go(isRecovery ? recoveryHref : postAuthHref);
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
