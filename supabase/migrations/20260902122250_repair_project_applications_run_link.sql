-- Repair repository baseline drift for the canonical application -> cohort link.
-- Hosted Mettelo already has this nullable FK and index; several existing lifecycle
-- routes rely on it. Keep this idempotent so clean CI and hosted environments converge.

alter table public.project_applications
  add column if not exists project_run_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.project_applications'::regclass
      and conname='project_applications_project_run_id_fkey'
  ) then
    alter table public.project_applications
      add constraint project_applications_project_run_id_fkey
      foreign key (project_run_id)
      references public.project_runs(id)
      on delete set null;
  end if;
end $$;

create index if not exists project_applications_project_run_idx
  on public.project_applications(project_run_id);
