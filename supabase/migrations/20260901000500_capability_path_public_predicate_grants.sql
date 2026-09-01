-- Capability Paths V1: allow public RLS policies to execute their safe predicate helpers.
-- Both helpers are SECURITY DEFINER and intentionally return only boolean policy predicates.
-- Anonymous callers can already discover published Paths; is_my_followed_capability_path()
-- always returns false when auth.uid() is null.

grant execute on function public.is_published_capability_path(uuid) to anon;
grant execute on function public.is_my_followed_capability_path(uuid) to anon;
