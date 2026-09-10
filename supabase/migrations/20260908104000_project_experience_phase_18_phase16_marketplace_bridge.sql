-- Project Experience Phase 18B: Phase 16 replacement -> canonical collaboration marketplace.
--
-- Phase 16 remains the authority for departures and replacement_needed. These
-- triggers project that existing state into project_collaboration_needs for the
-- SAME run. They never create a new run, Lab, application, Offer or membership path.

create or replace function public.phase18_sync_phase16_replacement_need()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  source_member public.project_members%rowtype;
  responsibility_row record;
  inserted_any boolean:=false;
  now_at timestamptz:=now();
begin
  if new.replacement_needed=false then
    update public.project_collaboration_needs
    set status='closed',closed_reason='phase16_replacement_filled',closed_at=coalesce(closed_at,now_at),updated_at=now_at
    where project_run_id=new.id and project_id=new.project_id and source='phase16_replacement' and status='active';
    return new;
  end if;

  if new.status<>'active' or coalesce(new.has_started,false)=false or coalesce(new.recruitment_open,true)=false then
    return new;
  end if;

  if new.replacement_source_membership_id is null then return new; end if;
  select * into source_member
  from public.project_members
  where id=new.replacement_source_membership_id and project_id=new.project_id and project_run_id=new.id;
  if source_member.id is null then return new; end if;

  for responsibility_row in
    select responsibility,source_project_role_id
    from public.project_member_responsibilities
    where project_member_id=source_member.id
      and project_id=new.project_id
      and project_run_id=new.id
      and assignment_status='released'
    order by released_at desc nulls last,assigned_at desc
  loop
    insert into public.project_collaboration_needs(
      project_id,project_run_id,created_by,source_project_role_id,responsibility,
      status,source,member_message
    ) values (
      new.project_id,new.id,source_member.user_id,responsibility_row.source_project_role_id,responsibility_row.responsibility,
      'active','phase16_replacement','This active project is recruiting a replacement collaborator for an open delivery responsibility.'
    )
    on conflict do nothing;
    if found then inserted_any:=true; end if;
  end loop;

  if not inserted_any and not exists(
    select 1 from public.project_collaboration_needs
    where project_run_id=new.id and source='phase16_replacement' and status='active'
  ) then
    insert into public.project_collaboration_needs(
      project_id,project_run_id,created_by,status,source,member_message
    ) values (
      new.project_id,new.id,source_member.user_id,'active','phase16_replacement',
      'This active project has released capacity and is recruiting a replacement collaborator.'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.phase18_sync_phase16_replacement_need() from public,anon,authenticated;

drop trigger if exists phase18_phase16_replacement_marketplace_sync_insert on public.project_runs;
create trigger phase18_phase16_replacement_marketplace_sync_insert
after insert on public.project_runs
for each row
when (new.replacement_needed=true)
execute function public.phase18_sync_phase16_replacement_need();

drop trigger if exists phase18_phase16_replacement_marketplace_sync_update on public.project_runs;
create trigger phase18_phase16_replacement_marketplace_sync_update
after update of replacement_needed,replacement_source_membership_id,recruitment_open,status on public.project_runs
for each row
when (
  new.replacement_needed=true
  or old.replacement_needed is distinct from new.replacement_needed
)
execute function public.phase18_sync_phase16_replacement_need();

comment on function public.phase18_sync_phase16_replacement_need() is
  'Projects canonical Phase 16 replacement_needed state into Phase 18 collaboration needs for the same run. No alternate replacement or admission system is created.';