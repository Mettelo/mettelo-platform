-- Restore table privileges that existing hosted RLS policies already assume.
-- A fresh migration-only database must not depend on unversioned hosted grants.
-- RLS remains the row-level authority; these grants only make the matching policies reachable.

grant select on public.platform_settings to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.contributions to anon, authenticated;
grant select, update on public.notifications to authenticated;
