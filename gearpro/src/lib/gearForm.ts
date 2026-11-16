// Pure helpers for the Add/Edit gear sheet.
//
// gear_items.weight_lb is numeric NOT NULL DEFAULT 0 (no check that it be
// positive). A blank or zero weight is stored as 0, which is what the column
// already defaults to. Null would be rejected by the insert. Pack totals
// multiply weight by quantity, so 0 contributes nothing and stays finite.

export const GEAR_REQUIRED_MESSAGE = 'Add a brand, a name, and a quantity of at least 1.';
export const GEAR_WEIGHT_MESSAGE = 'Enter weight as a number, or leave it blank.';
export const GEAR_DATE_MESSAGE = 'Expiration date should look like 2026-12-31, or leave it blank.';

const WEIGHT_RE = /^(?:\d+\.?\d*|\.\d+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type GearDraft = {
  brand: string;
  name: string;
  weightLb: string;
  weightOz: string;
  quantity: string;
  expiration: string;
};

export type ValidGearFields = {
  /** Pounds. 0 when the user left weight blank or entered 0. */
  weightLb: number;
  quantity: number;
};

export type GearDraftResult =
  | { ok: true; value: ValidGearFields }
  | { ok: false; error: string };

type WeightPart = number | 'blank' | 'invalid';

function parseWeightPart(raw: string): WeightPart {
  const s = raw.trim();
  if (!s) return 'blank';
  if (!WEIGHT_RE.test(s)) return 'invalid';
  const n = Number(s);
  return Number.isFinite(n) ? n : 'invalid';
}

/** Combined pounds, or 'invalid' when a field has text that is not a number. */
export function resolveWeightLb(lbStr: string, ozStr: string): number | 'invalid' {
  const lb = parseWeightPart(lbStr);
  const oz = parseWeightPart(ozStr);
  if (lb === 'invalid' || oz === 'invalid') return 'invalid';
  return (lb === 'blank' ? 0 : lb) + (oz === 'blank' ? 0 : oz) / 16;
}

export function validateGearDraft(draft: GearDraft): GearDraftResult {
  const quantity = Number(draft.quantity);
  if (!draft.brand.trim() || !draft.name.trim() || !Number.isFinite(quantity) || !(quantity >= 1)) {
    return { ok: false, error: GEAR_REQUIRED_MESSAGE };
  }
  const weightLb = resolveWeightLb(draft.weightLb, draft.weightOz);
  if (weightLb === 'invalid') return { ok: false, error: GEAR_WEIGHT_MESSAGE };
  if (draft.expiration.trim() !== '' && !DATE_RE.test(draft.expiration.trim())) {
    return { ok: false, error: GEAR_DATE_MESSAGE };
  }
  return { ok: true, value: { weightLb, quantity: Math.round(quantity) } };
}

// lb and oz are two halves of one physical weight. A full 16 oz rolls into
// the pound side so the fields don't disagree about the real weight.
export function splitWeight(totalLb: number): { weightLb: string; weightOz: string } {
  if (!(totalLb > 0) || !Number.isFinite(totalLb)) return { weightLb: '', weightOz: '' };
  let lb = Math.floor(totalLb + 1e-9);
  let oz = Math.round((totalLb - lb) * 16 * 100) / 100;
  if (oz >= 16) {
    lb += 1;
    oz = 0;
  }
  return {
    weightLb: lb > 0 ? String(lb) : '',
    weightOz: oz > 0 ? String(oz) : '',
  };
}

/**
 * Fields to write when the user picks a catalog suggestion.
 * Null means the suggestion has no usable weight — keep whatever the user
 * already typed. A positive catalog weight replaces both fields.
 */
export function weightFieldsFromCatalog(
  weightLb: number | null | undefined,
): { weightLb: string; weightOz: string } | null {
  if (weightLb == null || !Number.isFinite(weightLb) || !(weightLb > 0)) return null;
  return splitWeight(weightLb);
}
