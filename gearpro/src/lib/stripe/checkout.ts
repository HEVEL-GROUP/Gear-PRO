import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase/client';

export type Plan = 'monthly' | 'annual';

async function invoke(
  functionName: 'stripe-checkout' | 'stripe-portal',
  body?: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(functionName, {
    body,
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? `${functionName} did not return a URL`);
  return data.url;
}

export async function startCheckout(plan: Plan): Promise<void> {
  const url = await invoke('stripe-checkout', { plan });
  await WebBrowser.openBrowserAsync(url);
}

export async function openBillingPortal(): Promise<void> {
  const url = await invoke('stripe-portal');
  await WebBrowser.openBrowserAsync(url);
}
