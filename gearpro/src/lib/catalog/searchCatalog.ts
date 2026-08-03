import { supabase } from '@/lib/supabase/client';

// Powers the "Add gear" autocomplete: as the user types a brand and/or item
// name, suggest real catalog products so the form can be filled from a
// known product instead of typed by hand. Read-only against
// catalog_products via the search_catalog_products() function (RLS already
// allows anon/authenticated SELECT on the table itself -- see the
// product_catalog migration -- and EXECUTE on the function mirrors that same
// public-read posture), so this needs no auth check of its own.
//
// Ranked by trigram similarity (search_catalog_products, see the
// catalog_fuzzy_search migration) against `brand + ' ' + name`, not plain
// ILIKE substring matching. Substring matching had no concept of relevance:
// a bare brand match surfaced every product from that brand as an
// equally-weighted "match" regardless of whether the item name had anything
// to do with it, and a one-character brand ("Q") matched any product name
// containing that letter. Trigram scoring fixes both -- verified against
// real production gear data (a 119-item library): unrelated real item names
// scored 0.000-0.065, genuine matches scored 0.12+.

export type CatalogSuggestion = {
  id: string;
  brand: string;
  name: string;
  category: string;
  weightLb: number | null;
};

// Below this length there's rarely enough signal in the typed text to beat
// the similarity threshold anyway, and it's not worth a round-trip to find
// that out server-side.
export const MIN_QUERY_LENGTH = 2;

export async function searchCatalogProducts(query: string, limit = 8): Promise<CatalogSuggestion[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const { data, error } = await supabase.rpc('search_catalog_products', { query: q, match_limit: limit });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    brand: (r.brand as string) ?? '',
    name: r.name as string,
    category: r.category as string,
    weightLb: (r.weight_lb as number | null) ?? null,
  }));
}
