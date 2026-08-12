begin;

-- Phase 1: project-run helper functions are internal implementation details.
-- Only the two membership predicates are callable by signed-in clients because
-- RLS policies evaluate them. Trigger helpers and run resolution are not RPCs.
revoke execute on function public.is_project_run_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_project_run_lead(uuid) from public, anon, authenticated;
grant execute on function public.is_project_run_member(uuid) to authenticated, service_role;
grant execute on function public.is_project_run_lead(uuid) to authenticated, service_role;

revoke execute on function public.resolve_project_run(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.set_project_run_from_actor() from public, anon, authenticated;
revoke execute on function public.keep_open_project_available() from public, anon, authenticated;
grant execute on function public.resolve_project_run(uuid, uuid) to service_role;
grant execute on function public.set_project_run_from_actor() to service_role;
grant execute on function public.keep_open_project_available() to service_role;

-- Run-aware author/lead editing for messages.
drop policy if exists "project discussions editable by author or lead" on public.project_discussions;
create policy "project discussions editable by author or run lead"
on public.project_discussions for update to authenticated
using (
  public.is_admin()
  or (
    auth.uid() = author_user_id
    and case
      when project_run_id is not null then public.is_project_run_member(project_run_id)
      else public.is_project_member(project_id)
    end
  )
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
)
with check (
  public.is_admin()
  or (
    auth.uid() = author_user_id
    and case
      when project_run_id is not null then public.is_project_run_member(project_run_id)
      else public.is_project_member(project_id)
    end
  )
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

-- Run-aware meeting management.
drop policy if exists "project meetings deletable by leads" on public.project_meetings;
create policy "project meetings deletable by run leads"
on public.project_meetings for delete to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

drop policy if exists "project meetings updatable by leads" on public.project_meetings;
create policy "project meetings updatable by run leads"
on public.project_meetings for update to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
)
with check (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

-- Run-aware milestone management.
drop policy if exists "leads delete milestones" on public.project_milestones;
create policy "run leads delete milestones"
on public.project_milestones for delete to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

drop policy if exists "leads update milestones" on public.project_milestones;
create policy "run leads update milestones"
on public.project_milestones for update to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
)
with check (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

-- Run-aware task management while preserving assignee status updates.
drop policy if exists "leads delete tasks" on public.project_tasks;
create policy "run leads delete tasks"
on public.project_tasks for delete to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

drop policy if exists "leads or assignees update tasks" on public.project_tasks;
create policy "run leads or run assignees update tasks"
on public.project_tasks for update to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
  or (
    auth.uid() = assignee_user_id
    and case
      when project_run_id is not null then public.is_project_run_member(project_run_id)
      else public.is_project_member(project_id)
    end
  )
)
with check (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
  or (
    auth.uid() = assignee_user_id
    and case
      when project_run_id is not null then public.is_project_run_member(project_run_id)
      else public.is_project_member(project_id)
    end
  )
);

-- Run-aware resource deletion.
drop policy if exists "project resources manageable by author or lead" on public.project_resources;
create policy "project resources deletable by author or run lead"
on public.project_resources for delete to authenticated
using (
  public.is_admin()
  or (
    auth.uid() = added_by
    and case
      when project_run_id is not null then public.is_project_run_member(project_run_id)
      else public.is_project_member(project_id)
    end
  )
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

-- Run-aware presentation management.
drop policy if exists "project presentations updatable by leads" on public.project_presentations;
create policy "project presentations updatable by run leads"
on public.project_presentations for update to authenticated
using (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
)
with check (
  public.is_admin()
  or case
    when project_run_id is not null then public.is_project_run_lead(project_run_id)
    else public.is_project_lead(project_id)
  end
);

drop policy if exists "project presenters deletable by leads" on public.project_presenters;
create policy "project presenters deletable by run leads"
on public.project_presenters for delete to authenticated
using (
  exists (
    select 1
    from public.project_presentations pp
    where pp.id = project_presenters.presentation_id
      and (
        public.is_admin()
        or case
          when pp.project_run_id is not null then public.is_project_run_lead(pp.project_run_id)
          else public.is_project_lead(pp.project_id)
        end
      )
  )
);

drop policy if exists "project presenters insertable by leads" on public.project_presenters;
create policy "project presenters insertable by run leads"
on public.project_presenters for insert to authenticated
with check (
  exists (
    select 1
    from public.project_presentations pp
    where pp.id = project_presenters.presentation_id
      and (
        public.is_admin()
        or case
          when pp.project_run_id is not null then public.is_project_run_lead(pp.project_run_id)
          else public.is_project_lead(pp.project_id)
        end
      )
  )
);

-- Prevent ordinary users from moving collaboration records between projects or runs.
create or replace function public.prevent_project_scope_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if to_jsonb(new)->>'project_id' is distinct from to_jsonb(old)->>'project_id'
     or to_jsonb(new)->>'project_run_id' is distinct from to_jsonb(old)->>'project_run_id' then
    raise exception 'Project and project run cannot be reassigned';
  end if;

  return new;
end;
$$;

revoke execute on function public.prevent_project_scope_reassignment() from public, anon, authenticated;
grant execute on function public.prevent_project_scope_reassignment() to service_role;

do $$
declare relation_name text;
begin
  foreach relation_name in array array[
    'project_discussions',
    'project_resources',
    'project_meetings',
    'project_milestones',
    'project_tasks',
    'project_presentations',
    'contributions'
  ]
  loop
    execute format(
      'drop trigger if exists prevent_project_scope_reassignment on public.%I',
      relation_name
    );
    execute format(
      'create trigger prevent_project_scope_reassignment before update on public.%I for each row execute function public.prevent_project_scope_reassignment()',
      relation_name
    );
  end loop;
end;
$$;

commit;
