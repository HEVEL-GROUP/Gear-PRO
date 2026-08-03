// Sample feed content is synthetic (a best-effort approximation of
// Pepperjam's documented snake_case product feed spec), not scraped from a
// real Pepperjam account -- see pepperjam.ts's module comment for why.

import { parsePepperjamFeed, syncPepperjamFeed } from './pepperjam';
import { createFakeCatalogSupabase } from '../fakeCatalogSupabase';

const SAMPLE_FEED = [
  'adv_id,adv_name,id,sku,manufacturer,name,category,subcategory,description,price,retail_price,image_url,buy_url,url,in_stock',
  '55190,KUIU,KU-7211-XL,KUIU-7211-XL,KUIU,Super Down Pro Jacket,Clothing,Insulation,"Synthetic sample row -- not a real listing.",449.00,449.00,https://example.com/img/kuiu-down-pro.jpg,https://www.pepperjam.com/click?adv=55190&sku=KU-7211-XL,https://example.com/p/KU-7211-XL,1',
  '55190,KUIU,KU-0091,KUIU-0091,KUIU,Pro Rain Jacket,Clothing,Rain Shell,,159.00,,https://example.com/img/kuiu-pro-rain.jpg,https://www.pepperjam.com/click?adv=55190&sku=KU-0091,https://example.com/p/KU-0091,1',
].join('\n');

describe('parsePepperjamFeed', () => {
  it('maps adv_id/adv_name to merchant fields despite the snake_case spelling', () => {
    const { rows, skipped } = parsePepperjamFeed(SAMPLE_FEED);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(2);

    const jacket = rows.find((r) => r.externalProductId === 'KU-7211-XL');
    expect(jacket).toMatchObject({
      merchantExternalId: '55190',
      merchantName: 'KUIU',
      brand: 'KUIU',
      name: 'Super Down Pro Jacket',
      priceCents: 44900,
      availability: 'in_stock',
    });
  });

  it('leaves description/retail price undefined when the feed leaves the column blank', () => {
    const { rows } = parsePepperjamFeed(SAMPLE_FEED);
    const rainJacket = rows.find((r) => r.externalProductId === 'KU-0091');
    expect(rainJacket?.description).toBeUndefined();
    expect(rainJacket?.retailPriceCents).toBeUndefined();
  });
});

describe('syncPepperjamFeed', () => {
  it('tags upserted merchants with network "pepperjam"', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    const result = await syncPepperjamFeed(client, SAMPLE_FEED);

    expect(result.merchantsUpserted).toBe(1); // KUIU
    expect(result.productsUpserted).toBe(2);
    expect([...tables.catalog_merchants.values()][0].network).toBe('pepperjam');
  });
});
