import { type CatalogSupabase, type CatalogSyncResult, syncCatalogFromParsedFeed } from '../syncCatalog';
import { type HeaderAliasMap, type ParsedFeed, parseMerchantFeed } from '../feedParser';

// AvantLink product datafeed column mapping. Built and verified against a
// hand-written sample (see the test file), not a live AvantLink account --
// applying pre-traffic risks a recorded rejection (see the growth plan), so
// this proves the pipeline correct now and swaps in the live feed's real
// column names later. If the live feed's headers differ, that's a one-line
// alias addition below, not a rewrite.
const AVANTLINK_ALIASES: HeaderAliasMap = {
  merchantExternalId: ['merchantid'],
  merchantName: ['merchantname'],
  externalProductId: ['id', 'productid'],
  sku: ['sku'],
  brand: ['manufacturer', 'brand'],
  name: ['productname', 'name'],
  category: ['category'],
  subcategory: ['subcategory'],
  description: ['description'],
  price: ['price'],
  retailPrice: ['retailprice'],
  imageUrl: ['imageurl'],
  affiliateUrl: ['buyurl'],
  productUrl: ['producturl'],
  inStock: ['instock'],
};

export function parseAvantlinkFeed(csvText: string): ParsedFeed {
  return parseMerchantFeed(csvText, AVANTLINK_ALIASES);
}

export function syncAvantlinkFeed(supabase: CatalogSupabase, csvText: string): Promise<CatalogSyncResult> {
  return syncCatalogFromParsedFeed(supabase, 'avantlink', parseAvantlinkFeed(csvText));
}
