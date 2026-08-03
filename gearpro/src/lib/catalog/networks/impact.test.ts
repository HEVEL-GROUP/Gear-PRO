// Sample feed content is synthetic (a best-effort approximation of Impact's
// per-Campaign catalog feed shape), not scraped from a real Impact account
// -- see impact.ts's module comment for why, and for the caveat that the
// column names here are unverified against Impact's live spec.

import { parseImpactFeed, syncImpactFeed } from './impact';
import { createFakeCatalogSupabase } from '../fakeCatalogSupabase';

const SAMPLE_FEED = [
  'CampaignId,CampaignName,CatalogItemId,Sku,Manufacturer,Name,Category,SubCategory,Description,Price,Msrp,ImageUrl,TrackingUrl,LandingPageUrl,Availability',
  '77021,Sitka Gear,SG-40191,SITKA-40191,Sitka,Timberline Jacket,Clothing,Insulation,"Synthetic sample row -- not a real listing.",329.00,329.00,https://example.com/img/sitka-timberline.jpg,https://impact.example.com/track?cid=77021&item=SG-40191,https://example.com/p/SG-40191,In Stock',
  '77021,Sitka Gear,SG-40192,SITKA-40192,Sitka,Core Merino 330 Hoody,Clothing,Base Layer,"Synthetic sample row -- not a real listing.",125.00,125.00,https://example.com/img/sitka-core-hoody.jpg,https://impact.example.com/track?cid=77021&item=SG-40192,https://example.com/p/SG-40192,Out of Stock',
  '81410,First Lite,FL-1102,FIRSTLITE-1102,First Lite,Klamath Puffy Jacket,Clothing,Insulation,"Synthetic sample row -- not a real listing.",279.00,299.00,https://example.com/img/firstlite-klamath.jpg,https://impact.example.com/track?cid=81410&item=FL-1102,https://example.com/p/FL-1102,In Stock',
].join('\n');

describe('parseImpactFeed', () => {
  it('maps CampaignId/CampaignName to merchant fields and CatalogItemId to product id', () => {
    const { rows, skipped } = parseImpactFeed(SAMPLE_FEED);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(3);

    const jacket = rows.find((r) => r.externalProductId === 'SG-40191');
    expect(jacket).toMatchObject({
      merchantExternalId: '77021',
      merchantName: 'Sitka Gear',
      brand: 'Sitka',
      name: 'Timberline Jacket',
      priceCents: 32900,
      retailPriceCents: 32900,
      availability: 'in_stock',
    });
  });

  it('normalizes the spelled-out Availability column ("In Stock" / "Out of Stock")', () => {
    const { rows } = parseImpactFeed(SAMPLE_FEED);
    expect(rows.find((r) => r.externalProductId === 'SG-40191')?.availability).toBe('in_stock');
    expect(rows.find((r) => r.externalProductId === 'SG-40192')?.availability).toBe('out_of_stock');
  });
});

describe('syncImpactFeed', () => {
  it('tags upserted merchants with network "impact" and keeps each Campaign separate', async () => {
    const { client, tables } = createFakeCatalogSupabase();
    const result = await syncImpactFeed(client, SAMPLE_FEED);

    expect(result.merchantsUpserted).toBe(2); // Sitka Gear, First Lite
    expect(result.productsUpserted).toBe(3);
    expect([...tables.catalog_merchants.values()].every((m) => m.network === 'impact')).toBe(true);
  });
});
