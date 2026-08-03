// Cron-invoked (pg_cron, daily) via a shared-secret HTTP call, mirroring
// ThetaBeta's CRON_SECRET pattern. Finds active trials ending within 24h that
// haven't been reminded yet, sends one email each, and marks them notified so
// a retry (or the next day's run) never double-sends.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendEmail, trialEndingSubject, trialEndingHtml } from '../_shared/email.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function authorized(req: Request): boolean {
  const secret = Deno.env.get('WEBHOOK_SHARED_SECRET');
  if (!secret) return false;
  const auth = req.headers.get('Authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

Deno.serve(async (req) => {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: grants, error } = await admin
    .from('user_access_grants')
    .select('user_id')
    .eq('plan_type', 'trial')
    .eq('status', 'active')
    .is('trial_ending_notified_at', null)
    .gte('ends_at', now.toISOString())
    .lte('ends_at', in24h.toISOString());

  if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });

  const results: { user_id: string; ok: boolean }[] = [];
  for (const g of grants ?? []) {
    const { data: profile } = await admin.from('user_profiles').select('email').eq('user_id', g.user_id).maybeSingle();
    if (!profile?.email) { results.push({ user_id: g.user_id, ok: false }); continue; }
    const sent = await sendEmail({ to: profile.email, subject: trialEndingSubject(), html: trialEndingHtml() });
    if (sent.ok) {
      await admin.from('user_access_grants').update({ trial_ending_notified_at: new Date().toISOString() })
        .eq('user_id', g.user_id).eq('plan_type', 'trial');
    }
    results.push({ user_id: g.user_id, ok: sent.ok });
  }

  return new Response(JSON.stringify({ checked: grants?.length ?? 0, results }), { headers: { 'Content-Type': 'application/json' } });
});
