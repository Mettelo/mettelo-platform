-- Restore hosted privilege parity for member-managed profile taxonomy preferences.
-- RLS remains authoritative: authenticated members can only read/insert/delete rows
-- where user_id = auth.uid() under the policies defined in
-- 20260809072000_taxonomy_preferences_security.sql.

grant select, insert, update, delete, truncate, references, trigger
on table public.profile_domain_preferences
 to authenticated;

grant select, insert, update, delete, truncate, references, trigger
on table public.profile_tool_preferences
 to authenticated;
