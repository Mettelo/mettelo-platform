-- Capability Paths V1 Phase 5: controlled workbook import, provenance and rollback.
-- No workbook rows are imported by this migration. Production commit remains an explicit Admin action.

create table if not exists public.capability_path_import_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique,
  source_filename text not null,
  source_sha256 text not null,
  source_version text,
  importer_version text not null,
  status text not null default 'dry_run',
  expected_paths integer not null default 0,
  expected_placements integer not null default 0,
  expected_projects integer not null default 0,
  dry_run_summary jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  imported_by uuid references public.profiles(id) on delete set null,
  rolled_back_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  imported_at timestamptz,
  rolled_back_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint capability_path_import_batches_status_check check(status in ('dry_run','review','approved','imported','rolled_back','failed'))
);

create unique index if not exists capability_path_import_batches_source_hash_idx
  on public.capability_path_import_batches(source_sha256)
  where status <> 'rolled_back';

create table if not exists public.capability_path_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.capability_path_import_batches(id) on delete cascade,
  source_sheet text not null,
  source_row integer,
  row_kind text not null,
  source_key text not null,
  normalized jsonb not null default '{}'::jsonb,
  decision text not null default 'pending',
  issue_codes text[] not null default '{}'::text[],
  resolution_note text,
  existing_project_id uuid references public.projects(id) on delete restrict,
  matched_taxonomy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capability_path_import_rows_kind_check check(row_kind in ('path','project','placement','taxonomy')),
  constraint capability_path_import_rows_decision_check check(decision in ('pending','approved','rejected','needs_changes','blocked')),
  unique(batch_id,row_kind,source_key)
);
create index if not exists capability_path_import_rows_batch_decision_idx
  on public.capability_path_import_rows(batch_id,decision,row_kind);

create table if not exists public.capability_path_import_resources (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.capability_path_import_batches(id) on delete cascade,
  project_source_key text not null,
  title text not null,
  source_organisation text,
  source_url text not null,
  licence text,
  data_reality text,
  governance_status text not null,
  storage_decision text not null default 'review',
  attribution_required boolean not null default false,
  subset_scope text,
  checksum_sha256 text,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint capability_path_import_resources_governance_check check(governance_status in ('green','amber','red','link_only')),
  constraint capability_path_import_resources_storage_check check(storage_decision in ('review','store_allowed','link_only','do_not_store')),
  unique(batch_id,project_source_key,source_url)
);
create index if not exists capability_path_import_resources_batch_status_idx
  on public.capability_path_import_resources(batch_id,governance_status,storage_decision);

create table if not exists public.capability_path_import_path_origins (
  batch_id uuid not null references public.capability_path_import_batches(id) on delete restrict,
  path_id uuid not null references public.capability_paths(id) on delete restrict,
  source_path_key text not null,
  was_existing boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(batch_id,source_path_key),
  unique(batch_id,path_id)
);

create table if not exists public.capability_path_import_project_origins (
  batch_id uuid not null references public.capability_path_import_batches(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  source_project_key text not null,
  was_existing boolean not null default false,
  rollback_retained boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(batch_id,source_project_key),
  unique(batch_id,project_id,source_project_key)
);

create table if not exists public.capability_path_import_placement_origins (
  batch_id uuid not null references public.capability_path_import_batches(id) on delete restrict,
  path_id uuid not null references public.capability_paths(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  source_sheet text not null,
  source_row integer,
  source_key text not null,
  created_at timestamptz not null default now(),
  primary key(batch_id,source_key)
);

alter table public.capability_path_import_batches enable row level security;
alter table public.capability_path_import_rows enable row level security;
alter table public.capability_path_import_resources enable row level security;
alter table public.capability_path_import_path_origins enable row level security;
alter table public.capability_path_import_project_origins enable row level security;
alter table public.capability_path_import_placement_origins enable row level security;

revoke all on table public.capability_path_import_batches from anon,authenticated;
revoke all on table public.capability_path_import_rows from anon,authenticated;
revoke all on table public.capability_path_import_resources from anon,authenticated;
revoke all on table public.capability_path_import_path_origins from anon,authenticated;
revoke all on table public.capability_path_import_project_origins from anon,authenticated;
revoke all on table public.capability_path_import_placement_origins from anon,authenticated;
grant all on table public.capability_path_import_batches to service_role;
grant all on table public.capability_path_import_rows to service_role;
grant all on table public.capability_path_import_resources to service_role;
grant all on table public.capability_path_import_path_origins to service_role;
grant all on table public.capability_path_import_project_origins to service_role;
grant all on table public.capability_path_import_placement_origins to service_role;

comment on table public.capability_path_import_batches is 'Immutable-source controlled import batches. Source hash changes require a new dry run.';
comment on table public.capability_path_import_rows is 'Human-reviewable normalized workbook rows. Import commit consumes approved rows only.';
comment on table public.capability_path_import_resources is 'Resource provenance and Green/Amber/Red/Link-only governance. This table never implies redistribution permission.';

create or replace function public.admin_commit_capability_path_import(p_batch_id uuid,p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b public.capability_path_import_batches%rowtype;
  r record;
  tr record;
  path_uuid uuid;
  project_uuid uuid;
  stage_uuid uuid;
  prereq_uuid uuid;
  created_paths integer:=0;
  created_projects integer:=0;
  created_placements integer:=0;
  reused_projects integer:=0;
  source_project text;
begin
  select * into b from public.capability_path_import_batches where id=p_batch_id for update;
  if not found then raise exception 'Import batch not found'; end if;
  if b.status='imported' then
    return jsonb_build_object('ok',true,'already_imported',true,'batch_id',p_batch_id);
  end if;
  if b.status<>'approved' then raise exception 'Import batch must be approved before commit'; end if;
  if exists(select 1 from public.capability_path_import_rows where batch_id=p_batch_id and decision in ('pending','needs_changes','blocked')) then
    raise exception 'Import batch still contains unresolved rows';
  end if;
  if exists(select 1 from public.capability_path_import_resources where batch_id=p_batch_id and governance_status in ('amber','red') and storage_decision='store_allowed') then
    raise exception 'Amber or Red resources cannot be approved for storage';
  end if;

  -- Paths are always created as private authoring objects (Draft). No publication is automatic.
  for r in select * from public.capability_path_import_rows where batch_id=p_batch_id and row_kind='path' and decision='approved' order by source_row nulls last loop
    select path_id into path_uuid from public.capability_path_import_path_origins where batch_id=p_batch_id and source_path_key=r.source_key;
    if path_uuid is null then
      if exists(select 1 from public.capability_paths where slug=(r.normalized->>'slug')) then
        raise exception 'Path slug already exists outside this import batch: %',r.normalized->>'slug';
      end if;
      insert into public.capability_paths(slug,name,target_role,short_description,description,progression_summary,target_outcome,status,sort_order,created_by,updated_by)
      values(
        r.normalized->>'slug',r.normalized->>'name',r.normalized->>'target_role',nullif(r.normalized->>'short_description',''),
        nullif(r.normalized->>'description',''),nullif(r.normalized->>'progression_summary',''),r.normalized->>'target_outcome','draft',
        coalesce((r.normalized->>'sort_order')::integer,100),p_actor,p_actor
      ) returning id into path_uuid;
      insert into public.capability_path_import_path_origins(batch_id,path_id,source_path_key,was_existing)
      values(p_batch_id,path_uuid,r.source_key,false);
      insert into public.capability_path_lifecycle_events(path_id,event_type,actor_user_id,metadata)
      values(path_uuid,'created',p_actor,jsonb_build_object('source','capability_path_import','batch_id',p_batch_id,'source_key',r.source_key));
      created_paths:=created_paths+1;
    end if;
  end loop;

  -- Reuse exact-reviewed canonical projects; only create new private Draft projects where no reviewed match exists.
  for r in select * from public.capability_path_import_rows where batch_id=p_batch_id and row_kind='project' and decision='approved' order by source_key loop
    select project_id into project_uuid from public.capability_path_import_project_origins where batch_id=p_batch_id and source_project_key=r.source_key;
    if project_uuid is null then
      if r.existing_project_id is not null then
        project_uuid:=r.existing_project_id;
        insert into public.capability_path_import_project_origins(batch_id,project_id,source_project_key,was_existing)
        values(p_batch_id,project_uuid,r.source_key,true);
        reused_projects:=reused_projects+1;
      else
        insert into public.projects(
          slug,title,summary,problem_statement,status,visibility,project_type,team_size_threshold,duration_weeks,weekly_commitment,
          applications_open,project_type_review_required,created_by_user_id,updated_by_user_id,updated_at
        ) values(
          r.normalized->>'slug',r.normalized->>'title',left(coalesce(r.normalized->>'summary',r.normalized->>'title'),900),
          left(coalesce(r.normalized->>'problem_statement',r.normalized->>'summary',r.normalized->>'title'),4000),
          'draft','private','open',greatest(1,least(50,coalesce((r.normalized->>'team_size')::integer,5))),
          nullif(r.normalized->>'duration_weeks','')::integer,nullif(r.normalized->>'weekly_commitment',''),false,false,p_actor,p_actor,now()
        ) returning id into project_uuid;
        insert into public.capability_path_import_project_origins(batch_id,project_id,source_project_key,was_existing)
        values(p_batch_id,project_uuid,r.source_key,false);
        created_projects:=created_projects+1;
      end if;
    end if;

    -- Approved taxonomy mappings are additive and never create unreviewed taxonomy terms.
    for tr in select * from public.capability_path_import_rows where batch_id=p_batch_id and row_kind='taxonomy' and decision='approved' and normalized->>'project_source_key'=r.source_key loop
      if tr.matched_taxonomy_id is null then continue; end if;
      if tr.normalized->>'taxonomy_type'='domain' then
        insert into public.project_domains(project_id,domain_id,is_primary) values(project_uuid,tr.matched_taxonomy_id,true)
        on conflict(project_id,domain_id) do update set is_primary=excluded.is_primary;
      elsif tr.normalized->>'taxonomy_type'='tool' then
        insert into public.project_tools(project_id,tool_id) values(project_uuid,tr.matched_taxonomy_id) on conflict do nothing;
      elsif tr.normalized->>'taxonomy_type'='method' then
        insert into public.project_methods(project_id,method_id) values(project_uuid,tr.matched_taxonomy_id) on conflict do nothing;
      elsif tr.normalized->>'taxonomy_type'='capability' then
        insert into public.project_capabilities(project_id,capability_id,importance,evidence_expected)
        values(project_uuid,tr.matched_taxonomy_id,coalesce(nullif(tr.normalized->>'importance',''),'supporting'),false)
        on conflict(project_id,capability_id) do nothing;
      end if;
    end loop;
  end loop;

  -- Build stages from the approved placement plan, then add many-to-many placements.
  for r in select * from public.capability_path_import_rows where batch_id=p_batch_id and row_kind='path' and decision='approved' order by source_row nulls last loop
    select path_id into path_uuid from public.capability_path_import_path_origins where batch_id=p_batch_id and source_path_key=r.source_key;
    for tr in
      select distinct on (normalized->>'stage_slug') normalized
      from public.capability_path_import_rows
      where batch_id=p_batch_id and row_kind='placement' and decision='approved' and normalized->>'path_key'=r.source_key
      order by normalized->>'stage_slug',(normalized->>'position')::integer
    loop
      insert into public.capability_path_stages(path_id,slug,name,description,position)
      values(path_uuid,tr.normalized->>'stage_slug',tr.normalized->>'stage_name',null,
        (select min((x.normalized->>'position')::integer) from public.capability_path_import_rows x where x.batch_id=p_batch_id and x.row_kind='placement' and x.decision='approved' and x.normalized->>'path_key'=r.source_key and x.normalized->>'stage_slug'=tr.normalized->>'stage_slug'))
      on conflict(path_id,slug) do nothing;
    end loop;

    -- Re-number stage position according to first project occurrence, preserving deterministic progression.
    with ordered as (
      select id,row_number() over(order by position,id)::integer as next_position
      from public.capability_path_stages where path_id=path_uuid
    )
    update public.capability_path_stages s set position=o.next_position from ordered o where s.id=o.id;

    for tr in select * from public.capability_path_import_rows where batch_id=p_batch_id and row_kind='placement' and decision='approved' and normalized->>'path_key'=r.source_key order by (normalized->>'position')::integer loop
      source_project:=tr.normalized->>'project_source_key';
      select project_id into project_uuid from public.capability_path_import_project_origins where batch_id=p_batch_id and source_project_key=source_project;
      if project_uuid is null then raise exception 'Approved placement has no canonical project mapping: %',source_project; end if;
      select id into stage_uuid from public.capability_path_stages where path_id=path_uuid and slug=tr.normalized->>'stage_slug';
      prereq_uuid:=null;
      if coalesce(tr.normalized->>'prerequisite_project_source_key','')<>'' then
        select project_id into prereq_uuid from public.capability_path_import_project_origins where batch_id=p_batch_id and source_project_key=tr.normalized->>'prerequisite_project_source_key';
        if prereq_uuid is null then raise exception 'Prerequisite mapping missing for %',tr.source_key; end if;
      end if;
      insert into public.capability_path_projects(path_id,project_id,stage_id,position,competency_focus,capability_built,prerequisite_project_id,prerequisite_mode,path_outcome,placement_type)
      values(path_uuid,project_uuid,stage_uuid,(tr.normalized->>'position')::integer,tr.normalized->>'competency_focus',tr.normalized->>'capability_built',prereq_uuid,'recommended',nullif(tr.normalized->>'path_outcome',''),'recommended')
      on conflict(path_id,project_id) do update set stage_id=excluded.stage_id,position=excluded.position,competency_focus=excluded.competency_focus,capability_built=excluded.capability_built,prerequisite_project_id=excluded.prerequisite_project_id,path_outcome=excluded.path_outcome,updated_at=now();
      insert into public.capability_path_import_placement_origins(batch_id,path_id,project_id,source_sheet,source_row,source_key)
      values(p_batch_id,path_uuid,project_uuid,tr.source_sheet,tr.source_row,tr.source_key)
      on conflict(batch_id,source_key) do nothing;
      created_placements:=created_placements+1;
    end loop;
  end loop;

  update public.capability_path_import_batches
  set status='imported',imported_by=p_actor,imported_at=now(),updated_at=now()
  where id=p_batch_id;
  return jsonb_build_object('ok',true,'batch_id',p_batch_id,'created_paths',created_paths,'created_projects',created_projects,'reused_projects',reused_projects,'placements',created_placements);
end;
$$;

revoke all on function public.admin_commit_capability_path_import(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_commit_capability_path_import(uuid,uuid) to service_role;

create or replace function public.admin_rollback_capability_path_import(p_batch_id uuid,p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b public.capability_path_import_batches%rowtype;
  r record;
  removed_paths integer:=0;
  removed_projects integer:=0;
  retained_projects integer:=0;
begin
  select * into b from public.capability_path_import_batches where id=p_batch_id for update;
  if not found then raise exception 'Import batch not found'; end if;
  if b.status<>'imported' then raise exception 'Only an imported batch can be rolled back'; end if;

  -- Imported Paths may be removed only while still Draft and unused by members.
  for r in select * from public.capability_path_import_path_origins where batch_id=p_batch_id and was_existing=false loop
    if exists(select 1 from public.member_capability_paths where path_id=r.path_id) then raise exception 'Cannot rollback: imported Path already has member history'; end if;
    if exists(select 1 from public.capability_paths where id=r.path_id and status<>'draft') then raise exception 'Cannot rollback: imported Path is no longer Draft'; end if;
    delete from public.capability_paths where id=r.path_id;
    removed_paths:=removed_paths+1;
  end loop;

  -- Never delete an existing project. Newly-created projects are removed only if no operational history exists.
  for r in select * from public.capability_path_import_project_origins where batch_id=p_batch_id and was_existing=false loop
    if exists(select 1 from public.project_applications where project_id=r.project_id)
       or exists(select 1 from public.project_members where project_id=r.project_id)
       or exists(select 1 from public.project_runs where project_id=r.project_id)
       or exists(select 1 from public.contributions where project_id=r.project_id) then
      update public.capability_path_import_project_origins set rollback_retained=true where batch_id=p_batch_id and source_project_key=r.source_project_key;
      retained_projects:=retained_projects+1;
    else
      delete from public.projects where id=r.project_id;
      removed_projects:=removed_projects+1;
    end if;
  end loop;

  update public.capability_path_import_batches set status='rolled_back',rolled_back_by=p_actor,rolled_back_at=now(),updated_at=now() where id=p_batch_id;
  return jsonb_build_object('ok',true,'batch_id',p_batch_id,'removed_paths',removed_paths,'removed_projects',removed_projects,'retained_projects',retained_projects);
end;
$$;

revoke all on function public.admin_rollback_capability_path_import(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_rollback_capability_path_import(uuid,uuid) to service_role;
