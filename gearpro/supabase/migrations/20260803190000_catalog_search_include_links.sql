-- Adds product_url/affiliate_url to search results so a suggestion can link
-- straight to the real listing -- affiliate_url when the catalog has one
-- (the tracked link that's the whole point of Phase 2), falling back to the
-- plain product_url for rows without one (e.g. a manually-curated merchant
-- with no affiliate program yet).
--
-- Return-type change means create-or-replace isn't enough (Postgres refuses
-- to change an existing function's return columns in place) -- drop first.
drop function if exists public.search_catalog_products(text, int);

create function public.search_catalog_products(query text, match_limit int default 8)
returns table (
  id uuid, brand text, name text, category text, weight_lb numeric,
  product_url text, affiliate_url text, score real
)
language sql stable
set search_path = 'public, extensions'
as $$
  select
    cp.id, cp.brand, cp.name, cp.category, cp.weight_lb,
    cp.product_url, cp.affiliate_url,
    extensions.similarity(query, trim(cp.brand || ' ' || cp.name)) as score
  from public.catalog_products cp
  where extensions.similarity(query, trim(cp.brand || ' ' || cp.name)) > 0.1
  order by score desc
  limit match_limit;
$$;

grant execute on function public.search_catalog_products(text, int) to anon, authenticated;
