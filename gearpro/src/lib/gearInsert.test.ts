jest.mock('@/lib/supabase/client', () => ({
  supabase: require('./sync/fakeSupabase').fakeSupabase,
}));

import { fakeSupabase, resetFakeSupabase } from './sync/fakeSupabase';
import { GEAR_INSERT_ERROR, insertGearItem, visibleGearInsertError } from './gearInsert';
import { uid } from '@/store/useGearStore';

const USER = 'aaaaaaaa-0000-0000-0000-000000000001';

beforeEach(() => {
  resetFakeSupabase();
});

describe('visible gear insert error', () => {
  it('shows a message when the insert fails and nothing when it succeeds', () => {
    expect(visibleGearInsertError(null)).toBeNull();
    expect(visibleGearInsertError(undefined)).toBeNull();
    expect(visibleGearInsertError({ message: 'new row violates row-level security' })).toBe(GEAR_INSERT_ERROR);
    expect(GEAR_INSERT_ERROR.length).toBeGreaterThan(0);
  });

  it('returns the failure from gear_items so the form can show it', async () => {
    fakeSupabase.failNextUpsert('new row violates row-level security');
    const failed = await insertGearItem(USER, {
      id: uid(),
      brand: 'Sea to Summit',
      name: 'sleeping bag liner',
      category: 'Sleep',
      weightLb: 0,
      quantity: 1,
    });
    expect(failed.error?.message).toBe('new row violates row-level security');
    expect(visibleGearInsertError(failed.error)).toBe(GEAR_INSERT_ERROR);
    expect(fakeSupabase.tables.gear_items.size).toBe(0);

    const id = uid();
    const ok = await insertGearItem(USER, {
      id,
      brand: 'Sea to Summit',
      name: 'sleeping bag liner',
      category: 'Sleep',
      weightLb: 0,
      quantity: 1,
    });
    expect(ok.error).toBeNull();
    expect(visibleGearInsertError(ok.error)).toBeNull();
    expect(fakeSupabase.tables.gear_items.get(id)?.name).toBe('sleeping bag liner');
    expect(fakeSupabase.tables.gear_items.get(id)?.brand).toBe('Sea to Summit');
  });
});
