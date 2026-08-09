-- Security hardening after Supabase database advisor review

-- is_admin only inspects the authenticated JWT and does not need elevated privileges.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- The auth trigger function should not be exposed as a callable RPC.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

-- Private intake tables are intentionally server-only. Make that explicit at the grant layer too.
revoke all on table public.form_submissions from anon, authenticated;
revoke all on table public.newsletter_subscribers from anon, authenticated;
