import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { peekPendingJoin } from '@/lib/sharing/pendingJoin';
import { supabase } from '@/lib/supabase/client';

// On web this redirects the whole page to Google, then to Supabase's own
// callback (configured in the Google Cloud OAuth client, not here), which
// redirects back to us with the session already established. `auth/callback.tsx`
// picks it up the same way it already handles magic-link confirmations --
// `detectSessionInUrl` doesn't care which flow produced the session.
//
// The full-page redirect to Google would wipe in-memory state, so if a share
// link is mid-join we carry the token through the callback URL as ?join=<token>
// (belt-and-suspenders with the localStorage-persisted pendingJoin) so the
// callback can forward the newly-authed user to /join/<token> instead of /home.
export async function signInWithGoogle(): Promise<string | null> {
  const base =
    Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : Linking.createURL('/auth/callback');
  const pendingJoin = peekPendingJoin();
  const redirectTo = pendingJoin ? `${base}?join=${encodeURIComponent(pendingJoin)}` : base;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return error?.message ?? null;
}
