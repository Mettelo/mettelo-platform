-- Canonical Project Library child keys are nullable for legacy/run-scoped rows,
-- but deterministic workbook rows use non-null keys. PostgreSQL unique indexes
-- already allow multiple NULL values, so full indexes preserve legacy behaviour
-- while allowing ON CONFLICT(project_id, canonical_*_key) inference.

drop index if exists public.project_deliverables_canonical_item_uidx;
create unique index project_deliverables_canonical_item_uidx
  on public.project_deliverables(project_id, canonical_item_key);

drop index if exists public.project_success_criteria_canonical_item_uidx;
create unique index project_success_criteria_canonical_item_uidx
  on public.project_success_criteria(project_id, canonical_item_key);

drop index if exists public.project_roles_canonical_role_uidx;
create unique index project_roles_canonical_role_uidx
  on public.project_roles(project_id, canonical_role_key);

drop index if exists public.project_data_sources_canonical_source_uidx;
create unique index project_data_sources_canonical_source_uidx
  on public.project_data_sources(project_id, canonical_source_key);
