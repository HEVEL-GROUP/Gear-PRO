import {
  daysUntilExpiration,
  demoDataCounts,
  expiringGear,
  flaggedAssignments,
  groupByCategory,
  tripLifecycle,
  useGearStore,
} from './useGearStore';

const TODAY = '2026-07-23';

// addGear (unlike addTrip) doesn't return the new id -- it always appends, so
// the freshly-added item is reliably the last element right after the call.
function addGearAndGetId(item: Parameters<ReturnType<typeof useGearStore.getState>['addGear']>[0]) {
  useGearStore.getState().addGear(item);
  return useGearStore.getState().gear.at(-1)!.id;
}

describe('useGearStore', () => {
  beforeEach(() => {
    useGearStore.getState().resetLocal();
  });

  describe('resetLocal (factory-fresh seed)', () => {
    it('reseeds all gear and trips flagged as demo data', () => {
      const { gear, trips } = useGearStore.getState();
      expect(gear.length).toBeGreaterThan(0);
      expect(gear.every((g) => g.isDemo)).toBe(true);
      expect(trips.length).toBeGreaterThan(0);
      expect(trips.every((t) => t.isDemo)).toBe(true);
    });
  });

  describe('clearDemoData', () => {
    it('removes only isDemo-flagged gear/trips, even when ids are UUIDs (post-sync regression)', () => {
      // Simulate what syncOnLogin's remapToUuids does: every id becomes a
      // UUID, but isDemo must still be honored -- this is the exact bug that
      // was found and fixed (detecting demo data by id shape broke after the
      // first cloud sync remapped every id).
      useGearStore.setState((s) => ({
        gear: s.gear.map((g, i) => ({ ...g, id: `11111111-0000-0000-0000-00000000000${i}` })),
        trips: s.trips.map((t, i) => ({ ...t, id: `22222222-0000-0000-0000-00000000000${i}` })),
      }));

      addGearAndGetId({
        brand: 'Real',
        name: 'Item',
        category: 'Other',
        weightLb: 1,
        quantity: 1,
      });
      const realTripId = useGearStore.getState().addTrip({
        name: 'My real trip',
        location: '',
        startDate: '',
        endDate: '',
        bags: [],
        assignments: [],
      });

      useGearStore.getState().clearDemoData();

      const { gear, trips } = useGearStore.getState();
      expect(gear.every((g) => !g.isDemo)).toBe(true);
      expect(gear.some((g) => g.name === 'Item')).toBe(true);
      expect(trips.every((t) => !t.isDemo)).toBe(true);
      expect(trips.some((t) => t.id === realTripId)).toBe(true);
    });

    it('strips assignments in surviving trips that pointed at removed demo gear', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Mixed trip',
        location: '',
        startDate: '',
        endDate: '',
        bags: [],
        assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Pack', maxWeightLb: 40, color: '#000' });
      const bagId = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags[0].id;
      const demoGearId = useGearStore.getState().gear[0].id; // seed gear is isDemo: true

      useGearStore.getState().addAssignment(tripId, bagId, demoGearId);
      expect(
        useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments,
      ).toHaveLength(1);

      useGearStore.getState().clearDemoData();

      const survivingTrip = useGearStore.getState().trips.find((t) => t.id === tripId);
      expect(survivingTrip).toBeDefined();
      expect(survivingTrip!.assignments).toHaveLength(0);
    });
  });

  describe('removeGear', () => {
    it('cascades to strip assignments referencing the removed gear', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip',
        location: '',
        startDate: '',
        endDate: '',
        bags: [],
        assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Pack', maxWeightLb: 40, color: '#000' });
      const bagId = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags[0].id;
      const gearId = addGearAndGetId({
        brand: 'B',
        name: 'N',
        category: 'Other',
        weightLb: 1,
        quantity: 1,
      });
      useGearStore.getState().addAssignment(tripId, bagId, gearId);

      useGearStore.getState().removeGear(gearId);

      expect(useGearStore.getState().gear.some((g) => g.id === gearId)).toBe(false);
      expect(
        useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments,
      ).toHaveLength(0);
    });
  });

  describe('categories', () => {
    it('addCategory is a no-op for a case-insensitive duplicate of an existing category', () => {
      useGearStore.getState().addCategory('Shelter');
      expect(useGearStore.getState().customCategories).toHaveLength(0);

      useGearStore.getState().addCategory('Camping Extras');
      useGearStore.getState().addCategory('camping extras');
      expect(useGearStore.getState().customCategories).toEqual(['Camping Extras']);
    });

    it('renameCategory updates customCategories and retroactively updates gear.category', () => {
      useGearStore.getState().addCategory('OldName');
      const gearId = addGearAndGetId({
        brand: 'B',
        name: 'N',
        category: 'OldName',
        weightLb: 1,
        quantity: 1,
      });

      useGearStore.getState().renameCategory('OldName', 'NewName');

      expect(useGearStore.getState().customCategories).toEqual(['NewName']);
      expect(useGearStore.getState().gear.find((g) => g.id === gearId)!.category).toBe('NewName');
    });

    it('renameCategory refuses to clash with an existing different category', () => {
      useGearStore.getState().addCategory('A');
      useGearStore.getState().addCategory('B');
      useGearStore.getState().renameCategory('A', 'B');
      expect(useGearStore.getState().customCategories.sort()).toEqual(['A', 'B']);
    });

    it('removeCategory removes it from customCategories regardless of use (UI enforces the in-use guard)', () => {
      useGearStore.getState().addCategory('Temp');
      addGearAndGetId({
        brand: 'B',
        name: 'N',
        category: 'Temp',
        weightLb: 1,
        quantity: 1,
      });
      useGearStore.getState().removeCategory('Temp');
      expect(useGearStore.getState().customCategories).toHaveLength(0);
    });
  });

  describe('addAssignment / moveAssignment', () => {
    function setupTripWithTwoBags() {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip',
        location: '',
        startDate: '',
        endDate: '',
        bags: [],
        assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'A', maxWeightLb: 40, color: '#000' });
      useGearStore.getState().addBag(tripId, { label: 'B', maxWeightLb: 40, color: '#111' });
      const [bagAId, bagBId] = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags.map((b) => b.id);
      const gearId = addGearAndGetId({
        brand: 'B',
        name: 'N',
        category: 'Other',
        weightLb: 1,
        quantity: 5,
      });
      return { tripId, bagAId, bagBId, gearId };
    }

    it('merges quantity when assigning the same gear to the same bag twice', () => {
      const { tripId, bagAId, gearId } = setupTripWithTwoBags();
      useGearStore.getState().addAssignment(tripId, bagAId, gearId, 2);
      useGearStore.getState().addAssignment(tripId, bagAId, gearId, 3);

      const assignments = useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments;
      expect(assignments).toHaveLength(1);
      expect(assignments[0].quantity).toBe(5);
    });

    it('moveAssignment merges into an existing assignment already in the target bag', () => {
      const { tripId, bagAId, bagBId, gearId } = setupTripWithTwoBags();
      useGearStore.getState().addAssignment(tripId, bagAId, gearId, 2);
      useGearStore.getState().addAssignment(tripId, bagBId, gearId, 1);
      const movingId = useGearStore
        .getState()
        .trips.find((t) => t.id === tripId)!
        .assignments.find((a) => a.bagId === bagAId)!.id;

      useGearStore.getState().moveAssignment(tripId, movingId, bagBId);

      const assignments = useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments;
      expect(assignments).toHaveLength(1);
      expect(assignments[0].bagId).toBe(bagBId);
      expect(assignments[0].quantity).toBe(3);
    });
  });

  describe('flaggedAssignments', () => {
    it('only surfaces needs_repair, consumed, and lost -- not reserved/checked_out/returned', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip',
        location: '',
        startDate: '',
        endDate: '',
        bags: [],
        assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'A', maxWeightLb: 40, color: '#000' });
      const bagId = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags[0].id;
      const gearId = addGearAndGetId({
        brand: 'B',
        name: 'N',
        category: 'Other',
        weightLb: 1,
        quantity: 3,
      });
      useGearStore.getState().addAssignment(tripId, bagId, gearId);
      const assignmentId = useGearStore
        .getState()
        .trips.find((t) => t.id === tripId)!.assignments[0].id;

      useGearStore.getState().updateAssignment(tripId, assignmentId, { status: 'lost' });

      const flagged = flaggedAssignments(useGearStore.getState().trips);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].assignment.status).toBe('lost');
    });
  });
});

describe('groupByCategory', () => {
  it('orders groups by CATEGORIES order, with unknown categories appended alphabetically', () => {
    const items = [
      { category: 'Zzz' },
      { category: 'Cooking' },
      { category: 'Shelter' },
      { category: 'Aaa' },
    ];
    const groups = groupByCategory(items, (i) => i.category);
    expect(groups.map((g) => g.category)).toEqual(['Shelter', 'Cooking', 'Aaa', 'Zzz']);
  });
});

describe('tripLifecycle', () => {
  const base = {
    id: 't',
    name: 'Trip',
    location: '',
    bags: [],
  };

  it('is upcoming when the start date is in the future', () => {
    expect(
      tripLifecycle({ ...base, startDate: '2026-08-01', endDate: '2026-08-05', assignments: [] }, TODAY),
    ).toBe('upcoming');
  });

  it('is active once started with assignments', () => {
    expect(
      tripLifecycle(
        {
          ...base,
          startDate: '2026-07-20',
          endDate: '2026-07-30',
          assignments: [{ id: 'a', gearId: 'g', bagId: 'b', quantity: 1, status: 'reserved' }],
        },
        TODAY,
      ),
    ).toBe('active');
  });

  it('is needs_return once ended with gear still checked out', () => {
    expect(
      tripLifecycle(
        {
          ...base,
          startDate: '2026-07-01',
          endDate: '2026-07-10',
          assignments: [{ id: 'a', gearId: 'g', bagId: 'b', quantity: 1, status: 'checked_out' }],
        },
        TODAY,
      ),
    ).toBe('needs_return');
  });

  it('is closed once ended with nothing still checked out', () => {
    expect(
      tripLifecycle(
        {
          ...base,
          startDate: '2026-07-01',
          endDate: '2026-07-10',
          assignments: [{ id: 'a', gearId: 'g', bagId: 'b', quantity: 1, status: 'returned' }],
        },
        TODAY,
      ),
    ).toBe('closed');
  });
});

describe('demoDataCounts', () => {
  it('counts only gear/trips flagged isDemo', () => {
    const gear = [
      { id: '1', isDemo: true } as any,
      { id: '2', isDemo: false } as any,
      { id: '3' } as any,
    ];
    const trips = [{ id: 't1', isDemo: true } as any, { id: 't2' } as any];
    expect(demoDataCounts(gear, trips)).toEqual({ gear: 1, trips: 1 });
  });
});

describe('daysUntilExpiration', () => {
  it('is negative for a past date, positive for future, 0 for today, null for missing', () => {
    expect(daysUntilExpiration('2026-07-13', TODAY)).toBe(-10);
    expect(daysUntilExpiration('2026-08-02', TODAY)).toBe(10);
    expect(daysUntilExpiration('2026-07-23', TODAY)).toBe(0);
    expect(daysUntilExpiration(undefined, TODAY)).toBeNull();
    expect(daysUntilExpiration('not-a-date', TODAY)).toBeNull();
  });
});

describe('expiringGear', () => {
  const mk = (id: string, expiration?: string) =>
    ({ id, brand: 'B', name: id, category: 'Safety', weightLb: 1, quantity: 1, expiration } as any);

  it('includes expired + within-90-days, excludes far-future and no-date, sorted soonest first', () => {
    const gear = [
      mk('far', '2027-01-01'), // >90 days out -> excluded
      mk('soon', '2026-09-01'), // ~40 days -> included
      mk('expired', '2026-06-01'), // already expired -> included
      mk('none'), // no date -> excluded
      mk('edge', '2026-10-21'), // 90 days -> included (boundary)
    ];
    const result = expiringGear(gear, TODAY).map((g) => g.id);
    expect(result).toEqual(['expired', 'soon', 'edge']);
  });
});

describe('syncDirty flag', () => {
  beforeEach(() => useGearStore.getState().resetLocal());

  it('defaults clean after resetLocal and toggles via setSyncDirty', () => {
    expect(useGearStore.getState().syncDirty).toBe(false);
    useGearStore.getState().setSyncDirty(true);
    expect(useGearStore.getState().syncDirty).toBe(true);
    useGearStore.getState().resetLocal();
    expect(useGearStore.getState().syncDirty).toBe(false);
  });
});
