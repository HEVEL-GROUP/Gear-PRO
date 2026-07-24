-- Soft-delete + hard-delete lockout, for per-row last-writer-wins sync.
--
-- Context: sync today is whole-account mirror (push = upsert mine + hard-DELETE
-- every cloud row not in local; pull = replace local with cloud). That "delete
-- everything not present locally" step is what caused three real data-loss
-- incidents (a stale/reset local state got treated as the truth and wiped
-- rows). This migration is step 1 of moving to per-row sync: every row can
-- still be "deleted" from the app's point of view, but the database will
-- never again let a client hard-DELETE a row -- only mark it deleted_at and
-- keep it (as a tombstone) so other devices learn about the deletion instead
-- of the row just vanishing with no trace.
--
-- Note: gear_items.updated_at / trips.updated_at / bags.updated_at /
-- assignments.updated_at already exist, and a BEFORE UPDATE trigger
-- (set_updated_at(), added in 001_initial_schema) already unconditionally
-- stamps them with the SERVER clock (`new.updated_at = now()`) on every
-- update, ignoring whatever the client sends. That means these columns are
-- already a client-clock-skew-proof ordering key with zero migration needed --
-- the sync client just has to start actually reading/using it, which is a
-- code change, not a schema change.
--
-- service_role (used by the delete-account Edge Function for a genuine,
-- permanent account wipe) is untouched -- only anon/authenticated lose DELETE.

-- 1) Soft-delete marker on all four synced tables.
alter table public.gear_items  add column if not exists deleted_at timestamptz;
alter table public.trips        add column if not exists deleted_at timestamptz;
alter table public.bags         add column if not exists deleted_at timestamptz;
alter table public.assignments  add column if not exists deleted_at timestamptz;

-- 2) Lock out hard deletes for real client roles. A client's DELETE now fails
-- outright (permission denied) instead of either (a) actually destroying the
-- row, or (b) being "helpfully" auto-converted into an UPDATE stamped with a
-- fresh now() -- that conversion was considered and rejected: it would make a
-- stale/out-of-date client's hard-delete-of-a-row-it-doesn't-know-about look
-- like the NEWEST edit to that row once converted, which would let it win
-- last-writer-wins and delete the row for real, everywhere. Failing loudly
-- instead means a client that hasn't upgraded to soft-delete semantics simply
-- can't delete anything server-side (its own upserts still land fine) until
-- it upgrades.
revoke delete on public.gear_items, public.trips, public.bags, public.assignments
  from anon, authenticated;

-- 3) Drop the now-inert DELETE policies (revoke above already blocks the
-- statement before RLS is even evaluated; these are dead weight).
drop policy if exists gear_items_delete   on public.gear_items;
drop policy if exists trips_delete         on public.trips;
drop policy if exists bags_delete          on public.bags;
drop policy if exists assignments_delete   on public.assignments;

-- Note: no RLS change needed to ALLOW soft-delete. The existing UPDATE
-- policies (`user_id = auth.uid()`, both USING and WITH CHECK) already let a
-- user update deleted_at on their own rows -- an UPDATE policy doesn't
-- restrict which columns are touched, only which rows. Shared-trip SELECT
-- policies are untouched: a tombstoned row must stay SELECTable so other
-- devices/teammates can see deleted_at and drop the row locally -- filtering
-- it out at the RLS layer would stop the deletion from ever propagating.

-- 4) Indexes: cheap at GearPro's current scale, but avoid a sequential scan
-- over tombstones (and over a user's live rows) as the accounts/gear grow.
create index if not exists gear_items_user_deleted_idx  on public.gear_items  (user_id, deleted_at);
create index if not exists trips_user_deleted_idx        on public.trips        (user_id, deleted_at);
create index if not exists bags_user_deleted_idx         on public.bags         (user_id, deleted_at);
create index if not exists assignments_user_deleted_idx  on public.assignments  (user_id, deleted_at);

-- Tombstone garbage collection (permanently purging old deleted_at rows) is
-- deliberately NOT included here -- at GearPro's current scale (low hundreds
-- of rows across all accounts) unbounded tombstone growth is a non-issue for
-- years. Add a scheduled cleanup later if row counts ever justify it.
