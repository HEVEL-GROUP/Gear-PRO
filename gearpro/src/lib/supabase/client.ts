import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Set them in .env (see .env.example).',
  );
}

// AsyncStorage's web build assumes a browser (it touches window.localStorage
// directly, with no environment guard). That's fine at runtime -- gearpro is
// only ever actually USED in a browser or the native app -- but Expo Router's
// "server" web output executes the app's module tree in a plain Node process
// to build its routing manifest (and, if static rendering is ever turned on,
// to pre-render each screen), and there is no window there. Supabase's auth
// client eagerly tries to recover a session from storage on construction, so
// AsyncStorage.getItem() throws immediately in that Node pass. A no-op store
// is the semantically CORRECT behavior for that pass anyway (there is no real
// visitor/session to recover during a build-time render), not just a
// crash-avoidance hack -- the real AsyncStorage is used for every actual
// browser/native session.
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window === 'undefined' ? noopStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
