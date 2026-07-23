import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth/AuthProvider';
import { supabase } from '@/lib/supabase/client';

type ProStatus = {
  isPro: boolean | null;
  planType: string | null;
  /** 'stripe' | 'manual' | 'demo' | 'trial' | null -- distinguishes a real
   * Stripe subscription (has billing to manage) from a manually-granted or
   * trial one (nothing for the Stripe billing portal to open). */
  source: string | null;
  trialEndsAt: string | null;
  refresh: () => Promise<void>;
};

// Checkout/the billing portal open in a new tab, so this refreshes on mount
// AND whenever the app regains focus -- the only way to notice "the user
// went and subscribed/cancelled in that other tab" without a realtime push.
export function usePro(): ProStatus {
  const { session } = useAuth();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setIsPro(null);
      setPlanType(null);
      setSource(null);
      setTrialEndsAt(null);
      return;
    }
    const [proRes, grantRes] = await Promise.all([
      supabase.rpc('is_pro_user'),
      supabase
        .from('user_access_grants')
        .select('plan_type, source, ends_at')
        .eq('status', 'active')
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!proRes.error) setIsPro(Boolean(proRes.data));
    if (!grantRes.error) {
      setPlanType(grantRes.data?.plan_type ?? null);
      setSource(grantRes.data?.source ?? null);
      setTrialEndsAt(grantRes.data?.plan_type === 'trial' ? (grantRes.data?.ends_at ?? null) : null);
    }
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  return { isPro, planType, source, trialEndsAt, refresh };
}
