import {
  GEAR_DATE_MESSAGE,
  GEAR_REQUIRED_MESSAGE,
  GEAR_WEIGHT_MESSAGE,
  resolveWeightLb,
  splitWeight,
  validateGearDraft,
  weightFieldsFromCatalog,
} from './gearForm';

const draft = {
  brand: 'KUIU',
  name: 'Super Down',
  weightLb: '',
  weightOz: '',
  quantity: '1',
  expiration: '',
};

describe('validateGearDraft', () => {
  it('saves a blank weight as 0', () => {
    const result = validateGearDraft(draft);
    expect(result).toEqual({ ok: true, value: { weightLb: 0, quantity: 1 } });
  });

  it('saves an explicit 0 as 0', () => {
    const result = validateGearDraft({ ...draft, weightLb: '0', weightOz: '0' });
    expect(result).toEqual({ ok: true, value: { weightLb: 0, quantity: 1 } });
  });

  it('combines pounds and ounces', () => {
    const result = validateGearDraft({ ...draft, weightLb: '1', weightOz: '8' });
    expect(result).toEqual({ ok: true, value: { weightLb: 1.5, quantity: 1 } });
  });

  it('keeps requiring a brand, a name, and a quantity of at least 1', () => {
    expect(validateGearDraft({ ...draft, brand: '  ' }).ok).toBe(false);
    expect(validateGearDraft({ ...draft, name: '' })).toEqual({ ok: false, error: GEAR_REQUIRED_MESSAGE });
    expect(validateGearDraft({ ...draft, quantity: '0' })).toEqual({ ok: false, error: GEAR_REQUIRED_MESSAGE });
    expect(validateGearDraft({ ...draft, quantity: '-2' })).toEqual({ ok: false, error: GEAR_REQUIRED_MESSAGE });
  });

  it('rejects a weight that is not a number', () => {
    expect(validateGearDraft({ ...draft, weightLb: 'heavy' })).toEqual({
      ok: false,
      error: GEAR_WEIGHT_MESSAGE,
    });
    expect(resolveWeightLb('-1', '')).toBe('invalid');
  });

  it('still checks the expiration date', () => {
    expect(validateGearDraft({ ...draft, expiration: 'next fall' })).toEqual({
      ok: false,
      error: GEAR_DATE_MESSAGE,
    });
    expect(validateGearDraft({ ...draft, expiration: '2026-12-31' })).toEqual({
      ok: true,
      value: { weightLb: 0, quantity: 1 },
    });
  });
});

describe('weightFieldsFromCatalog', () => {
  it('prefills a suggestion that carries a weight', () => {
    expect(weightFieldsFromCatalog(2.25)).toEqual({ weightLb: '2', weightOz: '4' });
  });

  it('leaves the form alone when the suggestion has no weight', () => {
    expect(weightFieldsFromCatalog(null)).toBeNull();
    expect(weightFieldsFromCatalog(undefined)).toBeNull();
    expect(weightFieldsFromCatalog(0)).toBeNull();
  });

  it('round-trips a split weight back to the same pounds', () => {
    const fields = splitWeight(0.5);
    expect(fields).toEqual({ weightLb: '', weightOz: '8' });
    expect(resolveWeightLb(fields.weightLb, fields.weightOz)).toBe(0.5);
  });

  it('shows a zero stored weight as blank fields', () => {
    expect(splitWeight(0)).toEqual({ weightLb: '', weightOz: '' });
  });
});
