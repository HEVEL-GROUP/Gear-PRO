// Loose trigram hits around 0.10 are not useful suggestions. 0.15 keeps a
// real product match and hides the junk just above the SQL function's 0.1 floor.
export const CATALOG_MIN_SCORE = 0.15;

export type ScoredCatalogSuggestion = {
  id: string;
  brand: string;
  name: string;
  category: string;
  weightLb: number | null;
  link: string | null;
};

export function meetsCatalogScore(score: number | null | undefined): boolean {
  return typeof score === 'number' && Number.isFinite(score) && score >= CATALOG_MIN_SCORE;
}

export function catalogSuggestionsFromRows(rows: Record<string, unknown>[]): ScoredCatalogSuggestion[] {
  return rows
    .map((r) => ({
      id: r.id as string,
      brand: (r.brand as string) ?? '',
      name: r.name as string,
      category: r.category as string,
      weightLb: (r.weight_lb as number | null) ?? null,
      link: (r.affiliate_url as string | null) ?? (r.product_url as string | null) ?? null,
      score: r.score as number | null | undefined,
    }))
    .filter((row) => meetsCatalogScore(row.score))
    .map((row) => ({
      id: row.id,
      brand: row.brand,
      name: row.name,
      category: row.category,
      weightLb: row.weightLb,
      link: row.link,
    }));
}
