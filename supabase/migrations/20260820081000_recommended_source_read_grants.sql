-- Recommended reads Events and Spotlight with the signed-in member client.
-- Table privileges permit those reads; existing RLS policies remain authoritative
-- for which rows each authenticated member can see.

grant select on table public.events to authenticated;
grant select on table public.spotlights to authenticated;
