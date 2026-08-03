// Tests the generic engine only -- network-specific column mapping is
// covered per network in ./networks/*.test.ts. Uses a minimal, made-up
// alias map so these assertions can't accidentally pass because they
// happen to match one particular network's spelling.

import { type HeaderAliasMap, parseMerchantFeed } from './feedParser';

const ALIASES: HeaderAliasMap = {
  merchantExternalId: ['mid'],
  merchantName: ['mname'],
  externalProductId: ['pid'],
  sku: ['sku'],
  brand: ['brand'],
  name: ['name'],
  category: ['category'],
  subcategory: ['subcategory'],
  description: ['description'],
  price: ['price'],
  retailPrice: ['retail'],
  imageUrl: ['image'],
  affiliateUrl: ['affurl'],
  productUrl: ['purl'],
  inStock: ['stock'],
};

function feed(rows: string[]): string {
  return ['mid,mname,pid,brand,name,category,price,retail,stock', ...rows].join('\n');
}

describe('parseMerchantFeed', () => {
  it('parses a well-formed row', () => {
    const { rows, skipped } = parseMerchantFeed(feed(['1,Acme,P1,Acme,Widget,Tools,19.99,24.99,1']), ALIASES);
    expect(skipped).toEqual([]);
    expect(rows).toEqual([
      {
        merchantExternalId: '1',
        merchantName: 'Acme',
        externalProductId: 'P1',
        sku: undefined,
        brand: 'Acme',
        name: 'Widget',
        category: 'Tools',
        subcategory: undefined,
        description: undefined,
        priceCents: 1999,
        retailPriceCents: 2499,
        imageUrl: undefined,
        affiliateUrl: undefined,
        productUrl: undefined,
        availability: 'in_stock',
      },
    ]);
  });

  it('defaults category to Other when the column is blank', () => {
    const { rows } = parseMerchantFeed(feed(['1,Acme,P1,Acme,Widget,,19.99,,']), ALIASES);
    expect(rows[0].category).toBe('Other');
  });

  it('skips rows missing merchant id, merchant name, product id, or name -- in that check order', () => {
    const csv = [
      'mid,mname,pid,brand,name,category,price,retail,stock',
      ',Acme,P1,Acme,Widget,Tools,19.99,,1', // missing merchant id
      '1,,P1,Acme,Widget,Tools,19.99,,1', // missing merchant name
      '1,Acme,,Acme,Widget,Tools,19.99,,1', // missing product id
      '1,Acme,P1,Acme,,Tools,19.99,,1', // missing name
    ].join('\n');

    const { rows, skipped } = parseMerchantFeed(csv, ALIASES);
    expect(rows).toEqual([]);
    expect(skipped).toEqual([
      { row: 2, reason: 'missing merchant id' },
      { row: 3, reason: 'missing merchant name' },
      { row: 4, reason: 'missing product id' },
      { row: 5, reason: 'missing product name' },
    ]);
  });

  it('normalizes several spellings of out-of-stock, and leaves availability undefined when the column is absent', () => {
    const csv = [
      'mid,mname,pid,brand,name,category,price,retail,stock',
      '1,Acme,P1,Acme,A,Tools,10,,0',
      '1,Acme,P2,Acme,B,Tools,10,,false',
      '1,Acme,P3,Acme,C,Tools,10,,Out of Stock',
      '1,Acme,P4,Acme,D,Tools,10,,1',
      '1,Acme,P5,Acme,E,Tools,10,,',
    ].join('\n');

    const { rows } = parseMerchantFeed(csv, ALIASES);
    expect(rows.map((r) => r.availability)).toEqual(['out_of_stock', 'out_of_stock', 'out_of_stock', 'in_stock', undefined]);
  });

  it('rounds fractional cents rather than truncating', () => {
    const { rows } = parseMerchantFeed(feed(['1,Acme,P1,Acme,Widget,Tools,19.999,,1']), ALIASES);
    expect(rows[0].priceCents).toBe(2000);
  });

  it('returns no rows for an empty feed', () => {
    expect(parseMerchantFeed('', ALIASES)).toEqual({ rows: [], skipped: [] });
  });
});
