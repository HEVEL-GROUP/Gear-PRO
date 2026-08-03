-- Daily check for trials ending within 24h, via pg_cron -> pg_net -> Edge Function.
create extension if not exists pg_cron;

select cron.schedule(
  'trial-ending-reminder-daily',
  '0 14 * * *',  -- 14:00 UTC daily (~9am US Central)
  $$
  select net.http_post(
    url := 'https://gkkrejplofglwrbbnxit.supabase.co/functions/v1/trial-ending-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer f50baaf25f97ae29649022f9a2b2b79de1403ebbb3bf2b2aa82ab839ecdc5dbb'
    ),
    body := '{}'::jsonb
  );
  $$
);
