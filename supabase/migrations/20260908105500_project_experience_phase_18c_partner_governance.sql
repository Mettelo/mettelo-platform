-- Phase 18C partner recruitment governance.
-- Partner projects always retain human review + canonical Offer acceptance.

update public.projects
set admission_mode='review_required',updated_at=now()
where project_type='partner' and coalesce(admission_mode,'review_required')<>'review_required';

create or replace function public.phase18_guard_partner_admission_mode()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.project_type='partner' and coalesce(new.admission_mode,'review_required')<>'review_required' then
    raise exception using errcode='23514',message='PARTNER_PROJECT_REQUIRES_REVIEW_OFFER';
  end if;
  return new;
end;$$;
revoke all on function public.phase18_guard_partner_admission_mode() from public,anon,authenticated;

drop trigger if exists project_phase18_partner_admission_guard on public.projects;
create trigger project_phase18_partner_admission_guard
before insert or update of project_type,admission_mode on public.projects
for each row execute function public.phase18_guard_partner_admission_mode();

comment on function public.phase18_guard_partner_admission_mode() is 'Phase 18 governance: Partner projects cannot use AUTO admission and must continue through canonical review and Offer acceptance.';
