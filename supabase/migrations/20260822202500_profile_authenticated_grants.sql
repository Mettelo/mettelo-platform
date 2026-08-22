-- Reconstruct the hosted profile write privileges on clean environments.
-- Row-level security remains authoritative: authenticated members can only
-- insert/update their own profile through the existing owner policies.
grant select, insert, update on table public.profiles to authenticated;
