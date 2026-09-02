-- Canonical Project Library rows live at project scope, while execution rows remain run-scoped.
-- NULL run IDs are allowed only when a deterministic canonical child key is present.

alter table public.project_deliverables
  alter column project_run_id drop not null;
alter table public.project_deliverables drop constraint if exists project_deliverables_run_or_canonical_check;
alter table public.project_deliverables add constraint project_deliverables_run_or_canonical_check
  check (project_run_id is not null or canonical_item_key is not null);

alter table public.project_data_sources
  alter column project_run_id drop not null,
  alter column added_by drop not null;
alter table public.project_data_sources drop constraint if exists project_data_sources_run_or_canonical_check;
alter table public.project_data_sources add constraint project_data_sources_run_or_canonical_check
  check (project_run_id is not null or canonical_source_key is not null);
alter table public.project_data_sources drop constraint if exists project_data_sources_actor_or_canonical_check;
alter table public.project_data_sources add constraint project_data_sources_actor_or_canonical_check
  check (added_by is not null or canonical_source_key is not null);

comment on constraint project_deliverables_run_or_canonical_check on public.project_deliverables is
  'Execution deliverables require a run; workbook template deliverables require a canonical key.';
comment on constraint project_data_sources_run_or_canonical_check on public.project_data_sources is
  'Execution resources require a run; workbook template resources require a canonical key.';