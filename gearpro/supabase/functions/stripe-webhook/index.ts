import Stripe from 'npm:stripe@17.5.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Stripe calls this server-to-server -- no browser involved, so no CORS needed.
// verify_jwt must be OFF for this function (Stripe doesn't send a Supabase JWT);
// the Stripe-Signature check below is what authenticates the caller instead.
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function userIdForCustomer(customerId: string): Promise<string | null> {
  const { data } = await admin
    .from('user_profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const userId = await userIdForCustomer(customerId);
      if (userId) {
        await admin.from('user_access_grants').insert({
          user_id: userId,
          source: 'stripe',
          plan_type: 'subscription',
          status: 'active',
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const userId = await userIdForCustomer(customerId);
      if (userId) {
        await admin
          .from('user_access_grants')
          .update({ status: 'revoked', ends_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('source', 'stripe')
          .eq('status', 'active');
      }
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
