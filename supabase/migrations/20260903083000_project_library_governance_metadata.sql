-- Complete the canonical workbook metadata contract without creating a parallel project system.
-- These fields preserve approved editorial/pathway/governance data that must not be silently dropped.

alter table public.project_problem_briefs
  add column if not exists career_domain_path text,
  add column if not exists target_role text,
  add column if not exists path_project_number text,
  add column if not exists path_stage text,
  add column if not exists competency_focus text,
  add column if not exists capability_built text,
  add column if not exists prerequisite_prior_project text,
  add column if not exists path_outcome text,
  add column if not exists content_quality_status text,
  add column if not exists director_review_note text;

alter table public.project_data_sources
  add column if not exists may_redistribute boolean,
  add column if not exists commercial_reuse text,
  add column if not exists attribution_required text,
  add column if not exists recommended_archive_format text,
  add column if not exists preservation_action text,
  add column if not exists legal_review_basis text,
  add column if not exists last_classification_review text,
  add column if not exists preservation_mode text;

comment on column public.project_problem_briefs.career_domain_path is 'Canonical Career / Domain Path from the approved Mettelo Project Library workbook.';
comment on column public.project_problem_briefs.target_role is 'Canonical target professional role from the approved workbook.';
comment on column public.project_problem_briefs.path_project_number is 'Project sequence/number inside the canonical capability path.';
comment on column public.project_problem_briefs.path_stage is 'Canonical pathway stage from the approved workbook.';
comment on column public.project_problem_briefs.competency_focus is 'Canonical competency focus from the approved workbook.';
comment on column public.project_problem_briefs.capability_built is 'Canonical capability outcome/built statement from the approved workbook.';
comment on column public.project_problem_briefs.prerequisite_prior_project is 'Canonical prerequisite/prior-project guidance from the approved workbook.';
comment on column public.project_problem_briefs.path_outcome is 'Canonical pathway outcome from the approved workbook.';
comment on column public.project_problem_briefs.content_quality_status is 'Editorial quality status from the approved project library.';
comment on column public.project_problem_briefs.director_review_note is 'Director quality-review note from the approved project library.';
comment on column public.project_data_sources.may_redistribute is 'Whether Mettelo may redistribute the reviewed preserved dataset to members.';
comment on column public.project_data_sources.commercial_reuse is 'Recorded commercial reuse position from workbook governance.';
comment on column public.project_data_sources.attribution_required is 'Recorded attribution requirement from workbook governance.';
comment on column public.project_data_sources.recommended_archive_format is 'Recommended archive format from dataset preservation governance.';
comment on column public.project_data_sources.preservation_action is 'Required preservation action from dataset governance.';
comment on column public.project_data_sources.legal_review_basis is 'Recorded legal review basis supporting the classification.';
comment on column public.project_data_sources.last_classification_review is 'Last recorded classification review value from the workbook.';
comment on column public.project_data_sources.preservation_mode is 'FULL/SUBSET/other canonical preservation mode from the workbook.';
