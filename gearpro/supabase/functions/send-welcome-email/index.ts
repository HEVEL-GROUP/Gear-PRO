// Called by a DB trigger (trial_welcome_webhook, via pg_net) right after
// handle_new_user() grants a brand-new 7-day trial. Never blocks signup --
// pg_net fires this asynchronously and ignores the response.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendEmail, welcomeSubject, welcomeHtml } from '../_shared/email.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function authorized(req: Request): boolean {
  const secret = Deno.env.get('WEBHOOK_SHARED_SECRET');
  if (!secret) return false;
  const auth = req.headers.get('Authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

Deno.serve(async (req) => {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });

  const { user_id } = await req.json().catch(() => ({}));
  if (!user_id) return new Response(JSON.stringify({ ok: false, error: 'user_id required' }), { status: 400 });

  const [{ data: profile }, { data: grant }] = await Promise.all([
    admin.from('user_profiles').select('email').eq('user_id', user_id).maybeSingle(),
    admin.from('user_access_grants').select('ends_at').eq('user_id', user_id).eq('plan_type', 'trial').eq('status', 'active').maybeSingle(),
  ]);

  if (!profile?.email) return new Response(JSON.stringify({ ok: false, error: 'no email on file' }), { status: 200 });

  const trialEndDate = grant?.ends_at
    ? new Date(grant.ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '7 days from now';

  const result = await sendEmail({ to: profile.email, subject: welcomeSubject(), html: welcomeHtml(trialEndDate) });
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
});
