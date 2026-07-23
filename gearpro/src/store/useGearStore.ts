import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type GearStatus =
  | 'reserved'
  | 'checked_out'
  | 'returned'
  | 'needs_repair'
  | 'consumed'
  | 'lost';

export type GearItem = {
  id: string;
  brand: string;
  name: string;
  category: string;
  weightLb: number;
  quantity: number;
  notes?: string;
  expiration?: string;
  photoUri?: string;
};

export type Bag = { id: string; label: string; maxWeightLb: number; color: string };

export type Assignment = {
  id: string;
  gearId: string;
  bagId: string;
  quantity: number;
  status: GearStatus;
  essential?: boolean;
};

export type Trip = {
  id: string;
  name: string;
  location: string;
  locationLat?: number;
  locationLon?: number;
  startDate: string;
  endDate: string;
  bags: Bag[];
  assignments: Assignment[];
};

export const STATUS_LABELS: Record<GearStatus, string> = {
  reserved: 'Planned',
  checked_out: 'Packed',
  returned: 'Returned',
  needs_repair: 'Needs repair',
  consumed: 'Consumed',
  lost: 'Lost',
};

export const STATUS_ORDER: GearStatus[] = [
  'reserved',
  'checked_out',
  'returned',
  'needs_repair',
  'consumed',
  'lost',
];

export const BAG_COLORS = ['#7a8a5e', '#4a5334', '#c67139', '#5b7fa6', '#8a6d9e', '#6f6a60'];

export const CATEGORIES = [
  'Shelter',
  'Sleep',
  'Cooking',
  'Water',
  'Clothing',
  'Safety',
  'Navigation',
  'Food',
  'Tools',
  'Hunting',
  'Other',
];

// Buckets items by category, ordered to match CATEGORIES (packing-list order,
// not alphabetical) with any unrecognized category tacked on the end.
export function groupByCategory<T>(
  items: T[],
  getCategory: (item: T) => string,
): { category: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const category = getCategory(item) || 'Other';
    if (!buckets.has(category)) buckets.set(category, []);
    buckets.get(category)!.push(item);
  }
  const extras = [...buckets.keys()].filter((c) => !CATEGORIES.includes(c)).sort();
  return [...CATEGORIES, ...extras]
    .filter((c) => buckets.has(c))
    .map((category) => ({ category, items: buckets.get(category)! }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Real UUIDs so local ids can sync 1:1 with Postgres uuid columns. Falls back
// to a manual v4 generator on native JS engines that lack crypto.randomUUID.
export const uid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isUuid = (id: string): boolean => UUID_RE.test(id);

const g = (
  id: string,
  brand: string,
  name: string,
  category: string,
  weightLb: number,
  quantity = 1,
  extra: Partial<GearItem> = {},
): GearItem => ({ id, brand, name, category, weightLb, quantity, ...extra });

const seedGear: GearItem[] = [
  g('tent', 'Hilleberg', 'Nallo 2', 'Shelter', 5.5),
  g('bag', 'Western Mtn', 'UltraLite 20', 'Sleep', 2.1),
  g('pad', 'Therm-a-Rest', 'NeoAir XLite', 'Sleep', 0.8),
  g('stove', 'MSR', 'PocketRocket 2', 'Cooking', 0.16),
  g('pot', 'Toaks', 'Titanium 750', 'Cooking', 0.24),
  g('filter', 'Sawyer', 'Squeeze', 'Water', 0.22, 2),
  g('firstaid', 'Adventure Medical', 'First Aid Kit', 'Safety', 0.5, 1, {
    expiration: '2026-08-01',
    notes: 'Check meds before season',
  }),
  g('optics', 'Vortex', 'Diamondback 10x42', 'Hunting', 1.6),
  g('rangefinder', 'Sig', 'Kilo 2200', 'Hunting', 0.5),
  g('layers', 'KUIU', 'Super Down Pro Jacket', 'Clothing', 0.9),
];

const myPack = (): Bag => ({ id: uid(), label: 'My Pack', maxWeightLb: 45, color: '#7a8a5e' });

function seedTrips(): Trip[] {
  const bagA: Bag = { id: uid(), label: 'My Pack', maxWeightLb: 45, color: '#7a8a5e' };
  const bagB: Bag = { id: uid(), label: 'Day Pack', maxWeightLb: 18, color: '#c67139' };
  const pk = (
    bagId: string,
    gearId: string,
    quantity = 1,
    essential = false,
  ): Assignment => ({ id: uid(), gearId, bagId, quantity, status: 'checked_out', essential });
  const elk: Trip = {
    id: 'elk',
    name: 'Elk Season · Bighorns',
    location: 'Bighorn Mountains, WY',
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    bags: [bagA, bagB],
    assignments: [
      pk(bagA.id, 'tent', 1, true),
      pk(bagA.id, 'bag', 1, true),
      pk(bagA.id, 'pad', 1),
      pk(bagA.id, 'stove', 1),
      pk(bagA.id, 'pot', 1),
      pk(bagA.id, 'filter', 1, true),
      pk(bagA.id, 'layers', 1),
      pk(bagB.id, 'optics', 1),
      pk(bagB.id, 'rangefinder', 1),
      pk(bagB.id, 'firstaid', 1, true),
    ],
  };
  const scout: Trip = {
    id: 'scout',
    name: 'Overnight scout',
    location: 'Cloud Peak trailhead',
    startDate: '2026-11-02',
    endDate: '2026-11-03',
    bags: [myPack()],
    assignments: [],
  };
  return [elk, scout];
}

type StoreState = {
  gear: GearItem[];
  trips: Trip[];
  categories: string[];
  customCategories: string[];
  addCategory: (name: string) => void;
  removeCategory: (name: string) => void;
  addGear: (item: Omit<GearItem, 'id'>) => void;
  updateGear: (id: string, patch: Partial<GearItem>) => void;
  removeGear: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => string;
  removeTrip: (id: string) => void;
  addAssignment: (tripId: string, bagId: string, gearId: string, quantity?: number) => void;
  updateAssignment: (tripId: string, assignmentId: string, patch: Partial<Assignment>) => void;
  removeAssignment: (tripId: string, assignmentId: string) => void;
  moveAssignment: (tripId: string, assignmentId: string, toBagId: string) => void;
  returnTrip: (tripId: string) => void;
  addBag: (tripId: string, bag: Omit<Bag, 'id'>) => void;
  updateBag: (tripId: string, bagId: string, patch: Partial<Bag>) => void;
  removeBag: (tripId: string, bagId: string) => void;
};

export const useGearStore = create<StoreState>()(
  persist(
    (set) => ({
      gear: seedGear,
      trips: seedTrips(),
      categories: CATEGORIES,
      customCategories: [],
      // Custom categories tack onto the fixed CATEGORIES list (kept in sync
      // via `categories`, which is what every picker/grouping reads from) --
      // matching case-insensitively against a name that already exists is a
      // no-op rather than a duplicate, so the same trip typo doesn't create
      // two near-identical categories.
      addCategory: (name) =>
        set((s) => {
          const trimmed = name.trim();
          if (!trimmed) return s;
          const exists = s.categories.some((c) => c.toLowerCase() === trimmed.toLowerCase());
          if (exists) return s;
          const customCategories = [...s.customCategories, trimmed];
          return { customCategories, categories: [...CATEGORIES, ...customCategories] };
        }),
      removeCategory: (name) =>
        set((s) => {
          const customCategories = s.customCategories.filter(
            (c) => c.toLowerCase() !== name.toLowerCase(),
          );
          return { customCategories, categories: [...CATEGORIES, ...customCategories] };
        }),
      addGear: (item) => set((s) => ({ gear: [...s.gear, { ...item, id: uid() }] })),
      updateGear: (id, patch) =>
        set((s) => ({ gear: s.gear.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),
      removeGear: (id) => set((s) => ({ gear: s.gear.filter((it) => it.id !== id) })),
      addTrip: (trip) => {
        const id = uid();
        set((s) => ({ trips: [...s.trips, { ...trip, id }] }));
        return id;
      },
      removeTrip: (id) => set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
      addAssignment: (tripId, bagId, gearId, quantity = 1) =>
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t;
            const existing = t.assignments.find((a) => a.gearId === gearId && a.bagId === bagId);
            if (existing) {
              return {
                ...t,
                assignments: t.assignments.map((a) =>
                  a.id === existing.id ? { ...a, quantity: a.quantity + quantity } : a,
                ),
              };
            }
            return {
              ...t,
              assignments: [
                ...t.assignments,
                { id: uid(), gearId, bagId, quantity, status: 'reserved' as GearStatus },
              ],
            };
          }),
        })),
      updateAssignment: (tripId, assignmentId, patch) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : {
                  ...t,
                  assignments: t.assignments.map((a) =>
                    a.id === assignmentId ? { ...a, ...patch } : a,
                  ),
                },
          ),
        })),
      removeAssignment: (tripId, assignmentId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : { ...t, assignments: t.assignments.filter((a) => a.id !== assignmentId) },
          ),
        })),
      moveAssignment: (tripId, assignmentId, toBagId) =>
        set((s) => ({
          trips: s.trips.map((t) => {
            if (t.id !== tripId) return t;
            const moving = t.assignments.find((a) => a.id === assignmentId);
            if (!moving || moving.bagId === toBagId) return t;
            const existing = t.assignments.find(
              (a) => a.id !== assignmentId && a.gearId === moving.gearId && a.bagId === toBagId,
            );
            if (existing) {
              return {
                ...t,
                assignments: t.assignments
                  .filter((a) => a.id !== assignmentId)
                  .map((a) =>
                    a.id === existing.id ? { ...a, quantity: a.quantity + moving.quantity } : a,
                  ),
              };
            }
            return {
              ...t,
              assignments: t.assignments.map((a) =>
                a.id === assignmentId ? { ...a, bagId: toBagId } : a,
              ),
            };
          }),
        })),
      returnTrip: (tripId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : {
                  ...t,
                  assignments: t.assignments.map((a) =>
                    a.status === 'checked_out' ? { ...a, status: 'returned' as GearStatus } : a,
                  ),
                },
          ),
        })),
      addBag: (tripId, bag) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId ? t : { ...t, bags: [...t.bags, { ...bag, id: uid() }] },
          ),
        })),
      updateBag: (tripId, bagId, patch) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : { ...t, bags: t.bags.map((b) => (b.id === bagId ? { ...b, ...patch } : b)) },
          ),
        })),
      removeBag: (tripId, bagId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : {
                  ...t,
                  bags: t.bags.filter((b) => b.id !== bagId),
                  assignments: t.assignments.filter((a) => a.bagId !== bagId),
                },
          ),
        })),
    }),
    {
      name: 'gearpro-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

export function gearMap(gear: GearItem[]): Record<string, GearItem> {
  return Object.fromEntries(gear.map((it) => [it.id, it]));
}

export function tripWeight(trip: Trip, byId: Record<string, GearItem>): number {
  return trip.assignments.reduce(
    (sum, a) => sum + (byId[a.gearId]?.weightLb ?? 0) * a.quantity,
    0,
  );
}

export function categoryBreakdown(
  trip: Trip,
  byId: Record<string, GearItem>,
): { category: string; weight: number }[] {
  const totals: Record<string, number> = {};
  for (const a of trip.assignments) {
    const item = byId[a.gearId];
    if (!item) continue;
    totals[item.category] = (totals[item.category] ?? 0) + item.weightLb * a.quantity;
  }
  return Object.entries(totals)
    .map(([category, weight]) => ({ category, weight }))
    .sort((x, y) => y.weight - x.weight);
}

export function bagTarget(trip: Trip): number {
  return trip.bags.reduce((sum, b) => sum + b.maxWeightLb, 0) || 45;
}

export function itemCount(trip: Trip): number {
  return trip.assignments.reduce((sum, a) => sum + a.quantity, 0);
}

// How many units of this gear are packed (checked_out) on OTHER trips right now.
export function checkedOutElsewhere(trips: Trip[], gearId: string, excludeTripId: string): number {
  return trips
    .filter((t) => t.id !== excludeTripId)
    .flatMap((t) => t.assignments)
    .filter((a) => a.gearId === gearId && a.status === 'checked_out')
    .reduce((sum, a) => sum + a.quantity, 0);
}

export function assignedInTrip(trip: Trip, gearId: string): number {
  return trip.assignments
    .filter((a) => a.gearId === gearId)
    .reduce((sum, a) => sum + a.quantity, 0);
}

// Units still available to add to this trip: owned minus packed elsewhere minus already assigned here.
export function remainingToAssign(item: GearItem, trips: Trip[], trip: Trip): number {
  const elsewhere = checkedOutElsewhere(trips, item.id, trip.id);
  const here = assignedInTrip(trip, item.id);
  return Math.max(item.quantity - elsewhere - here, 0);
}

export function isExpiredDate(dateStr: string | undefined, today: string): boolean {
  if (!dateStr) return false;
  return dateStr < today;
}

// Every currently-packed (checked_out) assignment across all trips, newest trip first.
export function allPackedAssignments(
  trips: Trip[],
): { trip: Trip; assignment: Assignment }[] {
  return trips.flatMap((trip) =>
    trip.assignments
      .filter((a) => a.status === 'checked_out')
      .map((assignment) => ({ trip, assignment })),
  );
}

export type TripLifecycle = 'upcoming' | 'active' | 'needs_return' | 'closed';

// Derived, not stored — so it's never out of sync with dates or item statuses.
export function tripLifecycle(trip: Trip, todayStamp: string): TripLifecycle {
  const hasPackedItems = trip.assignments.some((a) => a.status === 'checked_out');
  const hasAssignments = trip.assignments.length > 0;
  const isOver = trip.endDate ? trip.endDate < todayStamp : false;

  if (isOver) {
    return hasPackedItems ? 'needs_return' : 'closed';
  }
  if (trip.startDate && trip.startDate <= todayStamp) {
    return hasPackedItems || hasAssignments ? 'active' : 'upcoming';
  }
  return 'upcoming';
}

export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Counts units (matches itemCount's convention), not assignment rows.
export function packedCount(trip: Trip): number {
  return trip.assignments
    .filter((a) => a.status === 'checked_out')
    .reduce((sum, a) => sum + a.quantity, 0);
}
