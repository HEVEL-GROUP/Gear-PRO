import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase/client';

async function invoke(functionName: 'stripe-checkout' | 'stripe-portal'): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(functionName);
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error ?? `${functionName} did not return a URL`);
  return data.url;
}

export async function startCheckout(): Promise<void> {
  const url = await invoke('stripe-checkout');
  await WebBrowser.openBrowserAsync(url);
}

export async function openBillingPortal(): Promise<void> {
  const url = await invoke('stripe-portal');
  await WebBrowser.openBrowserAsync(url);
}
