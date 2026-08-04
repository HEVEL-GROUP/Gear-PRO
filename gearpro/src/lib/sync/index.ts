import { supabase } from '@/lib/supabase/client';
import {
  Assignment,
  Bag,
  CATEGORIES,
  emptyPendingDeletes,
  GearItem,
  hashAssignment,
  hashBag,
  hashGear,
  hashTrip,
  isUuid,
  PendingDeletes,
  SYNC_TABLES,
  SyncTable,
  Trip,
  useGearStore,
} from '@/store/useGearStore';

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
    emoji: g.emoji ?? null,
    catalog_product_id: g.catalogProductId ?? null,
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

const normalizeCategoryList = (list: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
};

const sameList = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Custom category NAMES get their own tiny per-user row (gear_category_prefs)
 * rather than the per-row baseline/tombstone machinery gear/trips use below --
 * a short name list carries none of that data's loss risk. Pushes the
 * CURRENT full local list; called from pushToCloud so it rides the same
 * debounced push cycle as everything else.
 */
export async function pushCategoriesToCloud(userId: string): Promise<void> {
  const { customCategories } = useGearStore.getState();
  const { error } = await supabase
    .from('gear_category_prefs')
    .upsert([{ user_id: userId, custom_categories: customCategories }]);
  if (error) throw error;
}

/**
 * Merges the cloud's custom category list into local by UNION, never a
 * replace. Unlike gear/trips (per-row hash vs. baseline tells you when local
 * has genuinely diverged), a name list has no cheap equivalent signal -- so
 * instead of guessing which side is "newer," this just keeps every name
 * either side has ever seen. That's what fixes the actual bug: a device that
 * has never built up its own local copy started from an empty list and the
 * custom categories a user created elsewhere looked gone, even though the
 * gear items using them were untouched (gear syncs its category string
 * regardless). The one downside -- a just-deleted/renamed category can
 * reappear on a device that hasn't caught up yet -- is a one-tap fix, not
 * silent data loss.
 */
export async function pullCategoriesFromCloud(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('gear_category_prefs')
    .select('custom_categories')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  const cloudList = data?.custom_categories ?? [];
  const localList = useGearStore.getState().customCategories;
  const merged = normalizeCategoryList([...cloudList, ...localList]);

  if (!sameList(merged, localList)) {
    useGearStore.setState({ categories: [...CATEGORIES, ...merged], customCategories: merged });
  }
  if (!sameList(merged, cloudList)) {
    await pushCategoriesToCloud(userId);
  }
}

/**
 * Pushes ONLY what changed since the last confirmed sync -- never a wholesale
 * account mirror. Two things make this safe against ever destroying another
 * device's (or a teammate's) data:
 *
 *  - Upserts are a strict allow-list (owned rows, not demo, on a trip that's
 *    itself synced) and are skipped entirely for any row whose content
 *    already matches syncBaseline -- so an unrelated row is never re-sent,
 *    let alone overwritten.
 *  - Deletion is EXPLICIT (pendingDeletes, populated only by the store's
 *    removal actions) and is a soft-delete UPDATE, not a DELETE -- the
 *    database itself now refuses a plain DELETE from this role (see the
 *    soft_delete_and_write_lockdown migration), so even old/buggy client code
 *    can no longer hard-delete a row it merely doesn't know about.
 *
 * Ordering (ascending updated_at) is handled entirely by the database: every
 * one of these tables already has a BEFORE UPDATE trigger that stamps
 * updated_at = now() unconditionally, ignoring whatever the client sends.
 * That makes "whoever's write actually lands last wins" a server-clock fact,
 * never a client-clock guess -- this push never needs to read or compare a
 * timestamp at all.
 *
 * Throws on ANY failed write so the caller never treats a partial push as
 * success (which would let a future pull believe a never-sent row was
 * already synced). On success, records exactly what was confirmed sent.
 */
export async function pushToCloud(userId: string): Promise<void> {
  // Independent of the gear/trip tables below (its own row, no baseline/FK
  // relationship to any of them) -- rides this same debounced push cycle
  // purely so a category rename/add/remove doesn't need its own separate
  // scheduling path. Best-effort: must never abort the gear/trip push below,
  // which is what pushToCloud's callers actually depend on succeeding.
  try {
    await pushCategoriesToCloud(userId);
  } catch (err) {
    console.warn('[sync] categories push failed', err);
  }

  const s = useGearStore.getState();
  const mine = (ownerId?: string) => !ownerId || ownerId === userId;

  // Demo is onboarding content, never synced -- a brand-new signup with only
  // the seed pushes nothing, and no stray dirty flag can ever upload it over
  // a real account (this is what let a logout wipe an account previously:
  // resetLocal's reseed got treated as real data to push).
  const gearMine = s.gear.filter((it) => mine(it.ownerId) && !it.isDemo);
  const tripsMine = s.trips.filter((it) => mine(it.ownerId) && !it.isDemo);
  const tripsMineIds = new Set(tripsMine.map((t) => t.id));
  // Bags/assignments can be the user's own even on a trip they don't own
  // (co-op packing), so scan every trip but keep only their own rows -- and
  // only when the PARENT trip is itself synced (a demo trip is never pushed,
  // so nothing on it can be, or the upsert would violate trip_id's foreign
  // key). isUuid guards the same thing for an assignment's gear_id: gear on a
  // demo trip, or a reference to demo gear, is never a real uuid.
  const bagsMine = s.trips
    .filter((t) => tripsMineIds.has(t.id))
    .flatMap((t) => t.bags.filter((b) => mine(b.ownerId)).map((bag) => ({ trip: t, bag })));
  const assignmentsMine = s.trips
    .filter((t) => tripsMineIds.has(t.id))
    .flatMap((t) =>
      t.assignments
        .filter((a) => mine(a.ownerId) && isUuid(a.gearId) && isUuid(a.bagId))
        .map((assignment) => ({ trip: t, assignment })),
    );

  const gearToUpsert = gearMine.filter((it) => s.syncBaseline[it.id] !== hashGear(it));
  const tripsToUpsert = tripsMine.filter((it) => s.syncBaseline[it.id] !== hashTrip(it));
  const bagsToUpsert = bagsMine.filter(({ bag }) => s.syncBaseline[bag.id] !== hashBag(bag));
  const assignmentsToUpsert = assignmentsMine.filter(
    ({ assignment }) => s.syncBaseline[assignment.id] !== hashAssignment(assignment),
  );

  // Parents before children (FK order); upsert-by-id is safe to re-run.
  if (gearToUpsert.length) {
    const { error } = await supabase.from('gear_items').upsert(gearToUpsert.map((it) => toGearRow(userId, it)));
    if (error) throw error;
  }
  if (tripsToUpsert.length) {
    const { error } = await supabase.from('trips').upsert(tripsToUpsert.map((it) => toTripRow(userId, it)));
    if (error) throw error;
  }
  if (bagsToUpsert.length) {
    const { error } = await supabase
      .from('bags')
      .upsert(bagsToUpsert.map(({ trip, bag }) => toBagRow(userId, trip.id, bag)));
    if (error) throw error;
  }
  if (assignmentsToUpsert.length) {
    const { error } = await supabase
      .from('assignments')
      .upsert(assignmentsToUpsert.map(({ trip, assignment }) => toAssignmentRow(userId, trip.id, assignment)));
    if (error) throw error;
  }

  // Soft-deletes. RLS (user_id = auth.uid()) scopes this to the caller's own
  // rows regardless -- a stray id here (should never happen; the UI never
  // lets you remove someone else's row) just affects zero rows.
  const nowIso = new Date().toISOString();
  const { pendingDeletes } = s;
  if (pendingDeletes.assignments.length) {
    const { error } = await supabase
      .from('assignments')
      .update({ deleted_at: nowIso })
      .in('id', pendingDeletes.assignments)
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (pendingDeletes.bags.length) {
    const { error } = await supabase
      .from('bags')
      .update({ deleted_at: nowIso })
      .in('id', pendingDeletes.bags)
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (pendingDeletes.trips.length) {
    const { error } = await supabase
      .from('trips')
      .update({ deleted_at: nowIso })
      .in('id', pendingDeletes.trips)
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (pendingDeletes.gear_items.length) {
    const { error } = await supabase
      .from('gear_items')
      .update({ deleted_at: nowIso })
      .in('id', pendingDeletes.gear_items)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // Everything above either threw (caller never sees a false "success") or
  // fully landed -- record it. Confirmed rows get their hash baselined so the
  // NEXT push only sends what changes after this point; confirmed deletes are
  // cleared so they're never re-sent.
  useGearStore.setState((cur) => {
    const nextBaseline = { ...cur.syncBaseline };
    for (const it of gearToUpsert) nextBaseline[it.id] = hashGear(it);
    for (const it of tripsToUpsert) nextBaseline[it.id] = hashTrip(it);
    for (const { bag } of bagsToUpsert) nextBaseline[bag.id] = hashBag(bag);
    for (const { assignment } of assignmentsToUpsert) nextBaseline[assignment.id] = hashAssignment(assignment);
    for (const table of SYNC_TABLES) {
      for (const id of pendingDeletes[table]) delete nextBaseline[id];
    }
    return { syncBaseline: nextBaseline, pendingDeletes: emptyPendingDeletes() };
  });
}

/**
 * Merges cloud state into local, per row -- never a wholesale replace. For
 * each id the cloud returns:
 *  - a tombstone (deleted_at set) removes it locally;
 *  - otherwise, LOCAL wins only when there is POSITIVE EVIDENCE it changed
 *    since the last confirmed sync (syncBaseline has an entry for this id AND
 *    the row's current hash no longer matches it) -- otherwise the cloud
 *    value is adopted.
 *
 * That "local wins only with evidence" rule is what a device syncing a row
 * for the very FIRST time (no baseline entry yet) can never satisfy, so it
 * always defers to the cloud on a first encounter. That single rule is what
 * stops a stale or freshly-reset device from overwriting a healthy account's
 * newer cloud data the moment it (re)connects -- which is exactly the
 * mechanism behind three real incidents this sync layer used to allow.
 *
 * Any local (owned) row the cloud fetch doesn't mention at ALL -- not live,
 * not a tombstone -- is left untouched: absence is never treated as deletion.
 * That's what protects a brand-new, not-yet-pushed row (and anything a
 * transient/partial fetch happened to miss). This only applies to the
 * user's OWN rows; a shared trip (or a teammate's bag/assignment on it) that
 * stops appearing is deliberately dropped -- that's what "no longer shared
 * with me" looks like, and there's no local edit of someone else's data to
 * protect.
 */
export async function pullFromCloud(
  userId: string,
  opts?: {
    // Optional extra safety net, checked immediately before applying.
    // Kept for defense-in-depth, but no longer load-bearing: the merge below
    // is already safe against a concurrent edit, because local state is read
    // AFTER the network fetch and the whole merge computation runs
    // synchronously (no `await` in between) -- there is no window left where
    // a user edit could land mid-merge.
    skipApplyIf?: () => boolean;
    // Called with true right before setState and false right after, so a
    // caller can flag "this store change is a remote pull, not a user edit"
    // for exactly the synchronous window of the write.
    markApplying?: (v: boolean) => void;
  },
): Promise<boolean> {
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

  // Read local AFTER the fetch so an edit that landed while it was in flight
  // is included in the merge below, rather than needing special handling.
  const s = useGearStore.getState();
  const mine = (ownerId?: string) => !ownerId || ownerId === userId;
  const baseline = s.syncBaseline;

  const nextBaseline: Record<string, string> = { ...baseline };
  const nextPendingDeletes: PendingDeletes = {
    gear_items: [...s.pendingDeletes.gear_items],
    trips: [...s.pendingDeletes.trips],
    bags: [...s.pendingDeletes.bags],
    assignments: [...s.pendingDeletes.assignments],
  };
  const dropBaseline = (id: string) => {
    delete nextBaseline[id];
  };
  const dropPendingDelete = (table: SyncTable, id: string) => {
    nextPendingDeletes[table] = nextPendingDeletes[table].filter((x) => x !== id);
  };
  // A row is locally-dirty-with-evidence only when a PRIOR confirmed sync
  // exists for it and its content has since diverged from that baseline --
  // never merely because no baseline exists yet (see the function doc above).
  const evidencedDirty = (id: string, isMine: boolean, currentHash: string) =>
    isMine && baseline[id] !== undefined && baseline[id] !== currentHash;

  // ---- gear_items ----
  const localGearById = new Map(s.gear.map((it) => [it.id, it]));
  const seenGearIds = new Set<string>();
  const gear: GearItem[] = [];
  const sharedGearById: Record<string, GearItem> = {};
  for (const r of gearRes.data ?? []) {
    if (r.is_demo) continue; // demo is never part of cloud sync, even a stray leftover row
    const isMine = r.user_id === userId;
    seenGearIds.add(r.id);
    if (!isMine) {
      if (!r.deleted_at) {
        sharedGearById[r.id] = {
          id: r.id,
          brand: r.brand ?? '',
          name: r.name,
          category: r.category,
          weightLb: Number(r.weight_lb),
          quantity: r.quantity,
          notes: r.notes ?? undefined,
          expiration: r.expiration ?? undefined,
          photoUri: r.photo_uri ?? undefined,
          emoji: r.emoji ?? undefined,
          catalogProductId: r.catalog_product_id ?? undefined,
          isDemo: false,
          ownerId: r.user_id,
        };
      }
      continue;
    }
    if (r.deleted_at) {
      dropBaseline(r.id);
      dropPendingDelete('gear_items', r.id);
      continue;
    }
    const local = localGearById.get(r.id);
    if (local && evidencedDirty(r.id, isMine, hashGear(local))) {
      gear.push(local);
      continue;
    }
    const adopted: GearItem = {
      id: r.id,
      brand: r.brand ?? '',
      name: r.name,
      category: r.category,
      weightLb: Number(r.weight_lb),
      quantity: r.quantity,
      notes: r.notes ?? undefined,
      expiration: r.expiration ?? undefined,
      photoUri: r.photo_uri ?? undefined,
      emoji: r.emoji ?? undefined,
      catalogProductId: r.catalog_product_id ?? undefined,
      isDemo: false,
      ownerId: r.user_id,
    };
    gear.push(adopted);
    nextBaseline[r.id] = hashGear(adopted);
  }
  for (const it of s.gear) {
    if (it.isDemo) {
      gear.push(it); // demo always stays exactly as-is locally, untouched by sync
    } else if (!seenGearIds.has(it.id)) {
      gear.push(it); // absence rule: mine, but cloud never mentioned it -- keep
    }
  }

  // ---- trips (metadata only; bags/assignments are merged separately below
  // and reattached during final assembly) ----
  const localTripsById = new Map(s.trips.map((t) => [t.id, t]));
  const seenTripIds = new Set<string>();
  const mergedTrips = new Map<string, Trip>(); // final trip objects (mine + shared), bags/assignments filled in later
  for (const r of tripsRes.data ?? []) {
    if (r.is_demo) continue;
    const isMine = r.user_id === userId;
    seenTripIds.add(r.id);
    if (r.deleted_at) {
      if (isMine) {
        dropBaseline(r.id);
        dropPendingDelete('trips', r.id);
      }
      continue;
    }
    const remote: Trip = {
      id: r.id,
      name: r.name,
      location: r.location ?? '',
      locationLat: r.location_lat ?? undefined,
      locationLon: r.location_lon ?? undefined,
      startDate: r.start_date ?? '',
      endDate: r.end_date ?? '',
      bags: [],
      assignments: [],
      isDemo: false,
      ownerId: r.user_id,
      shared: !isMine,
      shareToken: r.share_token ?? undefined,
    };
    const local = localTripsById.get(r.id);
    if (isMine && local && evidencedDirty(r.id, isMine, hashTrip(local))) {
      mergedTrips.set(r.id, { ...local, bags: [], assignments: [] });
      continue;
    }
    mergedTrips.set(r.id, remote);
    if (isMine) nextBaseline[r.id] = hashTrip(remote);
  }
  for (const t of s.trips) {
    if (t.isDemo) continue; // reattached wholesale at the very end
    if (!seenTripIds.has(t.id) && mine(t.ownerId)) {
      mergedTrips.set(t.id, { ...t, bags: [], assignments: [] }); // absence rule, mine only
    }
    // Not mine and absent from the fetch: lost visibility (unshared, removed
    // as a member, or the owner deleted it) -- correctly drop it by simply
    // not re-adding it.
  }

  // ---- bags (flat merge by id, regrouped by trip_id) ----
  const localBagsById = new Map<string, Bag>();
  for (const t of s.trips) for (const bag of t.bags) localBagsById.set(bag.id, bag);
  const seenBagIds = new Set<string>();
  const bagsByTrip = new Map<string, Bag[]>();
  const pushBag = (tripId: string, bag: Bag) => bagsByTrip.set(tripId, [...(bagsByTrip.get(tripId) ?? []), bag]);
  for (const r of bagsRes.data ?? []) {
    const isMine = r.user_id === userId;
    seenBagIds.add(r.id);
    if (r.deleted_at) {
      if (isMine) {
        dropBaseline(r.id);
        dropPendingDelete('bags', r.id);
      }
      continue;
    }
    const local = localBagsById.get(r.id);
    if (local && evidencedDirty(r.id, isMine, hashBag(local))) {
      pushBag(r.trip_id, local);
      continue;
    }
    const adopted: Bag = { id: r.id, label: r.label, maxWeightLb: Number(r.max_weight_lb), color: r.color, ownerId: r.user_id };
    pushBag(r.trip_id, adopted);
    if (isMine) nextBaseline[r.id] = hashBag(adopted);
  }
  for (const t of s.trips) {
    for (const bag of t.bags) {
      if (!seenBagIds.has(bag.id) && mine(bag.ownerId)) pushBag(t.id, bag);
    }
  }

  // ---- assignments (flat merge by id, regrouped by trip_id) ----
  const localAssignmentsById = new Map<string, Assignment>();
  for (const t of s.trips) for (const a of t.assignments) localAssignmentsById.set(a.id, a);
  const seenAssignmentIds = new Set<string>();
  const assignmentsByTrip = new Map<string, Assignment[]>();
  const pushAssignment = (tripId: string, a: Assignment) =>
    assignmentsByTrip.set(tripId, [...(assignmentsByTrip.get(tripId) ?? []), a]);
  for (const r of assignmentsRes.data ?? []) {
    const isMine = r.user_id === userId;
    seenAssignmentIds.add(r.id);
    if (r.deleted_at) {
      if (isMine) {
        dropBaseline(r.id);
        dropPendingDelete('assignments', r.id);
      }
      continue;
    }
    const local = localAssignmentsById.get(r.id);
    if (local && evidencedDirty(r.id, isMine, hashAssignment(local))) {
      pushAssignment(r.trip_id, local);
      continue;
    }
    const adopted: Assignment = {
      id: r.id,
      gearId: r.gear_id,
      bagId: r.bag_id,
      quantity: r.quantity,
      status: r.status,
      statusReason: r.status_reason ?? undefined,
      ownerId: r.user_id,
    };
    pushAssignment(r.trip_id, adopted);
    if (isMine) nextBaseline[r.id] = hashAssignment(adopted);
  }
  for (const t of s.trips) {
    for (const a of t.assignments) {
      if (!seenAssignmentIds.has(a.id) && mine(a.ownerId)) pushAssignment(t.id, a);
    }
  }

  // ---- final assembly ----
  const trips: Trip[] = [];
  for (const [id, trip] of mergedTrips) {
    trips.push({ ...trip, bags: bagsByTrip.get(id) ?? [], assignments: assignmentsByTrip.get(id) ?? [] });
  }
  for (const t of s.trips) {
    if (t.isDemo) trips.push(t); // demo trips stay exactly as they are locally
  }

  if (opts?.skipApplyIf?.()) return false;

  // markApplying brackets ONLY this synchronous write, so the store
  // subscriber ignores it as non-user-edit.
  opts?.markApplying?.(true);
  useGearStore.setState({
    gear,
    trips,
    sharedGearById,
    syncBaseline: nextBaseline,
    pendingDeletes: nextPendingDeletes,
  });
  opts?.markApplying?.(false);
  return true;
}

/**
 * Runs once per login. Both directions are now non-destructive -- pull merges
 * per row instead of replacing, and push only ever upserts a row's own
 * content or soft-deletes what was explicitly removed -- so there's no
 * fragile "pick a direction or risk clobbering" decision left to make: pull
 * first (learn what the cloud has, keeping anything genuinely dirty locally),
 * then push (flush whatever's still unsynced after that). The one remaining
 * special case is a genuinely virgin cloud (first sync ever for this
 * account): merging against nothing would just be a no-op, so go straight to
 * push, which uploads local (demo excluded, per pushToCloud's own filter --
 * so a brand-new account with only the seed pushes nothing at all).
 *
 * The cloud-empty check counts ALL of the user's own rows, tombstones
 * included -- an account that once had data and deleted everything is NOT
 * "virgin," and must still go through the safe merge path so a stale device
 * learns about those deletions, rather than being routed to a raw push that
 * would just re-upload its stale pre-deletion copy.
 */
export async function syncOnLogin(userId: string): Promise<void> {
  ensureLocalOwnedBy(userId);

  const [gearRes, tripsRes] = await Promise.all([
    supabase.from('gear_items').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('trips').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  if (gearRes.error) throw gearRes.error;
  if (tripsRes.error) throw tripsRes.error;

  const cloudHasData = (gearRes.count ?? 0) > 0 || (tripsRes.count ?? 0) > 0;

  if (!cloudHasData) {
    // Genuinely new account, or a returning one that has deleted everything
    // it owns -- either way, show something instead of a blank library.
    const cur = useGearStore.getState();
    const hasRealContent = cur.gear.some((it) => !it.isDemo) || cur.trips.some((t) => !t.isDemo);
    if (!hasRealContent) useGearStore.getState().seedDemoData();
  } else {
    await pullFromCloud(userId);
  }
  // Runs AFTER seedDemoData() above (so its customCategories reset can never
  // clobber what this pulls down) but BEFORE the push below (so an account
  // whose gear/trips are empty but which already has real cloud categories --
  // e.g. this is the very first sync since those categories were created --
  // never has them overwritten by this device's un-merged local list before
  // it's even seen the cloud's copy). Best-effort: a failure here (e.g.
  // offline) must never stop the more important gear/trip sync from
  // finalizing below.
  try {
    await pullCategoriesFromCloud(userId);
  } catch (err) {
    console.warn('[sync] categories pull failed', err);
  }
  await pushToCloud(userId);
  useGearStore.getState().setSyncDirty(false);
  useGearStore.getState().setSyncedForUserId(userId);
}

/**
 * Local storage is one browser-wide store, not scoped per Supabase user. If
 * the local data was last confirmed for a DIFFERENT user than the one
 * signing in now (switched accounts in the same browser without -- or before
 * -- a clean logout), treat it exactly like a logout: reset to empty rather
 * than let the new session inherit, or worse upload, a stranger's data.
 *
 * A null syncedForUserId (fresh install, or right after resetLocal) is NOT
 * treated as a mismatch -- there's nothing to protect against yet, and
 * demo-seeded local state from a truly fresh install should survive this
 * check untouched.
 *
 * Synchronous and cheap (resetLocal's set() call has no network step), so
 * every entry point that's about to read or write local gear/trip data on
 * behalf of a specific user should call this FIRST -- syncOnLogin does, and
 * so does joinTripByToken, since /join/[token] is reachable without ever
 * mounting the layout that runs syncOnLogin (see sharing.ts).
 */
export function ensureLocalOwnedBy(userId: string): void {
  const current = useGearStore.getState().syncedForUserId;
  if (current && current !== userId) {
    useGearStore.getState().resetLocal();
  }
}
