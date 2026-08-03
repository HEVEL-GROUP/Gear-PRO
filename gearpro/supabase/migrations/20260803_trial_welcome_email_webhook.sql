-- Email infrastructure for the SES-based transactional email set (welcome,
-- trial-ending, payment-failed, subscription-cancelled), mirroring ThetaBeta's.
-- Stripe-driven emails (payment-failed, cancelled) are sent directly from the
-- stripe-webhook Edge Function -- no DB trigger needed for those. Welcome
-- (trial start) has no HTTP hook today since handle_new_user() grants the
-- trial via a plain INSERT, so this adds one: a pg_net webhook trigger that
-- fires the send-welcome-email function whenever a NEW trial grant lands.

create extension if not exists pg_net;

-- Dedup marker so the trial-ending cron (Edge Function, scheduled separately)
-- never double-sends the same reminder on a retry or the next day's run.
alter table public.user_access_grants add column if not exists trial_ending_notified_at timestamptz;

create or replace function public.notify_trial_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_type = 'trial' and new.source = 'trial' then
    perform net.http_post(
      url := 'https://gkkrejplofglwrbbnxit.supabase.co/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer f50baaf25f97ae29649022f9a2b2b79de1403ebbb3bf2b2aa82ab839ecdc5dbb'
      ),
      body := jsonb_build_object('user_id', new.user_id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trial_welcome_webhook on public.user_access_grants;
create trigger trial_welcome_webhook
after insert on public.user_access_grants
for each row execute function public.notify_trial_welcome();

-- (Scheduling for trial-ending-reminder lives in a second migration file,
-- 20260803_schedule_trial_ending_cron.sql, since it needs pg_cron which is a
-- separate extension from pg_net.)
