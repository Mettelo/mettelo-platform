-- Phase 7: publish only canonical projects created by the Project Library import,
-- while preserving every pre-import project's lifecycle state.
-- Also align project-role discovery RLS with the public project lifecycle states
-- already supported by the projects table and catalogue (including open/forming).
--
-- The private import baseline exists in production but is intentionally absent from
-- disposable CI databases. Keep the publication DML conditional so the versioned
-- migration remains replayable in both environments; the RLS policy changes always
-- apply.

do $$
begin
  if to_regclass('private_import.project_identity_baseline') is not null then
    update public.projects p
    set visibility = 'public',
        status = 'open',
        applications_open = true,
        updated_at = now()
    where p.canonical_project_key is not null
      and p.visibility = 'private'
      and p.status = 'draft'
      and coalesce(p.applications_open, false) = false
      and not exists (
        select 1
        from private_import.project_identity_baseline b
        where b.project_id = p.id
      );
  end if;
end
$$;

drop policy if exists "project roles readable anon" on public.project_roles;
create policy "project roles readable anon"
on public.project_roles
for select
to anon
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_roles.project_id
      and p.visibility = 'public'
      and p.status = any (array[
        'pilot'::text,
        'recruiting'::text,
        'open'::text,
        'forming'::text,
        'active'::text,
        'review'::text,
        'completed'::text
      ])
  )
);

drop policy if exists "project roles readable authenticated" on public.project_roles;
create policy "project roles readable authenticated"
on public.project_roles
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_roles.project_id
      and (
        (
          p.visibility = 'public'
          and p.status = any (array[
            'pilot'::text,
            'recruiting'::text,
            'open'::text,
            'forming'::text,
            'active'::text,
            'review'::text,
            'completed'::text
          ])
        )
        or p.visibility = 'members'
        or public.is_project_member(p.id)
      )
  )
  or public.is_admin()
);
