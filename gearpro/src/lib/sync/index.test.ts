// Regression coverage for the sync redesign (per-row last-writer-wins +
// soft deletes). This is the exact layer responsible for three real
// data-loss incidents (a mid-edit un-add, an account wiped on logout, and a
// cleared demo seed resurrecting) -- the tests below are written against
// those failure modes directly, not just "does it run."

jest.mock('@/lib/supabase/client', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  supabase: require('./fakeSupabase').fakeSupabase,
}));

import { fakeSupabase, resetFakeSupabase } from './fakeSupabase';
import { pullFromCloud, pushToCloud, syncOnLogin } from './index';
import { hashGear, uid, useGearStore } from '@/store/useGearStore';

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER_USER = 'bbbbbbbb-0000-0000-0000-000000000002';

function gearRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: uid(),
    user_id: USER,
    brand: 'Hilleberg',
    name: 'Nallo 2',
    category: 'Shelter',
    weight_lb: 5.5,
    quantity: 1,
    notes: null,
    expiration: null,
    photo_uri: null,
    is_demo: false,
    deleted_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  resetFakeSupabase();
  useGearStore.getState().resetLocal();
});

describe('pullFromCloud -- per-row merge', () => {
  it('CRITICAL: adopts the cloud copy for a row with no local baseline entry, even though local differs (the exact bug an adversarial review caught: a stale/freshly-migrated device must never win just because it has never synced this row before)', async () => {
    const id = uid();
    // Cloud has the FRESH content (as if another, already-upgraded device edited it).
    fakeSupabase.seed('gear_items', [gearRow({ id, name: 'Fresh from Device A', weight_lb: 6.0 })]);
    // Local (Device B) has STALE content for the SAME id, and -- critically --
    // no syncBaseline entry at all (first time this row is reconciled under
    // the new sync system).
    useGearStore.setState({
      gear: [
        { id, brand: 'Hilleberg', name: 'STALE from Device B', category: 'Shelter', weightLb: 1.0, quantity: 1 },
      ],
      syncBaseline: {},
    });

    await pullFromCloud(USER);

    const merged = useGearStore.getState().gear.find((g) => g.id === id);
    expect(merged?.name).toBe('Fresh from Device A');
    expect(merged?.weightLb).toBe(6.0);
  });

  it('keeps the local copy when syncBaseline proves it changed since the last confirmed sync', async () => {
    const id = uid();
    const originalContent = { id, brand: 'Hilleberg', name: 'Nallo 2', category: 'Shelter', weightLb: 5.5, quantity: 1 };
    fakeSupabase.seed('gear_items', [gearRow({ id, name: 'Nallo 2', weight_lb: 5.5 })]);
    useGearStore.setState({
      gear: [{ ...originalContent, name: 'Nallo 2 (renamed by me)' }],
      // Baseline matches the ORIGINAL (pre-edit) content -- proof this row was
      // confirmed-synced before, and has since genuinely diverged locally.
      syncBaseline: { [id]: hashGear(originalContent) },
    });

    await pullFromCloud(USER);

    const merged = useGearStore.getState().gear.find((g) => g.id === id);
    expect(merged?.name).toBe('Nallo 2 (renamed by me)');
  });

  it('drops a row locally when the cloud says it was deleted, and clears its baseline entry', async () => {
    const id = uid();
    fakeSupabase.seed('gear_items', [gearRow({ id, deleted_at: '2026-07-24T00:00:00.000Z' })]);
    useGearStore.setState({
      gear: [{ id, brand: 'Hilleberg', name: 'Nallo 2', category: 'Shelter', weightLb: 5.5, quantity: 1 }],
      syncBaseline: { [id]: 'whatever' },
    });

    await pullFromCloud(USER);

    expect(useGearStore.getState().gear.some((g) => g.id === id)).toBe(false);
    expect(useGearStore.getState().syncBaseline[id]).toBeUndefined();
  });

  it('never deletes a local row the cloud fetch never mentioned at all (absence is not deletion -- protects a brand-new, not-yet-pushed item)', async () => {
    // Cloud is completely empty for this table.
    const id = uid();
    useGearStore.setState({
      gear: [{ id, brand: 'New', name: 'Just added offline', category: 'Other', weightLb: 1, quantity: 1 }],
      syncBaseline: {},
    });

    await pullFromCloud(USER);

    expect(useGearStore.getState().gear.some((g) => g.id === id)).toBe(true);
  });

  it("never adopts a teammate's row into the user's own gear array -- routes it to sharedGearById instead", async () => {
    const id = uid();
    fakeSupabase.seed('gear_items', [gearRow({ id, user_id: OTHER_USER, name: "Teammate's rangefinder" })]);

    await pullFromCloud(USER);

    expect(useGearStore.getState().gear.some((g) => g.id === id)).toBe(false);
    expect(useGearStore.getState().sharedGearById[id]?.name).toBe("Teammate's rangefinder");
  });

  it('never adopts a stray is_demo row from the cloud into the real gear list', async () => {
    const id = uid();
    fakeSupabase.seed('gear_items', [gearRow({ id, is_demo: true, name: 'Leftover demo row' })]);

    await pullFromCloud(USER);

    expect(useGearStore.getState().gear.some((g) => g.id === id)).toBe(false);
  });
});

describe('pushToCloud -- delta push + soft delete', () => {
  it('only upserts rows whose content actually differs from the last confirmed sync', async () => {
    const cleanId = uid();
    const dirtyId = uid();
    const cleanItem = { id: cleanId, brand: 'A', name: 'Clean', category: 'Other', weightLb: 1, quantity: 1 };
    const dirtyItem = { id: dirtyId, brand: 'B', name: 'Dirty', category: 'Other', weightLb: 2, quantity: 1 };
    useGearStore.setState({
      gear: [cleanItem, dirtyItem],
      syncBaseline: { [cleanId]: hashGear(cleanItem) }, // clean already matches; dirty has no entry
    });

    await pushToCloud(USER);

    const sentIds = fakeSupabase.calls.upserts.filter((c) => c.table === 'gear_items').flatMap((c) => c.rows.map((r) => r.id));
    expect(sentIds).toEqual([dirtyId]);
    expect(sentIds).not.toContain(cleanId);
  });

  it('never uploads isDemo rows, even when syncDirty is true', async () => {
    useGearStore.setState({
      gear: [{ id: uid(), brand: 'Demo', name: 'Seed item', category: 'Shelter', weightLb: 1, quantity: 1, isDemo: true }],
      syncDirty: true,
    });

    await pushToCloud(USER);

    expect(fakeSupabase.calls.upserts.filter((c) => c.table === 'gear_items')).toHaveLength(0);
  });

  it("never uploads a teammate's row (ownerId set to someone else)", async () => {
    useGearStore.setState({
      gear: [{ id: uid(), brand: 'X', name: "Teammate's", category: 'Other', weightLb: 1, quantity: 1, ownerId: OTHER_USER }],
    });

    await pushToCloud(USER);

    expect(fakeSupabase.calls.upserts.filter((c) => c.table === 'gear_items')).toHaveLength(0);
  });

  it('soft-deletes via UPDATE (deleted_at), never a hard delete -- and clears the pending-delete + baseline entry on success', async () => {
    const id = uid();
    fakeSupabase.seed('gear_items', [gearRow({ id })]);
    useGearStore.setState({
      gear: [],
      syncBaseline: { [id]: 'was-synced' },
      pendingDeletes: { gear_items: [id], trips: [], bags: [], assignments: [] },
    });

    await pushToCloud(USER);

    // Row still physically exists (soft delete), now tombstoned.
    expect(fakeSupabase.tables.gear_items.get(id)).toBeDefined();
    expect(fakeSupabase.tables.gear_items.get(id)?.deleted_at).toBeTruthy();
    expect(fakeSupabase.calls.softDeletes.some((c) => c.table === 'gear_items' && c.ids.includes(id))).toBe(true);
    // Local bookkeeping cleaned up so it's never re-sent.
    expect(useGearStore.getState().pendingDeletes.gear_items).toEqual([]);
    expect(useGearStore.getState().syncBaseline[id]).toBeUndefined();
  });

  it('records a confirmed hash in syncBaseline for every row it upserts, so an unchanged re-push sends nothing', async () => {
    const id = uid();
    const item = { id, brand: 'A', name: 'Item', category: 'Other', weightLb: 1, quantity: 1 };
    useGearStore.setState({ gear: [item], syncBaseline: {} });

    await pushToCloud(USER);
    expect(useGearStore.getState().syncBaseline[id]).toBe(hashGear(item));

    resetFakeSupabase(); // clear call log, keep table/store state
    await pushToCloud(USER);
    expect(fakeSupabase.calls.upserts.filter((c) => c.table === 'gear_items')).toHaveLength(0);
  });
});

describe('syncOnLogin', () => {
  it('pushes local straight up when the cloud is genuinely empty for this account (first sync ever)', async () => {
    const id = uid();
    useGearStore.setState({ gear: [{ id, brand: 'A', name: 'Real item', category: 'Other', weightLb: 1, quantity: 1 }] });

    await syncOnLogin(USER);

    expect(fakeSupabase.tables.gear_items.get(id)).toBeDefined();
  });

  it('pulls (merging) before pushing when the cloud already has data for this account', async () => {
    const cloudOnlyId = uid();
    fakeSupabase.seed('gear_items', [gearRow({ id: cloudOnlyId, name: 'Already in the cloud' })]);
    useGearStore.setState({ gear: [] }); // local is empty, e.g. right after a fresh reinstall

    await syncOnLogin(USER);

    // Pulled down rather than treated as "nothing to push, cloud wins by default push":
    expect(useGearStore.getState().gear.some((g) => g.id === cloudOnlyId)).toBe(true);
  });

  it('REGRESSION (the original incident): a post-logout empty local state can never wipe an account that has real cloud data', async () => {
    const realId = uid();
    fakeSupabase.seed('gear_items', [gearRow({ id: realId, name: "Austin's real gear" })]);
    // Simulate exactly what resetLocal() leaves behind after logout.
    useGearStore.getState().resetLocal();

    await syncOnLogin(USER);

    expect(fakeSupabase.tables.gear_items.get(realId)?.deleted_at).toBeFalsy();
    expect(useGearStore.getState().gear.some((g) => g.id === realId)).toBe(true);
  });
});
