import { supabase } from '@/lib/supabase/client';

// Powers the "Add gear" autocomplete: as the user types a brand or item
// name, suggest real catalog products so the form can be filled from a
// known product instead of typed by hand. Read-only against catalog_products
// (RLS already allows anon/authenticated SELECT -- see the product_catalog
// migration), so this needs no auth check of its own.

export type CatalogSuggestion = {
  id: string;
  brand: string;
  name: string;
  category: string;
  weightLb: number | null;
};

// Below this length, ILIKE '%q%' has poor selectivity (near-matches
// everything) and isn't worth a round-trip -- the form should hold off
// searching until there's enough signal in what's typed.
export const MIN_QUERY_LENGTH = 2;

export async function searchCatalogProducts(query: string, limit = 8): Promise<CatalogSuggestion[]> {
  const q = query.trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  // Escape ILIKE wildcards a user might type literally so they're matched
  // as plain characters, not pattern syntax.
  const escaped = q.replace(/[%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from('catalog_products')
    .select('id, brand, name, category, weight_lb')
    .or(`name.ilike.%${escaped}%,brand.ilike.%${escaped}%`)
    .order('name')
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    brand: (r.brand as string) ?? '',
    name: r.name as string,
    category: r.category as string,
    weightLb: (r.weight_lb as number | null) ?? null,
  }));
}
