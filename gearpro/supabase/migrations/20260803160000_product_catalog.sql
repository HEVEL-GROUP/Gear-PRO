-- Normalized product catalog: the shared asset behind two Phase-2 moves --
-- affiliate links (a merchant's product carries its own affiliate_url) and
-- brand-catalog autocomplete when adding gear (brand/name/category/weight
-- pre-filled from a real product instead of typed by hand). Same rows serve
-- both, so this is built once rather than twice.
--
-- Source-agnostic by design: `network` on catalog_merchants lets this hold
-- products fed by any of the three affiliate networks the growth plan
-- targets (AvantLink, Impact, Pepperjam -- REI/onX, Impact-network brands,
-- and KUIU respectively) alongside hand-curated ones (a manually-entered
-- merchant with no live feed), without a schema change later.
--
-- Read-only from the client's point of view. Nothing here is user data, so
-- there's no per-row owner and no per-user RLS -- anon/authenticated get a
-- blanket SELECT, and only service_role (the ingestion job) can write. That
-- mirrors how the rest of this schema treats backend-managed tables: writes
-- happen through a trusted server context, not through client policies.

create table public.catalog_merchants (
  id uuid primary key default gen_random_uuid(),
  network text not null default 'manual' check (network in ('avantlink', 'impact', 'pepperjam', 'manual')),
  external_merchant_id text,
  name text not null,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per real-world merchant per network -- lets the ingestion job
  -- upsert on (network, external_merchant_id) without creating duplicates
  -- on every re-sync, while `manual` rows (external_merchant_id null) are
  -- exempt since a null never equals another null under a unique constraint.
  unique (network, external_merchant_id)
);

create table public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.catalog_merchants (id) on delete cascade,
  external_product_id text not null,
  sku text,
  brand text not null default '',
  name text not null,
  category text not null default 'Other',
  subcategory text,
  description text,
  -- Money as integer cents, never float -- avoids the classic rounding-drift
  -- bug when a feed's price gets displayed, summed, or diffed later.
  price_cents integer,
  retail_price_cents integer,
  currency text not null default 'USD',
  -- Populated for the minority of feed rows that carry it, or backfilled by
  -- hand-curation -- most merchant feeds have no weight column at all, so
  -- this stays nullable rather than defaulting to 0 (0 would read as "empty
  -- item" everywhere the app already treats weight_lb <= 0 as invalid, e.g.
  -- importGear.ts's own-weight validation).
  weight_lb numeric,
  image_url text,
  product_url text,
  affiliate_url text,
  availability text,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The ingestion upsert key: a feed re-sync sends the same
  -- (merchant_id, external_product_id) for a product that already exists
  -- and should update it in place, not duplicate it.
  unique (merchant_id, external_product_id)
);

create index catalog_products_merchant_id_idx on public.catalog_products (merchant_id);
create index catalog_products_brand_idx on public.catalog_products (lower(brand));
create index catalog_products_category_idx on public.catalog_products (category);

create trigger set_updated_at
  before update on public.catalog_merchants
  for each row execute function public.set_updated_at();

create trigger set_updated_at
  before update on public.catalog_products
  for each row execute function public.set_updated_at();

alter table public.catalog_merchants enable row level security;
alter table public.catalog_products enable row level security;

-- Public reference data: anyone (including signed-out visitors on a public
-- shareable gear list) can read it. No insert/update/delete policy is
-- defined for anon/authenticated, so those remain outright denied by RLS's
-- default-deny -- only service_role (used by the feed-ingestion job, which
-- bypasses RLS entirely) can write.
create policy catalog_merchants_select on public.catalog_merchants
  for select to anon, authenticated using (true);

create policy catalog_products_select on public.catalog_products
  for select to anon, authenticated using (true);
