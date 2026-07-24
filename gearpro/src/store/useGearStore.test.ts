import {
  daysUntilExpiration,
  demoDataCounts,
  expiringGear,
  flaggedAssignments,
  groupByCategory,
  hashGear,
  packedCount,
  Trip,
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

  describe('resetLocal (sign-out reset)', () => {
    it('clears gear and trips to empty -- demo is NOT re-seeded on logout', () => {
      // Put real data in, then reset as sign-out would.
      useGearStore.getState().addGear({ brand: 'B', name: 'N', category: 'Other', weightLb: 1, quantity: 1 });
      useGearStore.getState().addTrip({
        name: 'T', location: '', startDate: '', endDate: '', bags: [], assignments: [],
      });

      useGearStore.getState().resetLocal();

      const { gear, trips, syncDirty } = useGearStore.getState();
      expect(gear).toHaveLength(0);
      expect(trips).toHaveLength(0);
      expect(syncDirty).toBe(false);
    });
  });

  describe('clearDemoData', () => {
    // resetLocal no longer seeds demo data, so these tests inject their own
    // isDemo rows to exercise the clear-demo path.
    const seedDemo = () =>
      useGearStore.setState({
        gear: [
          {
            id: '11111111-0000-0000-0000-000000000001',
            brand: 'Demo',
            name: 'Tent',
            category: 'Shelter',
            weightLb: 5,
            quantity: 1,
            isDemo: true,
          },
        ],
        trips: [
          {
            id: '22222222-0000-0000-0000-000000000001',
            name: 'Demo trip',
            location: '',
            startDate: '',
            endDate: '',
            bags: [],
            assignments: [],
            isDemo: true,
          },
        ],
      });

    it('removes only isDemo-flagged gear/trips, even when ids are UUIDs (post-sync regression)', () => {
      // isDemo must be honored regardless of id shape -- detecting demo data by
      // id shape broke after the first cloud sync remapped every id to a UUID.
      seedDemo();

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
      expect(gear.some((g) => g.name === 'Tent')).toBe(false); // demo removed
      expect(trips.every((t) => !t.isDemo)).toBe(true);
      expect(trips.some((t) => t.id === realTripId)).toBe(true);
    });

    it('strips assignments in surviving trips that pointed at removed demo gear', () => {
      seedDemo();
      const demoGearId = useGearStore.getState().gear[0].id; // the seeded isDemo gear
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

    it('records the removed gear AND its cascaded assignment in pendingDeletes, for the sync layer to soft-delete', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip', location: '', startDate: '', endDate: '', bags: [], assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Pack', maxWeightLb: 40, color: '#000' });
      const bagId = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags[0].id;
      const gearId = addGearAndGetId({ brand: 'B', name: 'N', category: 'Other', weightLb: 1, quantity: 1 });
      useGearStore.getState().addAssignment(tripId, bagId, gearId);
      const assignmentId = useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments[0].id;

      useGearStore.getState().removeGear(gearId);

      const { pendingDeletes } = useGearStore.getState();
      expect(pendingDeletes.gear_items).toEqual([gearId]);
      expect(pendingDeletes.assignments).toEqual([assignmentId]);
    });
  });

  describe('removeGearBulk', () => {
    it('removes every listed id and cascades to strip their assignments, leaving others', () => {
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
      const a = addGearAndGetId({ brand: 'A', name: '1', category: 'Other', weightLb: 1, quantity: 1 });
      const b = addGearAndGetId({ brand: 'B', name: '2', category: 'Other', weightLb: 1, quantity: 1 });
      const c = addGearAndGetId({ brand: 'C', name: '3', category: 'Other', weightLb: 1, quantity: 1 });
      useGearStore.getState().addAssignment(tripId, bagId, a);
      useGearStore.getState().addAssignment(tripId, bagId, c);

      useGearStore.getState().removeGearBulk([a, b]);

      const { gear, trips } = useGearStore.getState();
      expect(gear.some((g) => g.id === a)).toBe(false);
      expect(gear.some((g) => g.id === b)).toBe(false);
      expect(gear.some((g) => g.id === c)).toBe(true);
      // The assignment for the removed item is stripped; the surviving one stays.
      const assignments = trips.find((t) => t.id === tripId)!.assignments;
      expect(assignments.map((x) => x.gearId)).toEqual([c]);
    });

    it('is a no-op on an empty id list', () => {
      const before = useGearStore.getState().gear.length;
      useGearStore.getState().removeGearBulk([]);
      expect(useGearStore.getState().gear.length).toBe(before);
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

    it('moveAssignment records the merged-away assignment id in pendingDeletes (its row disappears, so the cloud must learn it was removed)', () => {
      const { tripId, bagAId, bagBId, gearId } = setupTripWithTwoBags();
      useGearStore.getState().addAssignment(tripId, bagAId, gearId, 2);
      useGearStore.getState().addAssignment(tripId, bagBId, gearId, 1);
      const movingId = useGearStore
        .getState()
        .trips.find((t) => t.id === tripId)!
        .assignments.find((a) => a.bagId === bagAId)!.id;

      useGearStore.getState().moveAssignment(tripId, movingId, bagBId);

      expect(useGearStore.getState().pendingDeletes.assignments).toEqual([movingId]);
    });

    it('moveAssignment does NOT record a pendingDelete for a plain bag change (same row id survives)', () => {
      const { tripId, bagAId, bagBId, gearId } = setupTripWithTwoBags();
      useGearStore.getState().addAssignment(tripId, bagAId, gearId, 2);
      const movingId = useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments[0].id;

      useGearStore.getState().moveAssignment(tripId, movingId, bagBId);

      expect(useGearStore.getState().pendingDeletes.assignments).toEqual([]);
      expect(useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments[0].id).toBe(movingId);
    });
  });

  describe('removeTrip (cascade tombstones)', () => {
    it('records the trip AND every one of its own bags/assignments in pendingDeletes', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip', location: '', startDate: '', endDate: '', bags: [], assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Pack', maxWeightLb: 40, color: '#000' });
      const bagId = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags[0].id;
      const gearId = addGearAndGetId({ brand: 'B', name: 'N', category: 'Other', weightLb: 1, quantity: 1 });
      useGearStore.getState().addAssignment(tripId, bagId, gearId);
      const assignmentId = useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments[0].id;

      useGearStore.getState().removeTrip(tripId);

      const { pendingDeletes, trips } = useGearStore.getState();
      expect(trips.some((t) => t.id === tripId)).toBe(false);
      expect(pendingDeletes.trips).toEqual([tripId]);
      expect(pendingDeletes.bags).toEqual([bagId]);
      expect(pendingDeletes.assignments).toEqual([assignmentId]);
    });
  });

  describe('updateTrip', () => {
    it('patches name/location/dates in place, leaving bags/assignments/id untouched', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Old name', location: 'Old place', startDate: '2026-08-01', endDate: '2026-08-05',
        bags: [], assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Pack', maxWeightLb: 40, color: '#000' });

      useGearStore.getState().updateTrip(tripId, {
        name: 'New name', location: 'New place', startDate: '2026-09-01', endDate: '2026-09-05',
      });

      const trip = useGearStore.getState().trips.find((t) => t.id === tripId)!;
      expect(trip.name).toBe('New name');
      expect(trip.location).toBe('New place');
      expect(trip.startDate).toBe('2026-09-01');
      expect(trip.endDate).toBe('2026-09-05');
      expect(trip.id).toBe(tripId);
      expect(trip.bags).toHaveLength(1);
    });

    it('is a no-op for any other trip id', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip', location: '', startDate: '', endDate: '', bags: [], assignments: [],
      });
      const before = useGearStore.getState().trips.find((t) => t.id === tripId);

      useGearStore.getState().updateTrip('does-not-exist', { name: 'Should not apply' });

      expect(useGearStore.getState().trips.find((t) => t.id === tripId)).toEqual(before);
    });
  });

  describe('removeBag (cascade tombstones)', () => {
    it('records the bag AND its assignments in pendingDeletes, leaving other bags untouched', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip', location: '', startDate: '', endDate: '', bags: [], assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Doomed', maxWeightLb: 40, color: '#000' });
      useGearStore.getState().addBag(tripId, { label: 'Survives', maxWeightLb: 40, color: '#111' });
      const [doomedBagId, survivingBagId] = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags.map((b) => b.id);
      const gearId = addGearAndGetId({ brand: 'B', name: 'N', category: 'Other', weightLb: 1, quantity: 2 });
      useGearStore.getState().addAssignment(tripId, doomedBagId, gearId);
      useGearStore.getState().addAssignment(tripId, survivingBagId, gearId);
      const doomedAssignmentId = useGearStore
        .getState()
        .trips.find((t) => t.id === tripId)!
        .assignments.find((a) => a.bagId === doomedBagId)!.id;

      useGearStore.getState().removeBag(tripId, doomedBagId);

      const { pendingDeletes } = useGearStore.getState();
      expect(pendingDeletes.bags).toEqual([doomedBagId]);
      expect(pendingDeletes.assignments).toEqual([doomedAssignmentId]);
    });
  });

  describe('removeAssignment', () => {
    it('records the removed assignment in pendingDeletes', () => {
      const tripId = useGearStore.getState().addTrip({
        name: 'Trip', location: '', startDate: '', endDate: '', bags: [], assignments: [],
      });
      useGearStore.getState().addBag(tripId, { label: 'Pack', maxWeightLb: 40, color: '#000' });
      const bagId = useGearStore.getState().trips.find((t) => t.id === tripId)!.bags[0].id;
      const gearId = addGearAndGetId({ brand: 'B', name: 'N', category: 'Other', weightLb: 1, quantity: 1 });
      useGearStore.getState().addAssignment(tripId, bagId, gearId);
      const assignmentId = useGearStore.getState().trips.find((t) => t.id === tripId)!.assignments[0].id;

      useGearStore.getState().removeAssignment(tripId, assignmentId);

      expect(useGearStore.getState().pendingDeletes.assignments).toEqual([assignmentId]);
    });
  });

  describe('returnTrip (shared-trip owner scoping)', () => {
    const ME = 'me-user-id';
    const MATE = 'teammate-user-id';
    function setupSharedTrip() {
      useGearStore.setState({
        gear: [],
        sharedGearById: {},
        trips: [
          {
            id: 'trip1',
            name: 'Shared',
            location: '',
            startDate: '',
            endDate: '',
            ownerId: ME,
            bags: [
              { id: 'bag-me', label: 'Mine', maxWeightLb: 40, color: '#000', ownerId: ME },
              { id: 'bag-mate', label: 'Theirs', maxWeightLb: 40, color: '#111', ownerId: MATE },
            ],
            assignments: [
              { id: 'a-me', gearId: 'g1', bagId: 'bag-me', quantity: 1, status: 'checked_out', ownerId: ME },
              { id: 'a-mate', gearId: 'g2', bagId: 'bag-mate', quantity: 2, status: 'checked_out', ownerId: MATE },
            ],
          },
        ],
      });
    }

    it("returns only the caller's own checked-out gear, leaving a teammate's untouched", () => {
      setupSharedTrip();
      useGearStore.getState().returnTrip('trip1', ME);
      const a = useGearStore.getState().trips[0].assignments;
      expect(a.find((x) => x.id === 'a-me')!.status).toBe('returned');
      expect(a.find((x) => x.id === 'a-mate')!.status).toBe('checked_out');
    });

    it('with no ownerId (solo trip) returns every checked-out assignment', () => {
      setupSharedTrip();
      useGearStore.getState().returnTrip('trip1');
      const a = useGearStore.getState().trips[0].assignments;
      expect(a.every((x) => x.status === 'returned')).toBe(true);
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

// The sync layer's ENTIRE dirty/clean detection rests on hashGear (and its
// hashTrip/hashBag/hashAssignment siblings) producing the SAME string for the
// SAME content regardless of which side (a local object vs. one rebuilt from
// a cloud row) computed it -- an adversarial review of an earlier draft of
// this design flagged that exact asymmetry as a way for a row to look
// permanently "dirty" and never converge. These pin the normalization down.
describe('hashGear', () => {
  const base = { brand: 'Hilleberg', name: 'Nallo 2', category: 'Shelter', weightLb: 5.5, quantity: 1 };

  it('is identical for the same content regardless of undefined vs. omitted optional fields', () => {
    expect(hashGear({ ...base, notes: undefined, expiration: undefined, photoUri: undefined })).toBe(
      hashGear(base),
    );
  });

  it('changes when any synced field changes', () => {
    const h0 = hashGear(base);
    expect(hashGear({ ...base, weightLb: 6 })).not.toBe(h0);
    expect(hashGear({ ...base, name: 'Different' })).not.toBe(h0);
    expect(hashGear({ ...base, notes: 'now has a note' })).not.toBe(h0);
  });

  it('is stable across repeated calls with equivalent objects', () => {
    expect(hashGear({ ...base })).toBe(hashGear({ ...base }));
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

describe('packedCount (owner scoping)', () => {
  const trip: Trip = {
    id: 't',
    name: 'Shared',
    location: '',
    startDate: '',
    endDate: '',
    bags: [],
    assignments: [
      { id: 'a-me', gearId: 'g1', bagId: 'b1', quantity: 1, status: 'checked_out', ownerId: 'me' },
      { id: 'a-mate', gearId: 'g2', bagId: 'b2', quantity: 2, status: 'checked_out', ownerId: 'mate' },
      { id: 'a-reserved', gearId: 'g3', bagId: 'b1', quantity: 5, status: 'reserved', ownerId: 'me' },
    ],
  };

  it('counts all checked-out units without an ownerId', () => {
    expect(packedCount(trip)).toBe(3); // 1 (me) + 2 (mate); reserved excluded
  });

  it("counts only the owner's checked-out units with an ownerId", () => {
    expect(packedCount(trip, 'me')).toBe(1);
    expect(packedCount(trip, 'mate')).toBe(2);
  });
});
