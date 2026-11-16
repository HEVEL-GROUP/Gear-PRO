import { catalogSuggestionsFromRows, meetsCatalogScore } from './catalogScore';

describe('catalog score cutoff', () => {
  it('hides a 0.105 false match and keeps a real one', () => {
    expect(meetsCatalogScore(0.105)).toBe(false);
    expect(meetsCatalogScore(0.15)).toBe(true);
    expect(meetsCatalogScore(0.1)).toBe(false);
    const rows = catalogSuggestionsFromRows([
      { id: 'sitka', brand: 'Sitka', name: 'Timberline Jacket', category: 'clothing', weight_lb: null, score: 0.105 },
      { id: 'kuiu', brand: 'KUIU', name: 'Pro Rain Jacket', category: 'clothing', weight_lb: 1.2, score: 0.42 },
    ]);
    expect(rows.map((row) => row.name)).toEqual(['Pro Rain Jacket']);
    expect(rows[0].weightLb).toBe(1.2);
  });
});
