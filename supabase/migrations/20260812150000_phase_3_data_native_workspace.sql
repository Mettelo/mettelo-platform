-- Phase 3: a run-aware, data-native project workspace.
-- This migration stores metadata and external HTTPS links only. It does not ingest datasets.

alter table public.projects
  add column if not exists project_archetype text;

alter table public.projects drop constraint if exists projects_project_archetype_check;
alter table public.projects add constraint projects_project_archetype_check check (
  project_archetype is null or project_archetype in (
    'analytics','data_engineering','machine_learning','generative_ai',
    'research','visualisation','data_governance'
  )
) not valid;
alter table public.projects validate constraint projects_project_archetype_check;

create table if not exists public.project_problem_briefs (
  project_id uuid primary key references public.projects(id) on delete cascade,
  context text not null default '',
  stakeholder text not null default '',
  primary_question text not null default '',
  expected_outcome text not null default '',
  success_metrics text not null default '',
  constraints text not null default '',
  ethics_considerations text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_workstreams (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  owner_user_id uuid references auth.users(id) on delete set null,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_run_id,slug)
);

create table if not exists public.project_data_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  name text not null,
  description text,
  source_type text not null,
  external_url text not null check (external_url ~* '^https://'),
  owner_user_id uuid references auth.users(id) on delete set null,
  version_label text,
  data_period text,
  unit_of_observation text,
  data_format text,
  sensitivity text not null default 'internal' check (sensitivity in ('public','internal','restricted')),
  access_status text not null default 'needs_access' check (access_status in ('open','needs_access','granted','blocked')),
  quality_status text not null default 'unreviewed' check (quality_status in ('unreviewed','usable','issues_found','approved')),
  known_limitations text,
  last_checked_on date,
  added_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_data_sources_source_type_check check (source_type in (
    'google_sheets','excel','google_drive','github','kaggle','hugging_face',
    'api','public_portal','cloud_location','external_website','other'
  )),
  unique(id,project_run_id)
);

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  workstream_id uuid,
  title text not null,
  deliverable_type text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  acceptance_criteria text not null,
  version_label text,
  evidence_url text check (evidence_url is null or evidence_url ~* '^https://'),
  status text not null default 'planned' check (status in ('planned','in_progress','ready_for_review','changes_requested','approved')),
  is_required boolean not null default true,
  review_notes text,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_deliverables_no_self_review check (reviewer_user_id is null or owner_user_id is null or reviewer_user_id <> owner_user_id),
  constraint project_deliverables_workstream_fk foreign key (workstream_id) references public.project_workstreams(id) on delete set null
);

alter table public.project_milestones add column if not exists workstream_id uuid references public.project_workstreams(id) on delete set null;
alter table public.project_tasks add column if not exists workstream_id uuid references public.project_workstreams(id) on delete set null;

create table if not exists public.project_deliverable_data_sources (
  deliverable_id uuid not null references public.project_deliverables(id) on delete cascade,
  data_source_id uuid not null references public.project_data_sources(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  primary key(deliverable_id,data_source_id)
);

create table if not exists public.project_deliverable_tasks (
  deliverable_id uuid not null references public.project_deliverables(id) on delete cascade,
  task_id uuid not null references public.project_tasks(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  primary key(deliverable_id,task_id)
);

create table if not exists public.contribution_evidence_links (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete cascade,
  project_run_id uuid not null references public.project_runs(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('task','data_source','deliverable','review')),
  evidence_id uuid not null,
  created_at timestamptz not null default now(),
  unique(contribution_id,evidence_type,evidence_id)
);

create index if not exists project_workstreams_run_order_idx on public.project_workstreams(project_run_id,sort_order,id);
create index if not exists project_data_sources_run_idx on public.project_data_sources(project_run_id,updated_at desc);
create index if not exists project_deliverables_run_status_idx on public.project_deliverables(project_run_id,status,is_required);
create index if not exists contribution_evidence_links_contribution_idx on public.contribution_evidence_links(contribution_id);

create or replace function public.mettelo_is_run_member(target_run uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_run_id=target_run and pm.user_id=auth.uid()
      and pm.membership_status in ('active','completed')
  ) or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin';
$$;

create or replace function public.mettelo_is_run_lead(target_run uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_run_id=target_run and pm.user_id=auth.uid()
      and pm.membership_status in ('active','completed')
      and pm.team_role in ('project_lead','reviewer')
  ) or coalesce(auth.jwt()->'app_metadata'->>'role','')='admin';
$$;

revoke all on function public.mettelo_is_run_member(uuid) from public;
revoke all on function public.mettelo_is_run_lead(uuid) from public;
grant execute on function public.mettelo_is_run_member(uuid) to authenticated;
grant execute on function public.mettelo_is_run_lead(uuid) to authenticated;

alter table public.project_problem_briefs enable row level security;
alter table public.project_workstreams enable row level security;
alter table public.project_data_sources enable row level security;
alter table public.project_deliverables enable row level security;
alter table public.project_deliverable_data_sources enable row level security;
alter table public.project_deliverable_tasks enable row level security;
alter table public.contribution_evidence_links enable row level security;

create policy "run members read problem brief" on public.project_problem_briefs for select to authenticated using (
  exists(select 1 from public.project_runs pr where pr.project_id=project_problem_briefs.project_id and public.mettelo_is_run_member(pr.id))
);
create policy "admins manage problem brief" on public.project_problem_briefs for all to authenticated using (coalesce(auth.jwt()->'app_metadata'->>'role','')='admin') with check (coalesce(auth.jwt()->'app_metadata'->>'role','')='admin');

create policy "run members read workstreams" on public.project_workstreams for select to authenticated using (public.mettelo_is_run_member(project_run_id));
create policy "run leads manage workstreams" on public.project_workstreams for all to authenticated using (public.mettelo_is_run_lead(project_run_id)) with check (public.mettelo_is_run_lead(project_run_id));
create policy "run members read data sources" on public.project_data_sources for select to authenticated using (public.mettelo_is_run_member(project_run_id));
create policy "owners and leads manage data sources" on public.project_data_sources for all to authenticated using (added_by=auth.uid() or owner_user_id=auth.uid() or public.mettelo_is_run_lead(project_run_id)) with check (added_by=auth.uid() or public.mettelo_is_run_lead(project_run_id));
create policy "run members read deliverables" on public.project_deliverables for select to authenticated using (public.mettelo_is_run_member(project_run_id));
create policy "run leads manage deliverables" on public.project_deliverables for all to authenticated using (public.mettelo_is_run_lead(project_run_id)) with check (public.mettelo_is_run_lead(project_run_id));
create policy "run members read deliverable sources" on public.project_deliverable_data_sources for select to authenticated using (public.mettelo_is_run_member(project_run_id));
create policy "run leads manage deliverable sources" on public.project_deliverable_data_sources for all to authenticated using (public.mettelo_is_run_lead(project_run_id)) with check (public.mettelo_is_run_lead(project_run_id));
create policy "run members read deliverable tasks" on public.project_deliverable_tasks for select to authenticated using (public.mettelo_is_run_member(project_run_id));
create policy "run leads manage deliverable tasks" on public.project_deliverable_tasks for all to authenticated using (public.mettelo_is_run_lead(project_run_id)) with check (public.mettelo_is_run_lead(project_run_id));
create policy "contributor and reviewers read evidence links" on public.contribution_evidence_links for select to authenticated using (
  exists(select 1 from public.contributions c where c.id=contribution_id and (c.user_id=auth.uid() or public.mettelo_is_run_lead(project_run_id)))
);
create policy "contributors create evidence links" on public.contribution_evidence_links for insert to authenticated with check (
  exists(select 1 from public.contributions c where c.id=contribution_id and c.user_id=auth.uid() and c.project_run_id=project_run_id)
);

grant select on public.project_problem_briefs,public.project_workstreams,public.project_data_sources,public.project_deliverables,public.project_deliverable_data_sources,public.project_deliverable_tasks,public.contribution_evidence_links to authenticated;
grant insert,update,delete on public.project_workstreams,public.project_data_sources,public.project_deliverables,public.project_deliverable_data_sources,public.project_deliverable_tasks to authenticated;
grant insert on public.contribution_evidence_links to authenticated;

create or replace function public.seed_project_workstreams(target_run uuid)
returns void language plpgsql security definer set search_path=public as $$
declare archetype text; target_project uuid;
begin
  select pr.project_id,p.project_archetype into target_project,archetype
  from public.project_runs pr join public.projects p on p.id=pr.project_id where pr.id=target_run;
  if target_project is null then return; end if;
  archetype:=coalesce(archetype,'analytics');
  insert into public.project_workstreams(project_id,project_run_id,name,slug,description,sort_order)
  select target_project,target_run,item.name,item.slug,item.description,item.position
  from (
    select * from (values
      ('analytics','Problem framing','problem-framing','Confirm the question, measures and decision context',10),
      ('analytics','Data preparation','data-preparation','Access, assess and prepare source data',20),
      ('analytics','Analysis and validation','analysis-validation','Analyse, test and validate findings',30),
      ('analytics','Insight communication','insight-communication','Turn findings into an evidence-backed story',40),
      ('data_engineering','Source and access','source-access','Confirm systems, permissions and contracts',10),
      ('data_engineering','Pipeline build','pipeline-build','Build reliable movement and transformation',20),
      ('data_engineering','Quality and observability','quality-observability','Test quality, lineage and reliability',30),
      ('data_engineering','Handover','handover','Document, release and transfer ownership',40),
      ('machine_learning','Problem and baseline','problem-baseline','Define the target, metric and baseline',10),
      ('machine_learning','Data and features','data-features','Prepare representative training and evaluation data',20),
      ('machine_learning','Model and evaluation','model-evaluation','Train, compare and test model behaviour',30),
      ('machine_learning','Responsible release','responsible-release','Document risk, monitoring and handover',40),
      ('generative_ai','Use case and evaluation','use-case-evaluation','Define user value, risks and evaluation set',10),
      ('generative_ai','Knowledge and prompting','knowledge-prompting','Prepare context, retrieval and prompts',20),
      ('generative_ai','Prototype and red-team','prototype-red-team','Build, test and challenge the system',30),
      ('generative_ai','Release and monitoring','release-monitoring','Ship guardrails, measurement and handover',40),
      ('research','Research design','research-design','Define questions, methods and ethics',10),
      ('research','Evidence collection','evidence-collection','Collect and document reliable evidence',20),
      ('research','Synthesis','synthesis','Analyse evidence and test interpretations',30),
      ('research','Publication','publication','Prepare a transparent research output',40),
      ('visualisation','Audience and story','audience-story','Define audience, decision and narrative',10),
      ('visualisation','Data preparation','data-preparation','Prepare trustworthy visualisation-ready data',20),
      ('visualisation','Design and accessibility','design-accessibility','Prototype clear, inclusive visual communication',30),
      ('visualisation','Validation and publish','validation-publish','Test comprehension and publish the output',40),
      ('data_governance','Scope and ownership','scope-ownership','Map data, stakeholders and accountability',10),
      ('data_governance','Controls and quality','controls-quality','Define policies, quality and access controls',20),
      ('data_governance','Risk and compliance','risk-compliance','Assess privacy, ethics and regulatory risk',30),
      ('data_governance','Adoption and assurance','adoption-assurance','Embed controls and measure adoption',40)
    ) as defaults(kind,name,slug,description,position)
  ) item where item.kind=archetype
  on conflict(project_run_id,slug) do nothing;
end $$;

revoke all on function public.seed_project_workstreams(uuid) from public;
grant execute on function public.seed_project_workstreams(uuid) to service_role;

do $$ declare run_row record; begin
  for run_row in select id from public.project_runs where status='active' loop
    perform public.seed_project_workstreams(run_row.id);
  end loop;
end $$;

create or replace function public.seed_workstreams_when_run_activates()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='active' and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform public.seed_project_workstreams(new.id);
  end if;
  return new;
end $$;

drop trigger if exists seed_workstreams_on_run_activation on public.project_runs;
create trigger seed_workstreams_on_run_activation after insert or update of status on public.project_runs
for each row execute function public.seed_workstreams_when_run_activates();

create or replace function public.guard_required_deliverables_before_completion()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='completed' and old.status is distinct from new.status and exists(
    select 1 from public.project_deliverables d
    where d.project_run_id=new.id and d.is_required and d.status<>'approved'
  ) then raise exception 'Required project deliverables must be approved before completion'; end if;
  return new;
end $$;

drop trigger if exists guard_required_deliverables_on_run_completion on public.project_runs;
create trigger guard_required_deliverables_on_run_completion before update of status on public.project_runs
for each row execute function public.guard_required_deliverables_before_completion();
