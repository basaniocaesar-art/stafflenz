-- Adds a `monitoring_paused` flag on locations so the HCT worker can skip
-- capturing for any location that's been temporarily paused via the UI.
-- 2026-06-23

alter table public.locations
  add column if not exists monitoring_paused boolean not null default false;

-- Tiny audit columns so we know who paused it and when (handy in support
-- conversations).
alter table public.locations
  add column if not exists paused_at        timestamptz,
  add column if not exists paused_by_user   uuid references public.users(id);
