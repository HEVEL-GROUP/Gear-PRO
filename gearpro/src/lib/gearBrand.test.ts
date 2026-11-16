import {
  addTypedGearLabel,
  CANONICAL_BRANDS,
  catalogQueryText,
  enterUsesTypedGear,
  footerUsesTypedGear,
  mergeBrandList,
  noCatalogMatchHint,
  planTypedGear,
  splitKnownBrand,
  typedGearSource,
} from './gearBrand';

const brands = ['Sitka', 'KUIU', 'Sea to Sumit', 'Seatosummit', 'MSR', ...CANONICAL_BRANDS];

describe('splitKnownBrand', () => {
  it('corrects Sea to Sumit and leaves the item name', () => {
    expect(splitKnownBrand('sea to sumit liner', brands)).toEqual({
      brand: 'Sea to Summit',
      name: 'liner',
      matched: true,
    });
  });

  it('matches a catalog brand at the start, ignoring case', () => {
    expect(splitKnownBrand('kuiu Super Down', brands)).toEqual({
      brand: 'KUIU',
      name: 'Super Down',
      matched: true,
    });
  });

  it('does not treat a junk brand as the prefix', () => {
    const split = splitKnownBrand('sea to sumit liner', brands);
    expect(split.brand).not.toBe('Sitka');
  });

  it('keeps the whole phrase as the name when nothing matches', () => {
    expect(splitKnownBrand('mystery doodad', ['Sitka'])).toEqual({
      brand: '',
      name: 'mystery doodad',
      matched: false,
    });
  });

  it('prefers the canonical spelling over a closer library typo', () => {
    const merged = mergeBrandList(['KUIU'], ['Sea to Sumit', 'Kuiu']);
    expect(merged).toEqual(expect.arrayContaining(['Sea to Summit', 'KUIU']));
    expect(merged).not.toEqual(expect.arrayContaining(['Kuiu']));
  });
});

describe('planTypedGear', () => {
  it('saves immediately when the brand and the name are both there', () => {
    expect(planTypedGear('sea to sumit liner', brands)).toEqual({
      kind: 'save',
      brand: 'Sea to Summit',
      name: 'liner',
    });
    expect(addTypedGearLabel('sea to sumit liner')).toBe('Add "sea to sumit liner" as new gear');
  });

  it('focuses the name when the text is only a brand', () => {
    expect(planTypedGear('Sea to Summit', brands)).toEqual({
      kind: 'focus',
      field: 'name',
      brand: 'Sea to Summit',
      name: '',
      hint: 'Add an item name.',
    });
  });

  it('focuses the brand when the text is not a known brand', () => {
    const plan = planTypedGear('liner', ['Sitka']);
    expect(plan.kind).toBe('focus');
    if (plan.kind === 'focus') {
      expect(plan.field).toBe('brand');
      expect(plan.name).toBe('liner');
    }
  });
});

const typed = 'sea to sumit sleeping bag liner';

describe('no catalog match hint', () => {
  it('points at the one-tap button under the hint, quoting the typed search', () => {
    expect(noCatalogMatchHint(typed)).toBe(
      'Not in the catalog yet. Tap Add "sea to sumit sleeping bag liner" below to save it.',
    );
    expect(addTypedGearLabel(typed)).toBe('Add "sea to sumit sleeping bag liner" as new gear');
    expect(noCatalogMatchHint(`  ${typed}  `)).toBe(noCatalogMatchHint(typed));
  });
});

describe('Enter saves typed gear', () => {
  it('uses the typed-gear path from search, brand, and name when there is text and nothing is selected', () => {
    const fields = { searchText: typed, brand: '', name: '' };
    for (const field of ['search', 'brand', 'name'] as const) {
      const text = typedGearSource(fields, field);
      expect(text).toBe(typed);
      expect(enterUsesTypedGear({ editing: false, catalogSelected: false, text })).toBe(true);
      expect(planTypedGear(text, brands)).toEqual({
        kind: 'save',
        brand: 'Sea to Summit',
        name: 'sleeping bag liner',
      });
    }
  });

  it('uses brand and name when those fields have text', () => {
    expect(typedGearSource({ searchText: typed, brand: 'KUIU', name: 'rain jacket' }, 'name')).toBe(
      'KUIU rain jacket',
    );
  });

  it('does not take the typed path when a catalog item is selected, the form is editing, or the text is blank', () => {
    expect(enterUsesTypedGear({ editing: false, catalogSelected: true, text: typed })).toBe(false);
    expect(enterUsesTypedGear({ editing: true, catalogSelected: false, text: typed })).toBe(false);
    expect(enterUsesTypedGear({ editing: false, catalogSelected: false, text: '   ' })).toBe(false);
  });
});

describe('footer Add to library', () => {
  it('saves the search text with the same split when brand and name are empty', () => {
    expect(
      footerUsesTypedGear({
        editing: false,
        catalogSelected: false,
        brand: '',
        name: '  ',
        searchText: typed,
      }),
    ).toBe(true);
    expect(catalogQueryText(typed, '', '')).toBe(typed);
    expect(planTypedGear(typed, brands)).toEqual({
      kind: 'save',
      brand: 'Sea to Summit',
      name: 'sleeping bag liner',
    });
  });

  it('leaves the footer on the form fields once brand or name is filled, or when there is no search text', () => {
    expect(
      footerUsesTypedGear({
        editing: false,
        catalogSelected: false,
        brand: '',
        name: 'liner',
        searchText: typed,
      }),
    ).toBe(false);
    expect(
      footerUsesTypedGear({
        editing: false,
        catalogSelected: false,
        brand: '',
        name: '',
        searchText: '  ',
      }),
    ).toBe(false);
    expect(
      footerUsesTypedGear({
        editing: false,
        catalogSelected: true,
        brand: '',
        name: '',
        searchText: typed,
      }),
    ).toBe(false);
  });
});
