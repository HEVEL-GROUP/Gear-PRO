import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';

/**
 * Loads and saves the current user's display name from user_profiles. The name
 * is what teammates see on a shared trip; falls back to the email when unset.
 */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDisplayName(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error) setDisplayName(data?.display_name ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (name: string): Promise<void> => {
      if (!userId) return;
      const trimmed = name.trim();
      const { error } = await supabase
        .from('user_profiles')
        .update({ display_name: trimmed || null })
        .eq('user_id', userId);
      if (error) throw error;
      setDisplayName(trimmed || null);
    },
    [userId],
  );

  return { displayName, loading, save, refresh };
}
