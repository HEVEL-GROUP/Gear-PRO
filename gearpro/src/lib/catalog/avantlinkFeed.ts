import { parseCsvText } from '@/lib/importGear';

// Parses AvantLink-style merchant product datafeeds into the normalized
// catalog_merchants/catalog_products shape (see the product_catalog
// migration), and upserts the result via Supabase.
//
// Column names are mapped through an alias table -- same approach as
// importGear.ts's gear-CSV import -- rather than hard-coded positions,
// because this was built and tested against a hand-written sample feed
// (see __fixtures__/avantlink-sample-feed.csv) BEFORE AvantLink approval,
// without access to the live feed spec. When the real datafeed is wired in,
// any column-name mismatch is a one-line alias addition here, not a rewrite.

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

const HEADER_ALIASES = {
  merchantExternalId: ['merchantid'],
  merchantName: ['merchantname'],
  externalProductId: ['id', 'productid'],
  sku: ['sku'],
  brand: ['manufacturer', 'brand'],
  name: ['productname', 'name'],
  category: ['category'],
  subcategory: ['subcategory'],
  description: ['description'],
  price: ['price'],
  retailPrice: ['retailprice'],
  imageUrl: ['imageurl'],
  affiliateUrl: ['buyurl'],
  productUrl: ['producturl'],
  inStock: ['instock'],
} as const;

type ColumnKey = keyof typeof HEADER_ALIASES;

const normalizeHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function buildColumnIndex(headerRow: string[]): Partial<Record<ColumnKey, number>> {
  const normalized = headerRow.map(normalizeHeader);
  const index: Partial<Record<ColumnKey, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as ColumnKey[]) {
    const col = normalized.findIndex((h) => (HEADER_ALIASES[key] as readonly string[]).includes(h));
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

export function parseAvantlinkFeed(csvText: string): ParsedFeed {
  const rows = parseCsvText(csvText);
  const valid: ParsedCatalogRow[] = [];
  const skipped: FeedSkip[] = [];
  if (rows.length === 0) return { rows: valid, skipped };

  const columns = buildColumnIndex(rows[0]);
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

    const inStockRaw = cell(row, 'inStock');
    const availability: ParsedCatalogRow['availability'] =
      inStockRaw === '' ? undefined : inStockRaw === '0' || inStockRaw.toLowerCase() === 'false' ? 'out_of_stock' : 'in_stock';

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
      availability,
    });
  });

  return { rows: valid, skipped };
}

// Thin slice of the supabase-js client this module actually calls -- lets
// tests pass a purpose-built fake without pulling in the real SDK's types.
// PromiseLike (not Promise) on the upsert builder because that's genuinely
// all supabase-js's query builders guarantee -- they're thenable, not
// literal Promise instances -- and it's the easier shape for a fake to
// satisfy structurally.
type UpsertBuilder = PromiseLike<{ error: { message: string } | null }> & {
  select(cols: string): Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
};

export type CatalogSupabase = {
  from(table: 'catalog_merchants' | 'catalog_products'): {
    upsert(rows: Record<string, unknown>[], opts: { onConflict: string }): UpsertBuilder;
  };
};

export type CatalogSyncResult = {
  merchantsUpserted: number;
  productsUpserted: number;
  skipped: FeedSkip[];
};

// Upserts merchants first and reads back their generated ids, since products
// reference merchants by internal uuid -- not by the feed's own merchant id.
// Both upserts key off natural feed identifiers (network + external merchant
// id; merchant_id + external product id), so re-running this against the
// same feed updates existing rows in place instead of duplicating them.
export async function syncCatalogFromAvantlinkFeed(
  supabase: CatalogSupabase,
  csvText: string,
): Promise<CatalogSyncResult> {
  const { rows, skipped } = parseAvantlinkFeed(csvText);

  const merchantNameByExternalId = new Map<string, string>();
  for (const r of rows) {
    if (!merchantNameByExternalId.has(r.merchantExternalId)) {
      merchantNameByExternalId.set(r.merchantExternalId, r.merchantName);
    }
  }

  const merchantIdByExternalId = new Map<string, string>();
  if (merchantNameByExternalId.size > 0) {
    const merchantRows = [...merchantNameByExternalId.entries()].map(([external_merchant_id, name]) => ({
      network: 'avantlink',
      external_merchant_id,
      name,
    }));
    const { data, error } = await supabase
      .from('catalog_merchants')
      .upsert(merchantRows, { onConflict: 'network,external_merchant_id' })
      .select('id, external_merchant_id');
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      merchantIdByExternalId.set(row.external_merchant_id as string, row.id as string);
    }
  }

  const productRows = rows
    .map((r) => ({
      merchant_id: merchantIdByExternalId.get(r.merchantExternalId),
      external_product_id: r.externalProductId,
      sku: r.sku ?? null,
      brand: r.brand,
      name: r.name,
      category: r.category,
      subcategory: r.subcategory ?? null,
      description: r.description ?? null,
      price_cents: r.priceCents ?? null,
      retail_price_cents: r.retailPriceCents ?? null,
      image_url: r.imageUrl ?? null,
      affiliate_url: r.affiliateUrl ?? null,
      product_url: r.productUrl ?? null,
      availability: r.availability ?? null,
      last_synced_at: new Date().toISOString(),
    }))
    // A row whose merchant upsert didn't come back (write failure, or the
    // merchant batch was empty) has no merchant_id to attach to -- drop it
    // rather than write a product that silently belongs to nothing.
    .filter((r): r is typeof r & { merchant_id: string } => Boolean(r.merchant_id));

  if (productRows.length > 0) {
    const { error } = await supabase
      .from('catalog_products')
      .upsert(productRows, { onConflict: 'merchant_id,external_product_id' });
    if (error) throw new Error(error.message);
  }

  return { merchantsUpserted: merchantNameByExternalId.size, productsUpserted: productRows.length, skipped };
}
