import { type CatalogSupabase, type CatalogSyncResult, syncCatalogFromParsedFeed } from '../syncCatalog';
import { type HeaderAliasMap, type ParsedFeed, parseMerchantFeed } from '../feedParser';

// Impact product catalog feed column mapping. Impact scopes a feed per
// "Campaign" (their term for an individual advertiser/brand relationship
// you're enrolled in) rather than per raw merchant id, so CampaignId/
// CampaignName fill the merchant-id/merchant-name slots here.
//
// Built and verified against a hand-written sample (see the test file), not
// a live Impact account -- same reasoning as AvantLink's wrapper. Column
// names are a best-effort approximation of Impact's real spec, not a
// verified copy of it; treat this as the shape to correct against a real
// feed sample once approved, not as confirmed documentation.
const IMPACT_ALIASES: HeaderAliasMap = {
  merchantExternalId: ['campaignid'],
  merchantName: ['campaignname'],
  externalProductId: ['catalogitemid'],
  sku: ['sku'],
  brand: ['manufacturer', 'brand'],
  name: ['name'],
  category: ['category'],
  subcategory: ['subcategory'],
  description: ['description'],
  price: ['price'],
  retailPrice: ['msrp'],
  imageUrl: ['imageurl'],
  affiliateUrl: ['trackingurl'],
  productUrl: ['landingpageurl'],
  inStock: ['availability'],
};

export function parseImpactFeed(csvText: string): ParsedFeed {
  return parseMerchantFeed(csvText, IMPACT_ALIASES);
}

export function syncImpactFeed(supabase: CatalogSupabase, csvText: string): Promise<CatalogSyncResult> {
  return syncCatalogFromParsedFeed(supabase, 'impact', parseImpactFeed(csvText));
}
