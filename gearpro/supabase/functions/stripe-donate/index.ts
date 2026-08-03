import Stripe from 'npm:stripe@17.5.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { appOrigin, corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

// GearPro is free -- this is a one-time, optional "support the app" payment,
// not a subscription. Deliberately simpler than stripe-checkout: no stored
// Stripe Customer (nothing recurring to manage later, so nothing to attach
// one to) and no pre-created Stripe Price (price_data lets the donor pick
// any amount within sane bounds, without needing a Stripe dashboard change
// for every new preset).
const MIN_CENTS = 100; // $1
const MAX_CENTS = 50000; // $500 -- a sanity ceiling against a typo/abuse, not a real expected donation

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const token = authHeader.replace('Bearer ', '');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new Error('Not authenticated');
    const user = userData.user;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const amountCents = Math.round(Number(body?.amountCents));
    if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
      throw new Error(`Donation amount must be between $${MIN_CENTS / 100} and $${MAX_CENTS / 100}`);
    }

    const base = appOrigin(origin);
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Support GearPro' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${base}/you?donate=success`,
      cancel_url: `${base}/you?donate=cancelled`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
});
