-- Phase 3: Careers & Recruitment
-- Structured discovery, interview, offer and post-hire onboarding state.

alter table public.career_roles
  add column if not exists eligibility text,
  add column if not exists expected_response_days integer check (expected_response_days is null or expected_response_days > 0),
  add column if not exists application_process text;

alter table public.career_applications
  add column if not exists interview_timezone text,
  add column if not exists interview_format text,
  add column if not exists interview_url text,
  add column if not exists interviewer text,
  add column if not exists interview_instructions text,
  add column if not exists offer_salary_rate text,
  add column if not exists offer_start_date date,
  add column if not exists offer_employment_type text,
  add column if not exists offer_manager text,
  add column if not exists offer_working_arrangement text,
  add column if not exists offer_conditions text,
  add column if not exists offer_acceptance_deadline timestamptz,
  add column if not exists offer_personal_message text,
  add column if not exists withdrawn_at timestamptz;

create table if not exists public.career_onboarding_items (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.career_applications(id) on delete cascade,
  item_key text not null,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','completed','not_required')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(application_id,item_key)
);

create index if not exists idx_career_onboarding_application on public.career_onboarding_items(application_id,created_at);
alter table public.career_onboarding_items enable row level security;

drop policy if exists "members can view own career onboarding" on public.career_onboarding_items;
create policy "members can view own career onboarding"
on public.career_onboarding_items for select to authenticated
using (
  exists (
    select 1 from public.career_applications ca
    where ca.id=application_id and ca.user_id=(select auth.uid())
  )
);

drop policy if exists "admins manage career onboarding" on public.career_onboarding_items;
create policy "admins manage career onboarding"
on public.career_onboarding_items for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.communication_templates
  (template_key,journey,name,description,send_mode,subject_template,body_template,cta_label,cta_url_template,variables)
values
  ('career_withdrawn','Careers','Career application withdrawn','Confirmation after a candidate withdraws their own application.','automatic','Your application for {{role_title}} has been withdrawn','Your application for {{role_title}} has been withdrawn. No further recruitment action is required. You can continue using My Mettelo and apply for another suitable role at any time.','View Careers','/careers','["recipient_name","role_title"]')
on conflict (template_key) do nothing;

insert into public.communication_template_versions
  (template_id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,change_note)
select id,version,subject_template,body_template,cta_label,cta_url_template,send_mode,active,'Phase 3 career withdrawal default'
from public.communication_templates t
where t.template_key='career_withdrawn'
  and not exists (
    select 1 from public.communication_template_versions v
    where v.template_id=t.id and v.version=t.version
  );
