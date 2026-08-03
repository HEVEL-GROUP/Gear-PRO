// Tests the generic upsert/dedup logic directly against hand-built
// ParsedFeed values -- it doesn't matter which network produced them, only
// that syncing twice doesn't duplicate rows and that a changed value
// updates in place. Network-specific parsing is covered in ./networks/*.

import type { ParsedFeed } from './feedParser';
import { createFakeCatalogSupabase } from './fakeCatalogSupabase';
import { syncCatalogFromParsedFeed } from './syncCatalog';

function feed(overrides: Partial<ParsedFeed['rows'][number]> = {}): ParsedFeed {
  return {
    rows: [
      {
        merchantExternalId: '10423',
        merchantName: 'REI',
        externalProductId: '55019213',
        brand: 'REI Co-op',
        name: 'Trailmade 2 Person Tent',
        category: 'Camp',
        priceCents: 21900,
        retailPriceCents: 24900,
        availability: 'in_stock',
        ...overrides,
      },
    ],
    skipped: [],
  };
}

describe('syncCatalogFromParsedFeed', () => {
  it('upserts one merchant and one product for a single-row feed', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    const result = await syncCatalogFromParsedFeed(client, 'avantlink', feed());

    expect(result).toEqual({ merchantsUpserted: 1, productsUpserted: 1, skipped: [] });
    expect(tables.catalog_merchants.size).toBe(1);
    expect(tables.catalog_products.size).toBe(1);
    const merchant = [...tables.catalog_merchants.values()][0];
    expect(merchant.network).toBe('avantlink');
    expect(merchant.external_merchant_id).toBe('10423');
  });

  it('links the product to the merchant\'s generated id, not the feed\'s raw merchant id', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromParsedFeed(client, 'avantlink', feed());

    const merchant = [...tables.catalog_merchants.values()][0];
    const product = [...tables.catalog_products.values()][0];
    expect(product.merchant_id).toBe(merchant.id);
    expect(product.merchant_id).not.toBe('10423');
  });

  it('re-syncing the same feed updates in place instead of duplicating', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromParsedFeed(client, 'avantlink', feed());
    await syncCatalogFromParsedFeed(client, 'avantlink', feed());

    expect(tables.catalog_merchants.size).toBe(1);
    expect(tables.catalog_products.size).toBe(1);
  });

  it('a changed price on re-sync updates the existing row, not a new one', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromParsedFeed(client, 'avantlink', feed());
    await syncCatalogFromParsedFeed(client, 'avantlink', feed({ priceCents: 18900 }));

    expect(tables.catalog_products.size).toBe(1);
    expect([...tables.catalog_products.values()][0].price_cents).toBe(18900);
  });

  it('keeps two networks reusing the same external merchant id from colliding', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromParsedFeed(client, 'avantlink', feed());
    await syncCatalogFromParsedFeed(client, 'impact', feed({ externalProductId: 'IMP-1' }));

    expect(tables.catalog_merchants.size).toBe(2);
    expect(tables.catalog_products.size).toBe(2);
  });

  it('propagates skipped rows from the feed through to the result untouched', async () => {
    const { client } = createFakeCatalogSupabase();
    const skipped = [{ row: 3, reason: 'missing product name' }];
    const result = await syncCatalogFromParsedFeed(client, 'avantlink', { rows: [], skipped });

    expect(result).toEqual({ merchantsUpserted: 0, productsUpserted: 0, skipped });
  });
});
