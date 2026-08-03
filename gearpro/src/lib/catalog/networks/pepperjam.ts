import { type CatalogSupabase, type CatalogSyncResult, syncCatalogFromParsedFeed } from '../syncCatalog';
import { type HeaderAliasMap, type ParsedFeed, parseMerchantFeed } from '../feedParser';

// Pepperjam (Ascend Media) product feed column mapping. Pepperjam's spec
// uses lowercase snake_case headers (adv_id, buy_url, ...) rather than
// AvantLink/Impact's CamelCase -- normalizeHeader in feedParser.ts strips
// case and punctuation before matching, so that's a non-issue here, but the
// distinct naming convention is deliberately kept in this fixture/mapping
// (rather than reusing AvantLink's) to prove the alias approach actually
// generalizes across networks, not just across AvantLink's own column
// variants.
//
// Built and verified against a hand-written sample (see the test file), not
// a live Pepperjam account -- same reasoning as the other two wrappers.
// KUIU (per the growth plan) is a Pepperjam merchant with stricter terms
// (no paid search on trademarks, no direct linking, approved creatives
// only) -- that's a program-terms constraint on how affiliate_url gets
// used in the app, not something this ingestion layer needs to enforce.
//
// Note: Pepperjam's real spec may carry both `price` and `sale_price`
// (list vs. currently-discounted), which would need a coalesce-sale-price-
// over-price step here once a real feed sample confirms that split. This
// mapping treats `price`/`retail_price` as the direct current/list pair,
// matching the other two networks, until that's verified either way.
// Alias entries are matched against ALREADY-normalized headers (lowercased,
// punctuation stripped -- see feedParser.ts's normalizeHeader), so a raw
// "adv_id"/"buy_url" column is looked up here as "advid"/"buyurl", not with
// its underscore intact.
const PEPPERJAM_ALIASES: HeaderAliasMap = {
  merchantExternalId: ['advid'],
  merchantName: ['advname'],
  externalProductId: ['id'],
  sku: ['sku'],
  brand: ['manufacturer', 'brand'],
  name: ['name'],
  category: ['category'],
  subcategory: ['subcategory'],
  description: ['description'],
  price: ['price'],
  retailPrice: ['retailprice'],
  imageUrl: ['imageurl'],
  affiliateUrl: ['buyurl'],
  productUrl: ['url'],
  inStock: ['instock'],
};

export function parsePepperjamFeed(csvText: string): ParsedFeed {
  return parseMerchantFeed(csvText, PEPPERJAM_ALIASES);
}

export function syncPepperjamFeed(supabase: CatalogSupabase, csvText: string): Promise<CatalogSyncResult> {
  return syncCatalogFromParsedFeed(supabase, 'pepperjam', parsePepperjamFeed(csvText));
}
