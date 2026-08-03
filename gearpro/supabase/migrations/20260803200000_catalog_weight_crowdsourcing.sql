-- Crowdsourced weight validation. The submission is invisible to the user:
-- every gear item already requires a weight before it saves, so when that
-- item was matched to a catalog product (gear_items.catalog_product_id,
-- set once at creation via the Add Gear suggestion), the weight they were
-- already typing for themselves doubles as a submission -- no separate
-- "contribute" flow, no prompt.

alter table public.catalog_products
  add column weight_confidence text not null default 'none'
    check (weight_confidence in ('none', 'unverified', 'community', 'official')),
  add column weight_submission_count int not null default 0;

create table public.catalog_weight_submissions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.catalog_products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_lb numeric not null check (weight_lb > 0),
  source text not null default 'gear_item' check (source in ('gear_item', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One submission per user per product -- editing a gear item's weight
  -- later re-submits (upsert on this key) rather than creating a second row,
  -- so a user's contribution reflects their CURRENT stated weight.
  unique (product_id, user_id)
);

create index catalog_weight_submissions_product_id_idx on public.catalog_weight_submissions (product_id);

create trigger set_updated_at
  before update on public.catalog_weight_submissions
  for each row execute function public.set_updated_at();

alter table public.catalog_weight_submissions enable row level security;

create policy catalog_weight_submissions_select_own on public.catalog_weight_submissions
  for select to authenticated using (user_id = auth.uid());

create policy catalog_weight_submissions_insert_own on public.catalog_weight_submissions
  for insert to authenticated with check (user_id = auth.uid());

create policy catalog_weight_submissions_update_own on public.catalog_weight_submissions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Recomputes the product's aggregate weight from its submissions (median,
-- not mean -- one fat-fingered entry shouldn't skew it) every time a
-- submission is inserted/updated/deleted. SECURITY DEFINER because the
-- invoking role (authenticated) has no UPDATE grant on catalog_products --
-- that stays service-role/trigger-only, consistent with the rest of this
-- table's write posture. Never overrides an 'official' (manufacturer-
-- sourced) value, no matter what the crowd says.
--
-- Verified end to end against live data before wiring up the client: two
-- submissions (3.2, 3.4) -> median 3.3, confidence 'community', count 2;
-- resubmitting one to 3.0 -> median recomputes to 3.2 without changing the
-- contributor's participation count; deleting all submissions reverts the
-- product to weight_lb null / confidence 'none' / count 0.
create function public.recompute_catalog_weight()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
  v_count int;
  v_median numeric;
begin
  select count(*), percentile_cont(0.5) within group (order by weight_lb)
    into v_count, v_median
  from public.catalog_weight_submissions
  where product_id = v_product_id;

  update public.catalog_products
  set weight_lb = case when weight_confidence = 'official' then weight_lb else v_median end,
      weight_submission_count = v_count,
      weight_confidence = case
        when weight_confidence = 'official' then 'official'
        when v_count = 0 then 'none'
        when v_count = 1 then 'unverified'
        else 'community'
      end
  where id = v_product_id;

  return coalesce(new, old);
end;
$$;

create trigger recompute_weight_after_submission
  after insert or update or delete on public.catalog_weight_submissions
  for each row execute function public.recompute_catalog_weight();

-- Contributor recognition, credited on PARTICIPATION (any distinct product
-- submitted to), not on whether the number was accepted into consensus --
-- avoids a confusing "why didn't mine count" for a real user.
alter table public.user_profiles
  add column weight_contributions_count int not null default 0;

create function public.update_weight_contribution_count()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if TG_OP = 'INSERT' then
    update public.user_profiles set weight_contributions_count = weight_contributions_count + 1 where user_id = new.user_id;
  elsif TG_OP = 'DELETE' then
    update public.user_profiles set weight_contributions_count = greatest(weight_contributions_count - 1, 0) where user_id = old.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger update_weight_contribution_count
  after insert or delete on public.catalog_weight_submissions
  for each row execute function public.update_weight_contribution_count();

-- Which catalog product a gear item was matched to at creation, if any.
-- Persisted (not re-derived from suggestions, which deliberately don't
-- reappear once editing an existing item) so a later weight EDIT can still
-- update the submission -- the link has to survive past the moment
-- applySuggestion() ran.
alter table public.gear_items
  add column catalog_product_id uuid references public.catalog_products (id) on delete set null;
