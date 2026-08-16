-- Phase 3 career discovery defaults for roles created before the new fields existed.

alter table public.career_roles
  alter column expected_response_days set default 14;

update public.career_roles
set expected_response_days = 14
where expected_response_days is null;

update public.career_roles
set eligibility = 'Review the published requirements for this role. No additional eligibility restrictions are specified beyond those requirements.'
where eligibility is null or btrim(eligibility) = '';

update public.career_roles
set application_process = 'Apply and review your submission before confirming. Mettelo then reviews your application, shortlists suitable candidates, arranges interviews where relevant, and communicates the final outcome.'
where application_process is null or btrim(application_process) = '';
