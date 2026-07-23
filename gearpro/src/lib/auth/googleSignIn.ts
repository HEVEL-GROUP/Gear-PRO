import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';

// On web this redirects the whole page to Google, then to Supabase's own
// callback (configured in the Google Cloud OAuth client, not here), which
// redirects back to us with the session already established. `auth/callback.tsx`
// picks it up the same way it already handles magic-link confirmations --
// `detectSessionInUrl` doesn't care which flow produced the session.
export async function signInWithGoogle(): Promise<string | null> {
  const redirectTo =
    Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : Linking.createURL('/auth/callback');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return error?.message ?? null;
}
