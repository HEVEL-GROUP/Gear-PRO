import { supabase } from '@/lib/supabase/client';
import {
  Assignment,
  Bag,
  GearItem,
  isUuid,
  Trip,
  uid,
  useGearStore,
} from '@/store/useGearStore';

type SyncState = { gear: GearItem[]; trips: Trip[]; categories: string[] };

// Seed/demo data ships with hand-picked, non-UUID ids (e.g. "tent", "elk") so it
// reads nicely in code; a fresh signup's first sync remaps every non-UUID id to
// a real UUID, consistently across all cross-references, before ever touching
// the cloud (Postgres's uuid columns can't accept the old format).
function remapToUuids(state: SyncState): SyncState {
  const gearIdMap = new Map<string, string>();
  const bagIdMap = new Map<string, string>();
  const tripIdMap = new Map<string, string>();
  const remap = (map: Map<string, string>, id: string) => {
    if (isUuid(id)) return id;
    if (!map.has(id)) map.set(id, uid());
    return map.get(id)!;
  };

  const gear = state.gear.map((g) => ({ ...g, id: remap(gearIdMap, g.id) }));
  const trips = state.trips.map((t) => {
    const bags = t.bags.map((b) => ({ ...b, id: remap(bagIdMap, b.id) }));
    const tripId = remap(tripIdMap, t.id);
    const assignments = t.assignments.map((a) => ({
      ...a,
      id: remap(new Map(), a.id), // assignment ids are never referenced elsewhere; always fresh
      gearId: remap(gearIdMap, a.gearId),
      bagId: remap(bagIdMap, a.bagId),
    }));
    return { ...t, id: tripId, bags, assignments };
  });

  return { gear, trips, categories: state.categories };
}

function toGearRow(userId: string, g: GearItem) {
  return {
    id: g.id,
    user_id: userId,
    brand: g.brand,
    name: g.name,
    category: g.category,
    weight_lb: g.weightLb,
    quantity: g.quantity,
    notes: g.notes ?? null,
    expiration: g.expiration || null,
    photo_uri: g.photoUri ?? null,
    is_demo: g.isDemo ?? false,
  };
}

function toTripRow(userId: string, t: Trip) {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    location: t.location,
    location_lat: t.locationLat ?? null,
    location_lon: t.locationLon ?? null,
    start_date: t.startDate || null,
    end_date: t.endDate || null,
    is_demo: t.isDemo ?? false,
  };
}

function toBagRow(userId: string, tripId: string, b: Bag) {
  return { id: b.id, user_id: userId, trip_id: tripId, label: b.label, max_weight_lb: b.maxWeightLb, color: b.color };
}

function toAssignmentRow(userId: string, tripId: string, a: Assignment) {
  return {
    id: a.id,
    user_id: userId,
    trip_id: tripId,
    bag_id: a.bagId,
    gear_id: a.gearId,
    quantity: a.quantity,
    status: a.status,
    status_reason: a.statusReason ?? null,
  };
}

async function deleteMissing(table: string, keepIds: string[]) {
  // Empty `in (...)` is invalid SQL — delete everything for this user instead.
  const query = supabase.from(table).delete();
  const { error } =
    keepIds.length > 0
      ? await query.not('id', 'in', `(${keepIds.join(',')})`)
      : await query.neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

/**
 * Uploads the full current local state to the cloud, replacing whatever's
 * there. Throws on ANY failed write so the caller never treats a partial or
 * failed push as success (which would let the next pull silently overwrite the
 * unsynced local edits). Callers clear the syncDirty flag only if this resolves.
 */
export async function pushToCloud(userId: string): Promise<void> {
  const { gear, trips } = useGearStore.getState();

  const gearRows = gear.map((g) => toGearRow(userId, g));
  const tripRows = trips.map((t) => toTripRow(userId, t));
  const bagRows = trips.flatMap((t) => t.bags.map((b) => toBagRow(userId, t.id, b)));
  const assignmentRows = trips.flatMap((t) => t.assignments.map((a) => toAssignmentRow(userId, t.id, a)));

  // Parents before children (FK order); upsert-by-id is safe to re-run.
  if (gearRows.length) {
    const { error } = await supabase.from('gear_items').upsert(gearRows);
    if (error) throw error;
  }
  if (tripRows.length) {
    const { error } = await supabase.from('trips').upsert(tripRows);
    if (error) throw error;
  }
  if (bagRows.length) {
    const { error } = await supabase.from('bags').upsert(bagRows);
    if (error) throw error;
  }
  if (assignmentRows.length) {
    const { error } = await supabase.from('assignments').upsert(assignmentRows);
    if (error) throw error;
  }

  // Children before parents (FK order) when pruning rows removed locally.
  await deleteMissing('assignments', assignmentRows.map((r) => r.id));
  await deleteMissing('bags', bagRows.map((r) => r.id));
  await deleteMissing('gear_items', gearRows.map((r) => r.id));
  await deleteMissing('trips', tripRows.map((r) => r.id));
}

/** Replaces local state with whatever's in the cloud for this user. */
export async function pullFromCloud(): Promise<void> {
  const [gearRes, tripsRes, bagsRes, assignmentsRes] = await Promise.all([
    supabase.from('gear_items').select('*'),
    supabase.from('trips').select('*'),
    supabase.from('bags').select('*'),
    supabase.from('assignments').select('*'),
  ]);
  if (gearRes.error) throw gearRes.error;
  if (tripsRes.error) throw tripsRes.error;
  if (bagsRes.error) throw bagsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const gear: GearItem[] = (gearRes.data ?? []).map((r) => ({
    id: r.id,
    brand: r.brand ?? '',
    name: r.name,
    category: r.category,
    weightLb: Number(r.weight_lb),
    quantity: r.quantity,
    notes: r.notes ?? undefined,
    expiration: r.expiration ?? undefined,
    photoUri: r.photo_uri ?? undefined,
    isDemo: r.is_demo ?? false,
  }));

  const bagsByTrip = new Map<string, Bag[]>();
  for (const r of bagsRes.data ?? []) {
    const bag: Bag = { id: r.id, label: r.label, maxWeightLb: Number(r.max_weight_lb), color: r.color };
    bagsByTrip.set(r.trip_id, [...(bagsByTrip.get(r.trip_id) ?? []), bag]);
  }

  const assignmentsByTrip = new Map<string, Assignment[]>();
  for (const r of assignmentsRes.data ?? []) {
    const a: Assignment = {
      id: r.id,
      gearId: r.gear_id,
      bagId: r.bag_id,
      quantity: r.quantity,
      status: r.status,
      statusReason: r.status_reason ?? undefined,
    };
    assignmentsByTrip.set(r.trip_id, [...(assignmentsByTrip.get(r.trip_id) ?? []), a]);
  }

  const trips: Trip[] = (tripsRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    location: r.location ?? '',
    locationLat: r.location_lat ?? undefined,
    locationLon: r.location_lon ?? undefined,
    startDate: r.start_date ?? '',
    endDate: r.end_date ?? '',
    bags: bagsByTrip.get(r.id) ?? [],
    assignments: assignmentsByTrip.get(r.id) ?? [],
    isDemo: r.is_demo ?? false,
  }));

  // A pull makes local an exact copy of the cloud, so there is nothing unsynced.
  useGearStore.setState({ gear, trips, syncDirty: false });
}

async function pushLocal(userId: string): Promise<void> {
  const local = useGearStore.getState();
  const remapped = remapToUuids(local);
  useGearStore.setState({ gear: remapped.gear, trips: remapped.trips });
  await pushToCloud(userId);
  useGearStore.getState().setSyncDirty(false);
}

/**
 * Runs once per login. Decides push-vs-pull without ever silently destroying
 * data:
 *  - Cloud is empty for this account  -> first sync ever, upload local.
 *  - Cloud has data BUT this device has unsynced local edits (syncDirty) ->
 *    the local edits win; push them (flush) rather than let the pull clobber
 *    work the user already made (e.g. edited offline, then relaunched).
 *  - Cloud has data and local is clean -> cloud is authoritative, pull.
 *
 * The cloud-empty check counts gear AND trips (not trips alone) so a user who
 * has catalogued gear but not planned a trip yet is treated as "has cloud
 * data" and pulled, never pushed -- otherwise a reinstall would upload the
 * fresh demo seed and wipe their real gear library.
 */
export async function syncOnLogin(userId: string): Promise<void> {
  const [gearRes, tripsRes] = await Promise.all([
    supabase.from('gear_items').select('id', { count: 'exact', head: true }),
    supabase.from('trips').select('id', { count: 'exact', head: true }),
  ]);
  if (gearRes.error) throw gearRes.error;
  if (tripsRes.error) throw tripsRes.error;

  const cloudHasData = (gearRes.count ?? 0) > 0 || (tripsRes.count ?? 0) > 0;
  const localDirty = useGearStore.getState().syncDirty;

  if (!cloudHasData || localDirty) {
    await pushLocal(userId);
  } else {
    await pullFromCloud();
  }
}
