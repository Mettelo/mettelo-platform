-- Feature 5: final-proof authority and type-aware completion lifecycle.

alter table public.projects
  add column if not exists github_repo_required boolean not null default false,
  add column if not exists final_proof_required boolean not null default true;

create table if not exists public.project_submission_permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  granted_by_user_id uuid not null references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users(id) on delete set null,
  unique(project_run_id,user_id)
);

create index if not exists project_submission_permissions_run_active_idx
on public.project_submission_permissions(project_run_id,user_id,revoked_at);

create table if not exists public.project_final_proof_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  submitted_by_user_id uuid not null references auth.users(id) on delete restrict,
  summary text not null check (char_length(summary) between 30 and 4000),
  evidence_url text,
  github_url text,
  submitted_at timestamptz not null default now(),
  superseded_at timestamptz
);

create unique index if not exists one_current_final_proof_per_run
on public.project_final_proof_submissions(project_run_id)
where superseded_at is null;

alter table public.project_submission_permissions enable row level security;
alter table public.project_final_proof_submissions enable row level security;

drop policy if exists "team reads final proof permissions" on public.project_submission_permissions;
create policy "team reads final proof permissions" on public.project_submission_permissions
for select to authenticated using (
  exists(select 1 from public.project_members pm where pm.project_run_id=project_submission_permissions.project_run_id and pm.user_id=(select auth.uid()))
  or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
);

drop policy if exists "team reads final proof submissions" on public.project_final_proof_submissions;
create policy "team reads final proof submissions" on public.project_final_proof_submissions
for select to authenticated using (
  exists(select 1 from public.project_members pm where pm.project_run_id=project_final_proof_submissions.project_run_id and pm.user_id=(select auth.uid()))
  or coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'
);
