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
  if (error) {
    // supabase-js's default error.message for a non-2xx response is just
    // "Edge Function returned a non-2xx status code" -- the actual reason
    // (e.g. a Stripe error) is only in the response body, on error.context.
    const context = (error as { context?: Response }).context;
    let message: string | undefined;
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json();
        message = parsed?.error;
      } catch {
        // response body wasn't JSON -- fall back to the generic message below
      }
    }
    throw new Error(message ?? error.message);
  }
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
