// A minimal, in-memory stand-in for the Postgres-backed Supabase client, built
// to faithfully support exactly the query shapes sync/index.ts issues:
//   .from(t).select('*')
//   .from(t).select('id', { count: 'exact', head: true }).eq(col, val)
//   .from(t).upsert(rows)
//   .from(t).update(patch).in('id', ids).eq(col, val)
// Not a general Supabase mock -- just enough surface to exercise the real
// push/pull/login logic against realistic table data without a network.
// Every upsert/update is also logged to `calls` so a test can assert on
// exactly what was SENT (the delta), not just infer it from final state --
// re-sending an unchanged row is invisible in the end state (upsert is
// idempotent) but must still count as a bug if it happens.

type Row = Record<string, unknown>;
export type FakeTables = Record<'gear_items' | 'trips' | 'bags' | 'assignments', Map<string, Row>>;

export function createFakeSupabase() {
  const tables: FakeTables = {
    gear_items: new Map(),
    trips: new Map(),
    bags: new Map(),
    assignments: new Map(),
  };
  const calls = {
    upserts: [] as { table: string; rows: Row[] }[],
    softDeletes: [] as { table: string; ids: string[] }[],
  };

  function seed(table: keyof FakeTables, rows: Row[]) {
    for (const r of rows) tables[table].set(r.id as string, { ...r });
  }

  function from(table: keyof FakeTables) {
    const rowsArr = () => [...tables[table].values()];

    return {
      select(cols: string, opts?: { count?: string; head?: boolean }) {
        if (cols === '*') {
          return Promise.resolve({ data: rowsArr(), error: null });
        }
        return {
          eq(col: string, val: unknown) {
            const count = rowsArr().filter((r) => r[col] === val).length;
            return Promise.resolve({ count, error: null, data: opts?.head ? null : undefined });
          },
        };
      },
      upsert(rows: Row[]) {
        calls.upserts.push({ table, rows: rows.map((r) => ({ ...r })) });
        for (const r of rows) {
          const existing = tables[table].get(r.id as string) ?? {};
          tables[table].set(r.id as string, { ...existing, ...r });
        }
        return Promise.resolve({ error: null });
      },
      update(patch: Row) {
        return {
          in(col: string, vals: string[]) {
            return {
              eq(col2: string, val2: unknown) {
                calls.softDeletes.push({ table, ids: [...vals] });
                for (const id of vals) {
                  const existing = tables[table].get(id);
                  if (existing && existing[col2] === val2) {
                    tables[table].set(id, { ...existing, ...patch });
                  }
                }
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      },
    };
  }

  return { from, tables, calls, seed };
}

// Singleton so `jest.mock('@/lib/supabase/client', ...)` (hoisted above
// imports) and the test file's own import of this module refer to the SAME
// instance -- the test seeds/inspects `fakeSupabase.tables`/`.calls` directly
// while the code under test talks to it only through `.from(...)`.
export const fakeSupabase = createFakeSupabase();

export function resetFakeSupabase() {
  for (const table of Object.keys(fakeSupabase.tables) as (keyof FakeTables)[]) {
    fakeSupabase.tables[table].clear();
  }
  fakeSupabase.calls.upserts.length = 0;
  fakeSupabase.calls.softDeletes.length = 0;
}
