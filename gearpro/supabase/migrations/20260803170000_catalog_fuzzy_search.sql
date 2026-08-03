-- Replaces plain ILIKE substring matching with trigram similarity scoring.
--
-- The problem it fixes: ILIKE `%text%` has no concept of relevance. A bare
-- brand match (query "Bow Holster" typed against a KUIU item) was returning
-- EVERY product from that brand as an equally-weighted "match" even when the
-- product names have nothing to do with each other, and a one-character
-- brand ("Q") matched any product name containing that letter anywhere.
-- Verified empirically against the seeded demo catalog before picking the
-- threshold below: real gear names unrelated to any catalog product scored
-- 0.000-0.065 similarity; genuine matches (even loose ones, like a bare
-- brand name) scored 0.12+. 0.1 sits between those with margin on both
-- sides.
--
-- similarity() is already case-insensitive in this Postgres build (verified:
-- similarity('KUIU','kuiu') = 1), so no explicit lower() is needed here.
--
-- Matches against brand+name concatenated (not name and brand separately
-- weighted) so partial info narrows naturally: "KUIU" alone scores ~0.2-0.24
-- against both KUIU products (a loose brand-level signal), but "KUIU rain"
-- scores 0.48 against the actual rain jacket and drops the down jacket to
-- 0.16 -- more specific input sharpens the ranking instead of requiring a
-- separate code path for "brand query" vs "name query".
create extension if not exists pg_trgm with schema extensions;

-- Expression index on the same brand+name concatenation the function
-- compares against. Note: at the catalog's current size (single digits to
-- low hundreds of rows) a sequential scan computing similarity() per row is
-- plenty fast, and Postgres's planner won't actually use a GIN trgm index
-- for a raw `similarity(...) > threshold` predicate (that needs the `%`
-- operator, tied to the pg_trgm.similarity_threshold GUC, not an explicit
-- numeric cutoff) -- this index is here so the query has a path to scale
-- once the catalog is real feed data, not because it's load-bearing today.
create index catalog_products_search_trgm_idx
  on public.catalog_products
  using gin ((trim(brand || ' ' || name)) extensions.gin_trgm_ops);

create or replace function public.search_catalog_products(query text, match_limit int default 8)
returns table (id uuid, brand text, name text, category text, weight_lb numeric, score real)
language sql stable
set search_path = 'public, extensions'
as $$
  select
    cp.id, cp.brand, cp.name, cp.category, cp.weight_lb,
    extensions.similarity(query, trim(cp.brand || ' ' || cp.name)) as score
  from public.catalog_products cp
  where extensions.similarity(query, trim(cp.brand || ' ' || cp.name)) > 0.1
  order by score desc
  limit match_limit;
$$;

-- RLS on catalog_products already allows anon/authenticated SELECT (see the
-- product_catalog migration) -- this just extends the same public-read
-- posture to the function that wraps that same read.
grant execute on function public.search_catalog_products(text, int) to anon, authenticated;
