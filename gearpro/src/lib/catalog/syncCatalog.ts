import type { ParsedFeed } from './feedParser';

// Generic catalog_merchants/catalog_products upsert, shared by every
// network's wrapper (./networks/*). This half of the pipeline doesn't care
// which network a row came from or how it was parsed -- only that it
// already has the normalized ParsedCatalogRow shape and a `network` tag to
// upsert catalog_merchants under.

export type CatalogNetwork = 'avantlink' | 'impact' | 'pepperjam';

// Thin slice of the supabase-js client this module actually calls -- lets
// tests pass a purpose-built fake without pulling in the real SDK's types.
// PromiseLike (not Promise) on the upsert builder because that's genuinely
// all supabase-js's query builders guarantee -- they're thenable, not
// literal Promise instances -- and it's the easier shape for a fake to
// satisfy structurally.
type UpsertBuilder = PromiseLike<{ error: { message: string } | null }> & {
  select(cols: string): Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
};

export type CatalogSupabase = {
  from(table: 'catalog_merchants' | 'catalog_products'): {
    upsert(rows: Record<string, unknown>[], opts: { onConflict: string }): UpsertBuilder;
  };
};

export type CatalogSyncResult = {
  merchantsUpserted: number;
  productsUpserted: number;
  skipped: ParsedFeed['skipped'];
};

// Upserts merchants first and reads back their generated ids, since products
// reference merchants by internal uuid -- not by the feed's own merchant id.
// Both upserts key off natural feed identifiers (network + external merchant
// id; merchant_id + external product id), so re-running this against the
// same feed updates existing rows in place instead of duplicating them.
export async function syncCatalogFromParsedFeed(
  supabase: CatalogSupabase,
  network: CatalogNetwork,
  feed: ParsedFeed,
): Promise<CatalogSyncResult> {
  const { rows, skipped } = feed;

  const merchantNameByExternalId = new Map<string, string>();
  for (const r of rows) {
    if (!merchantNameByExternalId.has(r.merchantExternalId)) {
      merchantNameByExternalId.set(r.merchantExternalId, r.merchantName);
    }
  }

  const merchantIdByExternalId = new Map<string, string>();
  if (merchantNameByExternalId.size > 0) {
    const merchantRows = [...merchantNameByExternalId.entries()].map(([external_merchant_id, name]) => ({
      network,
      external_merchant_id,
      name,
    }));
    const { data, error } = await supabase
      .from('catalog_merchants')
      .upsert(merchantRows, { onConflict: 'network,external_merchant_id' })
      .select('id, external_merchant_id');
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      merchantIdByExternalId.set(row.external_merchant_id as string, row.id as string);
    }
  }

  const productRows = rows
    .map((r) => ({
      merchant_id: merchantIdByExternalId.get(r.merchantExternalId),
      external_product_id: r.externalProductId,
      sku: r.sku ?? null,
      brand: r.brand,
      name: r.name,
      category: r.category,
      subcategory: r.subcategory ?? null,
      description: r.description ?? null,
      price_cents: r.priceCents ?? null,
      retail_price_cents: r.retailPriceCents ?? null,
      image_url: r.imageUrl ?? null,
      affiliate_url: r.affiliateUrl ?? null,
      product_url: r.productUrl ?? null,
      availability: r.availability ?? null,
      last_synced_at: new Date().toISOString(),
    }))
    // A row whose merchant upsert didn't come back (write failure, or the
    // merchant batch was empty) has no merchant_id to attach to -- drop it
    // rather than write a product that silently belongs to nothing.
    .filter((r): r is typeof r & { merchant_id: string } => Boolean(r.merchant_id));

  if (productRows.length > 0) {
    const { error } = await supabase
      .from('catalog_products')
      .upsert(productRows, { onConflict: 'merchant_id,external_product_id' });
    if (error) throw new Error(error.message);
  }

  return { merchantsUpserted: merchantNameByExternalId.size, productsUpserted: productRows.length, skipped };
}
