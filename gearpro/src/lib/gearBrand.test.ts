import {
  addTypedGearLabel,
  CANONICAL_BRANDS,
  mergeBrandList,
  planTypedGear,
  splitKnownBrand,
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
