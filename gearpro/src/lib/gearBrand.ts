// Turns the text Austin types into the search box into a brand + item name.
// Known brands are the catalog, the gear already in his library, and a few
// canonical spellings so a typo like "Sea to Sumit" lands on "Sea to Summit"
// instead of being saved with the misspelling.

export const CANONICAL_BRANDS = ['Sea to Summit'];

export const BRAND_FIELD_HINT = 'Add a brand. Leave it blank to save as Unknown.';
export const NAME_FIELD_HINT = 'Add an item name.';

export function normalizeGearText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Shown when the catalog search settles empty. The one-tap button is rendered directly under this. */
export function noCatalogMatchHint(text: string): string {
  return `Not in the catalog yet. Tap Add "${normalizeGearText(text)}" below to save it.`;
}

export function addTypedGearLabel(text: string): string {
  return `Add "${normalizeGearText(text)}" as new gear`;
}

export type TypedGearField = 'search' | 'brand' | 'name';

export type TypedGearFields = {
  searchText: string;
  brand: string;
  name: string;
};

/** Catalog query: the search box when Brand and Name are still empty, otherwise what those fields say. */
export function catalogQueryText(searchText: string, brand: string, name: string): string {
  if (!brand.trim() && !name.trim()) return normalizeGearText(searchText);
  return normalizeGearText(`${brand} ${name}`);
}

/** Text Enter should hand to the typed-gear split for this field. */
export function typedGearSource(fields: TypedGearFields, field: TypedGearField): string {
  const search = normalizeGearText(fields.searchText);
  const identity = normalizeGearText(`${fields.brand} ${fields.name}`);
  if (field === 'search') return search;
  return identity || search;
}

/** Enter/Return saves through the typed-gear path only when there is text and nothing from the catalog is selected. */
export function enterUsesTypedGear(input: {
  editing: boolean;
  catalogSelected: boolean;
  text: string;
}): boolean {
  return !input.editing && !input.catalogSelected && normalizeGearText(input.text).length > 0;
}

/**
 * The sticky Add to library button uses the typed-gear split when the search
 * box has text but Brand and Name are still empty. Otherwise the form fields win.
 */
export function footerUsesTypedGear(input: {
  editing: boolean;
  catalogSelected: boolean;
  brand: string;
  name: string;
  searchText: string;
}): boolean {
  return (
    !input.editing &&
    !input.catalogSelected &&
    !input.brand.trim() &&
    !input.name.trim() &&
    normalizeGearText(input.searchText).length > 0
  );
}

export type TypedGearPlan =
  | { kind: 'save'; brand: string; name: string }
  | { kind: 'focus'; field: 'brand' | 'name'; brand: string; name: string; hint: string };

type BrandHit = { brand: string; name: string; words: number; distance: number; canonical: boolean };

export function lettersOnly(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function maxTypoDistance(brandLetters: string): number {
  const n = brandLetters.length;
  if (n <= 3) return 0;
  if (n <= 6) return 1;
  return 2;
}

/** Catalog and library spellings, with a canonical spelling winning ties. */
export function mergeBrandList(catalog: string[], library: string[], canonical: string[] = CANONICAL_BRANDS): string[] {
  const chosen = new Map<string, { name: string; rank: number }>();
  const add = (name: string, rank: number) => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const key = lettersOnly(trimmed);
    if (!key) return;
    const prev = chosen.get(key);
    if (!prev || rank >= prev.rank) chosen.set(key, { name: trimmed, rank });
  };
  for (const brand of library) add(brand, 0);
  for (const brand of catalog) add(brand, 1);
  for (const brand of canonical) add(brand, 2);
  return [...chosen.values()].map((entry) => entry.name);
}

export function splitKnownBrand(text: string, brands: string[], canonical: string[] = CANONICAL_BRANDS): {
  brand: string;
  name: string;
  matched: boolean;
} {
  const query = text.trim().replace(/\s+/g, ' ');
  if (!query) return { brand: '', name: '', matched: false };
  const words = query.split(' ');
  const canonicalKeys = new Set(canonical.map(lettersOnly));
  const hits: BrandHit[] = [];

  for (const raw of brands) {
    const brand = raw.trim().replace(/\s+/g, ' ');
    const brandLetters = lettersOnly(brand);
    if (!brandLetters) continue;
    const allowed = maxTypoDistance(brandLetters);
    for (let count = 1; count <= words.length; count++) {
      const prefix = words.slice(0, count).join(' ');
      const distance = editDistance(lettersOnly(prefix), brandLetters);
      if (distance > allowed) continue;
      hits.push({
        brand,
        name: words.slice(count).join(' '),
        words: count,
        distance,
        canonical: canonicalKeys.has(brandLetters),
      });
    }
  }

  hits.sort((a, b) => {
    if (b.words !== a.words) return b.words - a.words;
    if (a.canonical !== b.canonical) return a.canonical ? -1 : 1;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return b.brand.length - a.brand.length;
  });

  const best = hits[0];
  if (!best) return { brand: '', name: query, matched: false };
  return { brand: best.brand, name: best.name, matched: true };
}

export function planTypedGear(text: string, brands: string[]): TypedGearPlan {
  const split = splitKnownBrand(text, brands);
  if (split.matched && split.name.trim()) {
    return { kind: 'save', brand: split.brand, name: split.name.trim() };
  }
  if (split.matched) {
    return { kind: 'focus', field: 'name', brand: split.brand, name: '', hint: NAME_FIELD_HINT };
  }
  const name = text.trim();
  return { kind: 'focus', field: 'brand', brand: '', name, hint: BRAND_FIELD_HINT };
}
