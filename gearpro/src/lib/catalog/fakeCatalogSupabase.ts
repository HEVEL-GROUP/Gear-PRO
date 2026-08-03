// In-memory stand-in for the two catalog tables, scoped to this module only
// (deliberately not sharing sync/fakeSupabase.ts's singleton -- that fake is
// keyed by client-supplied row.id, but catalog upserts key off natural feed
// identifiers and need generated ids read back via .select(), a different
// enough shape that reusing it would mean bolting a second dialect onto an
// already-shared fake other tests depend on).
//
// Supports exactly the two calls syncCatalogFromParsedFeed makes:
//   .from(t).upsert(rows, { onConflict }).select(cols)
//   .from(t).upsert(rows, { onConflict })   (awaited directly, no .select())
//
// naturalKey includes `network` for merchants, so two networks that happen
// to reuse the same external merchant id (e.g. a coincidence between an
// AvantLink id and an Impact campaign id) never collide.

import type { CatalogSupabase } from './syncCatalog';

type CatalogRow = Record<string, unknown>;
type CatalogTable = 'catalog_merchants' | 'catalog_products';
type CatalogTables = Record<CatalogTable, Map<string, CatalogRow>>;

function naturalKey(table: CatalogTable, row: CatalogRow): string {
  return table === 'catalog_merchants'
    ? `${row.network}:${row.external_merchant_id}`
    : `${row.merchant_id}:${row.external_product_id}`;
}

export function createFakeCatalogSupabase(): { client: CatalogSupabase; tables: CatalogTables } {
  const tables: CatalogTables = { catalog_merchants: new Map(), catalog_products: new Map() };
  let idCounter = 0;
  const nextId = () => `fake-${++idCounter}`;

  function from(table: CatalogTable) {
    return {
      upsert(rows: CatalogRow[]) {
        const resultRows: CatalogRow[] = [];
        for (const incoming of rows) {
          const key = naturalKey(table, incoming);
          const existing = [...tables[table].values()].find((r) => naturalKey(table, r) === key);
          const merged = existing ? { ...existing, ...incoming, id: existing.id } : { ...incoming, id: nextId() };
          tables[table].set(merged.id as string, merged);
          resultRows.push(merged);
        }
        const settled = Promise.resolve({ error: null });
        return {
          select(_cols: string) {
            return Promise.resolve({ data: resultRows, error: null });
          },
          then: settled.then.bind(settled),
        };
      },
    };
  }

  return { client: { from } as CatalogSupabase, tables };
}
