-- A single emoji shown in the gear-row thumbnail in place of the generic
-- placeholder icon when the item has no photo -- entered via the device's
-- own emoji keyboard, so there's no icon-picker UI to build or maintain.
alter table public.gear_items
  add column emoji text;
