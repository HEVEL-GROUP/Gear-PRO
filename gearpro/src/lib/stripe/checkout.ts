import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase/client';

async function invoke(functionName: 'stripe-donate', body?: Record<string, unknown>): Promise<string> {
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

// GearPro is free -- this opens a one-time Stripe Checkout session for an
// optional "support the app" payment, not a subscription. amountCents is
// validated server-side too (stripe-donate); this call just forwards it.
export async function startDonation(amountCents: number): Promise<void> {
  const url = await invoke('stripe-donate', { amountCents });
  await WebBrowser.openBrowserAsync(url);
}
