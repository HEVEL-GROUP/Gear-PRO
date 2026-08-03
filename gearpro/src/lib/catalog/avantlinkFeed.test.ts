// Built and tested against a hand-written sample feed (not real AvantLink
// access) so the ingestion pipeline exists and is proven correct before
// applying for the AvantLink account. Inlined rather than read from
// __fixtures__/avantlink-sample-feed.csv (kept in sync by hand) -- this
// project has no Node type/runtime setup for fs/path in tsconfig, and every
// other test in the codebase builds its fixture data inline rather than
// reading from disk.

import { parseAvantlinkFeed, syncCatalogFromAvantlinkFeed } from './avantlinkFeed';
import { createFakeCatalogSupabase } from './fakeCatalogSupabase';

const SAMPLE_FEED = [
  'Merchant Id,Merchant Name,Id,Sku,Manufacturer,Product Name,Category,Subcategory,Description,Price,Retail Price,Image URL,Buy URL,Product URL,In Stock,Last Updated',
  '10423,REI,55019213,REI-55019213,REI Co-op,Trailmade 2 Person Tent,Camp,Tents,"Synthetic sample row -- not a real listing.",219.00,249.00,https://example.com/img/trailmade-2.jpg,https://www.avantlink.com/click.php?mid=10423&url=p/55019213,https://example.com/p/55019213,1,2026-08-01',
  '10423,REI,55019214,REI-55019214,REI Co-op,Flash 55 Backpack,Packs,Backpacking Packs,"Synthetic sample row -- not a real listing.",199.00,219.00,https://example.com/img/flash-55.jpg,https://www.avantlink.com/click.php?mid=10423&url=p/55019214,https://example.com/p/55019214,1,2026-08-01',
  '10423,REI,55019215,REI-55019215,Stanley,Classic Vacuum Bottle 1QT,Cook,Hydration,"Synthetic sample row -- not a real listing.",44.95,49.95,https://example.com/img/stanley-1qt.jpg,https://www.avantlink.com/click.php?mid=10423&url=p/55019215,https://example.com/p/55019215,1,2026-08-01',
  '88471,onX,H-30291,ONX-H-30291,onX,Hunt Chip Membership (1yr),Digital,Mapping,"Synthetic sample row -- no image/weight, exercises the null-optional-field path.",29.99,29.99,,https://www.avantlink.com/click.php?mid=88471&url=p/H-30291,https://example.com/p/H-30291,1,2026-08-02',
  '55190,KUIU,KU-7211-XL,KUIU-7211-XL,KUIU,Super Down Pro Jacket,Clothing,Insulation,"Synthetic sample row -- not a real listing.",449.00,449.00,https://example.com/img/kuiu-down-pro.jpg,https://www.avantlink.com/click.php?mid=55190&url=p/KU-7211-XL,https://example.com/p/KU-7211-XL,0,2026-07-28',
  '55190,KUIU,KU-0091,KUIU-0091,KUIU,Pro Rain Jacket,Clothing,Rain Shell,,159.00,,https://example.com/img/kuiu-pro-rain.jpg,https://www.avantlink.com/click.php?mid=55190&url=p/KU-0091,https://example.com/p/KU-0091,1,2026-08-03',
].join('\n');

describe('parseAvantlinkFeed', () => {
  it('parses every well-formed row in the sample feed', () => {
    const { rows, skipped } = parseAvantlinkFeed(SAMPLE_FEED);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(6);
  });

  it('converts price strings to integer cents', () => {
    const { rows } = parseAvantlinkFeed(SAMPLE_FEED);
    const tent = rows.find((r) => r.externalProductId === '55019213');
    expect(tent?.priceCents).toBe(21900);
    expect(tent?.retailPriceCents).toBe(24900);
  });

  it('maps the In Stock column to availability', () => {
    const { rows } = parseAvantlinkFeed(SAMPLE_FEED);
    const inStock = rows.find((r) => r.externalProductId === '55019213');
    const outOfStock = rows.find((r) => r.externalProductId === 'KU-7211-XL');
    expect(inStock?.availability).toBe('in_stock');
    expect(outOfStock?.availability).toBe('out_of_stock');
  });

  it('leaves optional fields undefined rather than empty strings when the feed omits them', () => {
    const { rows } = parseAvantlinkFeed(SAMPLE_FEED);
    const digitalProduct = rows.find((r) => r.externalProductId === 'H-30291');
    expect(digitalProduct?.imageUrl).toBeUndefined();
    const noDescription = rows.find((r) => r.externalProductId === 'KU-0091');
    expect(noDescription?.description).toBeUndefined();
    expect(noDescription?.retailPriceCents).toBeUndefined();
  });

  it('skips rows missing a required field and reports why, without throwing', () => {
    const header = 'Merchant Id,Merchant Name,Id,Sku,Manufacturer,Product Name,Category,Price';
    const csv = [
      header,
      '10423,REI,55019213,REI-1,REI Co-op,Trailmade Tent,Camp,219.00', // valid
      ',REI,55019214,REI-2,REI Co-op,Flash Pack,Packs,199.00', // missing merchant id
      '10423,REI,,REI-3,REI Co-op,,Packs,199.00', // missing product id AND name
    ].join('\n');

    const { rows, skipped } = parseAvantlinkFeed(csv);
    expect(rows).toHaveLength(1);
    expect(skipped).toEqual([
      { row: 3, reason: 'missing merchant id' },
      { row: 4, reason: 'missing product id' },
    ]);
  });
});

describe('syncCatalogFromAvantlinkFeed', () => {
  it('upserts one merchant row per distinct merchant and one product row per feed row', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    const result = await syncCatalogFromAvantlinkFeed(client, SAMPLE_FEED);

    expect(result.merchantsUpserted).toBe(3); // REI, onX, KUIU
    expect(result.productsUpserted).toBe(6);
    expect(tables.catalog_merchants.size).toBe(3);
    expect(tables.catalog_products.size).toBe(6);
  });

  it('links every product to its merchant\'s generated id, not the feed\'s raw merchant id', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromAvantlinkFeed(client, SAMPLE_FEED);

    const reiMerchant = [...tables.catalog_merchants.values()].find((m) => m.external_merchant_id === '10423');
    const reiProducts = [...tables.catalog_products.values()].filter((p) => p.merchant_id === reiMerchant?.id);
    expect(reiProducts).toHaveLength(3);
  });

  it('re-syncing the same feed updates rows in place instead of duplicating them', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromAvantlinkFeed(client, SAMPLE_FEED);
    await syncCatalogFromAvantlinkFeed(client, SAMPLE_FEED);

    expect(tables.catalog_merchants.size).toBe(3);
    expect(tables.catalog_products.size).toBe(6);
  });

  it('picks up a changed price on re-sync as an update, not a new row', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    await syncCatalogFromAvantlinkFeed(client, SAMPLE_FEED);

    const priceDrop = SAMPLE_FEED.replace('219.00,249.00', '189.00,249.00');
    await syncCatalogFromAvantlinkFeed(client, priceDrop);

    expect(tables.catalog_products.size).toBe(6);
    const tent = [...tables.catalog_products.values()].find((p) => p.external_product_id === '55019213');
    expect(tent?.price_cents).toBe(18900);
  });
});
