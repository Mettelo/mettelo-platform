drop policy if exists "public projects readable anon" on public.projects;
create policy "public projects readable anon"
on public.projects
for select
to anon
using (
  visibility = 'public'
  and status = any (array['pilot'::text,'recruiting'::text,'open'::text,'forming'::text,'active'::text,'review'::text,'completed'::text])
);

drop policy if exists "projects readable authenticated" on public.projects;
create policy "projects readable authenticated"
on public.projects
for select
to authenticated
using (
  (
    visibility = 'public'
    and status = any (array['pilot'::text,'recruiting'::text,'open'::text,'forming'::text,'active'::text,'review'::text,'completed'::text])
  )
  or visibility = 'members'
  or is_project_member(id)
  or is_admin()
);
