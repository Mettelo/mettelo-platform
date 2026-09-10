-- Phase 18 Partner admission keeps the canonical review/Offer rule while
-- retaining the legacy constraint identifier in the diagnostic message for
-- older Phase 7 callers and tests that still key on that stable contract name.

create or replace function public.phase18_guard_partner_admission_mode()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.project_type='partner'
     and coalesce(new.admission_mode,'review_required')<>'review_required' then
    raise exception using
      errcode='23514',
      message='PARTNER_PROJECT_REQUIRES_REVIEW_OFFER [projects_partner_requires_review_check]';
  end if;
  return new;
end;
$$;

revoke all on function public.phase18_guard_partner_admission_mode() from public,anon,authenticated;

comment on function public.phase18_guard_partner_admission_mode() is
  'Phase 18 governance: Partner projects cannot use AUTO admission and must continue through canonical review and Offer acceptance; diagnostic retains the legacy Phase 7 contract identifier.';
