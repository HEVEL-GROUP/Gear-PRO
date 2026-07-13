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

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

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
  const bagA = myPack();
  const packed = (gearId: string, quantity = 1, essential = false): Assignment => ({
    id: uid(),
    gearId,
    bagId: bagA.id,
    quantity,
    status: 'checked_out',
    essential,
  });
  const elk: Trip = {
    id: 'elk',
    name: 'Elk Season · Bighorns',
    location: 'Bighorn Mountains, WY',
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    bags: [bagA],
    assignments: [
      packed('tent', 1, true),
      packed('bag', 1, true),
      packed('pad', 1),
      packed('stove', 1),
      packed('pot', 1),
      packed('filter', 1, true),
      packed('firstaid', 1, true),
      packed('optics', 1),
      packed('rangefinder', 1),
      packed('layers', 1),
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
  addGear: (item: Omit<GearItem, 'id'>) => void;
  updateGear: (id: string, patch: Partial<GearItem>) => void;
  removeGear: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id'>) => string;
  removeTrip: (id: string) => void;
  addAssignment: (tripId: string, bagId: string, gearId: string, quantity?: number) => void;
  updateAssignment: (tripId: string, assignmentId: string, patch: Partial<Assignment>) => void;
  removeAssignment: (tripId: string, assignmentId: string) => void;
  resetSeed: () => void;
};

export const useGearStore = create<StoreState>()(
  persist(
    (set) => ({
      gear: seedGear,
      trips: seedTrips(),
      categories: CATEGORIES,
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
      resetSeed: () => set({ gear: seedGear, trips: seedTrips(), categories: CATEGORIES }),
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
