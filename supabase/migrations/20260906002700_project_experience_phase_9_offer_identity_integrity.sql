-- Phase 9 Offer identity integrity.
--
-- project_offers denormalizes application/project/member identity for efficient
-- lifecycle and capacity operations. Those identity columns must never drift
-- after creation; otherwise a response could acquire the lock for one project
-- and later observe an Offer moved to another project. project_run_id may be
-- attached later when an accepted reservation becomes canonical membership, but
-- any attached run must belong to the same project.

create or replace function public.phase9_validate_offer_identity()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  app_project_id uuid;
  app_user_id uuid;
  run_project_id uuid;
begin
  if tg_op='UPDATE' then
    if new.application_id is distinct from old.application_id
       or new.project_id is distinct from old.project_id
       or new.user_id is distinct from old.user_id then
      raise exception using errcode='23514',message='OFFER_IDENTITY_IMMUTABLE';
    end if;
  end if;

  select a.project_id,a.user_id
  into app_project_id,app_user_id
  from public.project_applications a
  where a.id=new.application_id;

  if app_project_id is null then
    raise exception using errcode='23514',message='OFFER_APPLICATION_INVALID';
  end if;
  if app_project_id<>new.project_id or app_user_id<>new.user_id then
    raise exception using errcode='23514',message='OFFER_APPLICATION_IDENTITY_MISMATCH';
  end if;

  if new.project_run_id is not null then
    select r.project_id into run_project_id
    from public.project_runs r
    where r.id=new.project_run_id;
    if run_project_id is null or run_project_id<>new.project_id then
      raise exception using errcode='23514',message='OFFER_RUN_PROJECT_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.phase9_validate_offer_identity() from public,anon,authenticated;

drop trigger if exists project_offer_phase9_identity_integrity on public.project_offers;
create trigger project_offer_phase9_identity_integrity
before insert or update of application_id,project_id,user_id,project_run_id
on public.project_offers
for each row execute function public.phase9_validate_offer_identity();
