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
  // True only for the sample items Gear Pro ships with -- an explicit flag
  // rather than inferring from id shape, because syncOnLogin remaps every
  // non-UUID local id to a real UUID on first cloud sync, which would
  // otherwise erase the "is this demo data" signal for every user who ever
  // logs in.
  isDemo?: boolean;
  ownerId?: string;
};

// ownerId is set by the cloud sync layer from the row's user_id. It's absent on
// rows created locally (which are always the current user's) and present on
// rows pulled from a SHARED trip, so the sync layer knows to push only the
// user's OWN rows -- never a teammate's -- and the UI knows whose gear it is.
export type Bag = { id: string; label: string; maxWeightLb: number; color: string; ownerId?: string };

export type Assignment = {
  id: string;
  gearId: string;
  bagId: string;
  quantity: number;
  status: GearStatus;
  statusReason?: string;
  essential?: boolean;
  ownerId?: string;
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
  isDemo?: boolean;
  // Set on pull: who owns the trip, and whether it's a trip shared WITH me
  // (someone else's). Owner-only fields; absent on locally-created trips.
  ownerId?: string;
  shared?: boolean;
  // The trip's join secret, present only once it's been shared. Set exclusively
  // by the share_trip/unshare_trip RPCs (never by a plain trip upsert), so the
  // sync layer reads it but never writes it. A trip counts as "shared" in the
  // UI when this is set (I'm the owner sharing) OR `shared` is true (I joined).
  shareToken?: string;
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

// The outcomes offered when checking gear back in from a trip -- a narrower
// list than STATUS_ORDER, which also includes the pre-trip statuses.
export const RETURN_OUTCOME_STATUSES: GearStatus[] = ['returned', 'needs_repair', 'consumed', 'lost'];

// Reason text is prompted for these -- there's a decision to remember
// (why it broke, where it was lost) that's worth capturing while it's fresh.
export const STATUSES_WITH_REASON: GearStatus[] = ['needs_repair', 'lost'];

// Statuses that pull a unit out of the available pool until resolved --
// packed elsewhere, or flagged as broken/lost/used up.
const UNAVAILABLE_STATUSES: GearStatus[] = ['checked_out', 'needs_repair', 'consumed', 'lost'];

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
].map((item) => ({ ...item, isDemo: true }));

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
    isDemo: true,
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
    isDemo: true,
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
  // True when local gear/trips have edits not yet confirmed-uploaded to the
  // cloud. Persisted so it survives a reload/relaunch: if an edit is made
  // offline (or the push fails) and the app is closed, this stays true and the
  // next login pushes-before-pulling instead of letting the cloud overwrite the
  // unsynced work. Cleared only after a verified successful push or a pull.
  syncDirty: boolean;
  setSyncDirty: (v: boolean) => void;
  // Teammates' gear that's assigned to a shared trip, keyed by gear id. Kept
  // OUT of `gear` (which is the user's own library only) so the Gear screen
  // never shows a teammate's items -- the shared-trip view resolves gear names
  // and weights from here when an assignment's gear isn't in `gear`.
  sharedGearById: Record<string, GearItem>;
  addCategory: (name: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  removeCategory: (name: string) => void;
  clearDemoData: () => void;
  resetLocal: () => void;
  addGear: (item: Omit<GearItem, 'id'>) => void;
  updateGear: (id: string, patch: Partial<GearItem>) => void;
  removeGear: (id: string) => void;
  removeGearBulk: (ids: string[]) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => string;
  removeTrip: (id: string) => void;
  addAssignment: (tripId: string, bagId: string, gearId: string, quantity?: number) => void;
  updateAssignment: (tripId: string, assignmentId: string, patch: Partial<Assignment>) => void;
  removeAssignment: (tripId: string, assignmentId: string) => void;
  moveAssignment: (tripId: string, assignmentId: string, toBagId: string) => void;
  // ownerId scopes the bulk return to the caller's own assignments on a shared
  // trip -- a teammate's gear is read-only and must not be flipped. Omit on a
  // solo trip (every assignment is the user's own).
  returnTrip: (tripId: string, ownerId?: string) => void;
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
      syncDirty: false,
      sharedGearById: {},
      setSyncDirty: (v) => set({ syncDirty: v }),
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
      renameCategory: (oldName, newName) =>
        set((s) => {
          const trimmed = newName.trim();
          if (!trimmed || trimmed.toLowerCase() === oldName.toLowerCase()) return s;
          const clash = s.categories.some(
            (c) => c.toLowerCase() === trimmed.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase(),
          );
          if (clash) return s;
          const customCategories = s.customCategories.map((c) =>
            c.toLowerCase() === oldName.toLowerCase() ? trimmed : c,
          );
          return {
            customCategories,
            categories: [...CATEGORIES, ...customCategories],
            gear: s.gear.map((g) => (g.category === oldName ? { ...g, category: trimmed } : g)),
          };
        }),
      removeCategory: (name) =>
        set((s) => {
          const customCategories = s.customCategories.filter(
            (c) => c.toLowerCase() !== name.toLowerCase(),
          );
          return { customCategories, categories: [...CATEGORIES, ...customCategories] };
        }),
      // Wipes the seed gear/trips Gear Pro ships with, identified by their
      // isDemo flag -- so a first-time user can start clean instead of
      // deleting demo items one by one. Also strips any assignment in a
      // surviving trip that pointed at deleted demo gear, so nothing is
      // left dangling.
      clearDemoData: () =>
        set((s) => {
          const demoGearIds = new Set(s.gear.filter((g) => g.isDemo).map((g) => g.id));
          return {
            gear: s.gear.filter((g) => !g.isDemo),
            trips: s.trips
              .filter((t) => !t.isDemo)
              .map((t) => ({
                ...t,
                assignments: t.assignments.filter((a) => !demoGearIds.has(a.gearId)),
              })),
          };
        }),
      // Reseeds this device back to factory-fresh state -- run on sign-out (and
      // before account deletion) so a second account signing in on the same
      // device never has the first account's local cache treated as "this
      // device's data" by syncOnLogin's first-sync remap-and-upload path.
      resetLocal: () =>
        set({
          gear: seedGear,
          trips: seedTrips(),
          categories: CATEGORIES,
          customCategories: [],
          syncDirty: false,
          sharedGearById: {},
        }),
      addGear: (item) => set((s) => ({ gear: [...s.gear, { ...item, id: uid() }] })),
      updateGear: (id, patch) =>
        set((s) => ({ gear: s.gear.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),
      // Cascades to every trip's assignments so deleting gear never leaves an
      // orphaned "Unknown" row behind -- the normal edit-form delete already
      // refuses to run while an item is in use, but this is also the direct
      // target of "remove forever" from the Needs Attention list, which is
      // meant to bypass that guard.
      removeGear: (id) =>
        set((s) => ({
          gear: s.gear.filter((it) => it.id !== id),
          trips: s.trips.map((t) => ({
            ...t,
            assignments: t.assignments.filter((a) => a.gearId !== id),
          })),
        })),
      // Bulk counterpart to removeGear: deletes every gear id in one atomic
      // state update (so the sync subscriber fires a single push, not one per
      // item) and cascades the same assignment cleanup. No-op on an empty list.
      removeGearBulk: (ids) =>
        set((s) => {
          const doomed = new Set(ids);
          if (doomed.size === 0) return s;
          return {
            gear: s.gear.filter((it) => !doomed.has(it.id)),
            trips: s.trips.map((t) => ({
              ...t,
              assignments: t.assignments.filter((a) => !doomed.has(a.gearId)),
            })),
          };
        }),
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
      returnTrip: (tripId, ownerId) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id !== tripId
              ? t
              : {
                  ...t,
                  assignments: t.assignments.map((a) =>
                    a.status === 'checked_out' && (!ownerId || !a.ownerId || a.ownerId === ownerId)
                      ? { ...a, status: 'returned' as GearStatus }
                      : a,
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

// How many units of this gear are unavailable (packed, or flagged
// broken/consumed/lost) on OTHER trips right now.
export function unavailableElsewhere(trips: Trip[], gearId: string, excludeTripId: string): number {
  return trips
    .filter((t) => t.id !== excludeTripId)
    .flatMap((t) => t.assignments)
    .filter((a) => a.gearId === gearId && UNAVAILABLE_STATUSES.includes(a.status))
    .reduce((sum, a) => sum + a.quantity, 0);
}

export function assignedInTrip(trip: Trip, gearId: string): number {
  return trip.assignments
    .filter((a) => a.gearId === gearId)
    .reduce((sum, a) => sum + a.quantity, 0);
}

// Units still available to add to this trip: owned minus packed elsewhere minus already assigned here.
export function remainingToAssign(item: GearItem, trips: Trip[], trip: Trip): number {
  const elsewhere = unavailableElsewhere(trips, item.id, trip.id);
  const here = assignedInTrip(trip, item.id);
  return Math.max(item.quantity - elsewhere - here, 0);
}

export function isExpiredDate(dateStr: string | undefined, today: string): boolean {
  if (!dateStr) return false;
  return dateStr < today;
}

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

// Whole days until the given YYYY-MM-DD (negative if already past); null if the
// date is missing/unparseable. TZ-safe (compares calendar days via Date.UTC).
export function daysUntilExpiration(dateStr: string | undefined, today: string): number | null {
  if (!dateStr) return null;
  const a = YMD.exec(dateStr);
  const b = YMD.exec(today);
  if (!a || !b) return null;
  const target = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const base = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((target - base) / 86_400_000);
}

// Gear that is already expired OR expires within `withinDays` (default ~3
// months) -- the "needs attention" set surfaced on the Gear screen, soonest
// first so the most urgent is on top.
export function expiringGear(gear: GearItem[], today: string, withinDays = 90): GearItem[] {
  return gear
    .filter((g) => {
      const d = daysUntilExpiration(g.expiration, today);
      return d !== null && d <= withinDays;
    })
    .sort((x, y) => (x.expiration! < y.expiration! ? -1 : x.expiration! > y.expiration! ? 1 : 0));
}

// Every assignment checked in as broken, lost, or consumed -- the "needs
// attention" list: gear that's out of the available pool until someone
// either fixes/restocks and adds it back, or removes it for good.
export function flaggedAssignments(trips: Trip[]): { trip: Trip; assignment: Assignment }[] {
  return trips.flatMap((trip) =>
    trip.assignments
      .filter((a) => a.status === 'needs_repair' || a.status === 'consumed' || a.status === 'lost')
      .map((assignment) => ({ trip, assignment })),
  );
}

// Counts of the seed gear/trips still present -- used to show (and gate) the
// "clear demo data" action once a user has started adding their own.
export function demoDataCounts(gear: GearItem[], trips: Trip[]): { gear: number; trips: number } {
  return {
    gear: gear.filter((g) => g.isDemo).length,
    trips: trips.filter((t) => t.isDemo).length,
  };
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

// Counts units (matches itemCount's convention), not assignment rows. Pass
// ownerId to count only the caller's own packed units on a shared trip (used by
// the Return-trip action, which may only return the caller's own gear).
export function packedCount(trip: Trip, ownerId?: string): number {
  return trip.assignments
    .filter((a) => a.status === 'checked_out' && (!ownerId || !a.ownerId || a.ownerId === ownerId))
    .reduce((sum, a) => sum + a.quantity, 0);
}
