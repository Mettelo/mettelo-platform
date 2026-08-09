drop policy if exists "profiles readable by owner" on public.profiles;
create policy "public profiles readable anon" on public.profiles for select to anon using (is_public=true);
create policy "profiles readable authenticated" on public.profiles for select to authenticated using (is_public=true or (select auth.uid())=id or public.is_admin());
