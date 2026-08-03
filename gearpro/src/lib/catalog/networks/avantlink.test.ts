// Sample feed content is synthetic (hand-written to match AvantLink's
// documented column shape), not scraped from a real AvantLink account --
// see avantlink.ts's module comment for why.

import { parseAvantlinkFeed, syncAvantlinkFeed } from './avantlink';
import { createFakeCatalogSupabase } from '../fakeCatalogSupabase';

const SAMPLE_FEED = [
  'Merchant Id,Merchant Name,Id,Sku,Manufacturer,Product Name,Category,Subcategory,Description,Price,Retail Price,Image URL,Buy URL,Product URL,In Stock',
  '10423,REI,55019213,REI-55019213,REI Co-op,Trailmade 2 Person Tent,Camp,Tents,"Synthetic sample row -- not a real listing.",219.00,249.00,https://example.com/img/trailmade-2.jpg,https://www.avantlink.com/click.php?mid=10423&url=p/55019213,https://example.com/p/55019213,1',
  '10423,REI,55019214,REI-55019214,REI Co-op,Flash 55 Backpack,Packs,Backpacking Packs,"Synthetic sample row -- not a real listing.",199.00,219.00,https://example.com/img/flash-55.jpg,https://www.avantlink.com/click.php?mid=10423&url=p/55019214,https://example.com/p/55019214,1',
  '55190,KUIU,KU-7211-XL,KUIU-7211-XL,KUIU,Super Down Pro Jacket,Clothing,Insulation,"Synthetic sample row -- not a real listing.",449.00,449.00,https://example.com/img/kuiu-down-pro.jpg,https://www.avantlink.com/click.php?mid=55190&url=p/KU-7211-XL,https://example.com/p/KU-7211-XL,0',
].join('\n');

describe('parseAvantlinkFeed', () => {
  it('maps AvantLink column names to the normalized shape', () => {
    const { rows, skipped } = parseAvantlinkFeed(SAMPLE_FEED);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(3);

    const tent = rows.find((r) => r.externalProductId === '55019213');
    expect(tent).toMatchObject({
      merchantExternalId: '10423',
      merchantName: 'REI',
      brand: 'REI Co-op',
      name: 'Trailmade 2 Person Tent',
      category: 'Camp',
      priceCents: 21900,
      retailPriceCents: 24900,
      availability: 'in_stock',
    });
  });

  it('maps the bare 0/1 In Stock column to availability', () => {
    const { rows } = parseAvantlinkFeed(SAMPLE_FEED);
    const jacket = rows.find((r) => r.externalProductId === 'KU-7211-XL');
    expect(jacket?.availability).toBe('out_of_stock');
  });
});

describe('syncAvantlinkFeed', () => {
  it('tags upserted merchants with network "avantlink"', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    const result = await syncAvantlinkFeed(client, SAMPLE_FEED);

    expect(result.merchantsUpserted).toBe(2); // REI, KUIU
    expect(result.productsUpserted).toBe(3);
    expect([...tables.catalog_merchants.values()].every((m) => m.network === 'avantlink')).toBe(true);
  });
});
