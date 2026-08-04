-- Custom gear categories (added via "Manage categories") previously lived
-- ONLY in this device's local AsyncStorage -- unlike gear_items/trips/bags/
-- assignments, they were never part of the cloud sync at all. The gear
-- itself (and each item's category string) synced fine, but the moment a
-- user opened the app on a new device/browser, the custom category NAMES
-- they'd created reset to the built-in defaults: the filter chips, the
-- Manage Categories list, and the Add Gear category picker all lost every
-- custom category, even though the gear rows using them were untouched and
-- still grouped correctly (grouping falls back to whatever string is on the
-- item itself). One row per user -- these are just a small name list, not
-- data worth the per-row baseline/tombstone machinery the other tables use.
create table public.gear_category_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  custom_categories text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.gear_category_prefs
  for each row execute function public.set_updated_at();

alter table public.gear_category_prefs enable row level security;

create policy gear_category_prefs_select_own on public.gear_category_prefs
  for select to authenticated using (user_id = auth.uid());

create policy gear_category_prefs_insert_own on public.gear_category_prefs
  for insert to authenticated with check (user_id = auth.uid());

create policy gear_category_prefs_update_own on public.gear_category_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
