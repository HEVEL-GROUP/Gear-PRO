import { parseCsvText } from '@/lib/importGear';

// Generic engine behind every merchant datafeed network this app ingests
// (AvantLink, Impact, Pepperjam -- see ./networks/*). All three networks
// deliver the same underlying idea (a merchant/program id + name, plus a
// row per product) through differently-named, differently-cased columns,
// so the parsing logic lives here ONCE and each network file supplies only
// its own header-alias map. Adding a fourth network later is a new alias
// map, not a new parser.

export type ParsedCatalogRow = {
  merchantExternalId: string;
  merchantName: string;
  externalProductId: string;
  sku?: string;
  brand: string;
  name: string;
  category: string;
  subcategory?: string;
  description?: string;
  priceCents?: number;
  retailPriceCents?: number;
  imageUrl?: string;
  affiliateUrl?: string;
  productUrl?: string;
  availability?: 'in_stock' | 'out_of_stock';
};

export type FeedSkip = { row: number; reason: string };

export type ParsedFeed = {
  rows: ParsedCatalogRow[];
  skipped: FeedSkip[];
};

export type ColumnKey =
  | 'merchantExternalId'
  | 'merchantName'
  | 'externalProductId'
  | 'sku'
  | 'brand'
  | 'name'
  | 'category'
  | 'subcategory'
  | 'description'
  | 'price'
  | 'retailPrice'
  | 'imageUrl'
  | 'affiliateUrl'
  | 'productUrl'
  | 'inStock';

export type HeaderAliasMap = Record<ColumnKey, readonly string[]>;

const normalizeHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function buildColumnIndex(headerRow: string[], aliases: HeaderAliasMap): Partial<Record<ColumnKey, number>> {
  const normalized = headerRow.map(normalizeHeader);
  const index: Partial<Record<ColumnKey, number>> = {};
  for (const key of Object.keys(aliases) as ColumnKey[]) {
    const col = normalized.findIndex((h) => aliases[key].includes(h));
    if (col !== -1) index[key] = col;
  }
  return index;
}

// Money arrives as a decimal string ("219.00"); stored as integer cents to
// avoid float rounding drift anywhere this gets summed or diffed later.
function toCents(raw: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

// Networks disagree on how "in stock" is spelled -- AvantLink-style feeds
// tend to use a bare 1/0, Impact/Pepperjam-style feeds tend to spell it out
// ("In Stock" / "Out of Stock"). Normalizing (lowercase, strip non-alnum)
// before matching means one check covers "0", "false", "Out of Stock", and
// "out_of_stock" alike, instead of a network-specific special case each.
const OUT_OF_STOCK_VALUES = new Set(['0', 'false', 'no', 'outofstock', 'unavailable', 'discontinued']);

function parseAvailability(raw: string): ParsedCatalogRow['availability'] {
  if (!raw) return undefined;
  const normalized = normalizeHeader(raw);
  return OUT_OF_STOCK_VALUES.has(normalized) ? 'out_of_stock' : 'in_stock';
}

export function parseMerchantFeed(csvText: string, aliases: HeaderAliasMap): ParsedFeed {
  const rows = parseCsvText(csvText);
  const valid: ParsedCatalogRow[] = [];
  const skipped: FeedSkip[] = [];
  if (rows.length === 0) return { rows: valid, skipped };

  const columns = buildColumnIndex(rows[0], aliases);
  const dataRows = rows.slice(1);
  const cell = (row: string[], key: ColumnKey) => {
    const idx = columns[key];
    return idx == null ? '' : (row[idx] ?? '').trim();
  };

  dataRows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for header, +1 for 1-indexed display

    const merchantExternalId = cell(row, 'merchantExternalId');
    if (!merchantExternalId) {
      skipped.push({ row: rowNumber, reason: 'missing merchant id' });
      return;
    }
    const merchantName = cell(row, 'merchantName');
    if (!merchantName) {
      skipped.push({ row: rowNumber, reason: 'missing merchant name' });
      return;
    }
    const externalProductId = cell(row, 'externalProductId');
    if (!externalProductId) {
      skipped.push({ row: rowNumber, reason: 'missing product id' });
      return;
    }
    const name = cell(row, 'name');
    if (!name) {
      skipped.push({ row: rowNumber, reason: 'missing product name' });
      return;
    }

    valid.push({
      merchantExternalId,
      merchantName,
      externalProductId,
      sku: cell(row, 'sku') || undefined,
      brand: cell(row, 'brand'),
      name,
      category: cell(row, 'category') || 'Other',
      subcategory: cell(row, 'subcategory') || undefined,
      description: cell(row, 'description') || undefined,
      priceCents: toCents(cell(row, 'price')),
      retailPriceCents: toCents(cell(row, 'retailPrice')),
      imageUrl: cell(row, 'imageUrl') || undefined,
      affiliateUrl: cell(row, 'affiliateUrl') || undefined,
      productUrl: cell(row, 'productUrl') || undefined,
      availability: parseAvailability(cell(row, 'inStock')),
    });
  });

  return { rows: valid, skipped };
}
