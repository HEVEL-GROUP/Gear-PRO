-- Security fix: 20260803_trial_welcome_email_webhook.sql and
-- 20260803_schedule_trial_ending_cron.sql hardcoded the pg_net webhook bearer
-- secret as a literal string, which got committed and flagged by GitGuardian
-- as a leaked secret in HEVEL-GROUP/Gear-PRO. The old secret has been rotated
-- (WEBHOOK_SHARED_SECRET Edge Function env var updated separately). This
-- migration moves the secret into Supabase Vault and repoints both callers to
-- read it at call time instead of embedding it in SQL.

create extension if not exists supabase_vault;

-- The actual secret value is inserted directly against the live project via
-- `select vault.create_secret(...)` -- never written into a migration file.
-- If replaying this migration on a fresh database, insert the secret manually
-- first: select vault.create_secret('<value>', 'gearpro_webhook_shared_secret', '...');

create or replace function public.notify_trial_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if new.plan_type = 'trial' and new.source = 'trial' then
    select decrypted_secret into v_secret
      from vault.decrypted_secrets
      where name = 'gearpro_webhook_shared_secret';

    perform net.http_post(
      url := 'https://gkkrejplofglwrbbnxit.supabase.co/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      body := jsonb_build_object('user_id', new.user_id)
    );
  end if;
  return new;
end;
$$;

select cron.unschedule('trial-ending-reminder-daily');

select cron.schedule(
  'trial-ending-reminder-daily',
  '0 14 * * *',
  $cron$
  select net.http_post(
    url := 'https://gkkrejplofglwrbbnxit.supabase.co/functions/v1/trial-ending-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'gearpro_webhook_shared_secret'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
