-- Project start lifecycle production reconciliation.
-- Repairs Project Library import omissions that made Phase 11 impossible while
-- preserving Success Criteria, resource governance, Lead and responsibility gates.

-- Canonical project milestones created by service/import jobs must remain
-- project-scoped. Authenticated member-created milestones can still resolve into
-- that member's active/forming run.
create or replace function public.set_project_milestone_run_from_actor()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.project_run_id is null
     and new.project_id is not null
     and auth.uid() is not null then
    new.project_run_id:=public.resolve_project_run(new.project_id,auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function public.set_project_milestone_run_from_actor() from public,anon,authenticated;

drop trigger if exists trg_project_milestones_run on public.project_milestones;
create trigger trg_project_milestones_run
before insert on public.project_milestones
for each row execute function public.set_project_milestone_run_from_actor();

-- Historical Project Library imports populated objective/use-case text while
-- leaving the explicit Phase 11 alignment arrays empty.
update public.project_problem_briefs
set key_questions=jsonb_build_array(
      coalesce(
        nullif(btrim(primary_question),''),
        nullif(btrim(decision_to_support),''),
        nullif(btrim(primary_objective),'')
      )
    ),
    updated_at=now()
where jsonb_array_length(coalesce(key_questions,'[]'::jsonb))=0
  and coalesce(
        nullif(btrim(primary_question),''),
        nullif(btrim(decision_to_support),''),
        nullif(btrim(primary_objective),'')
      ) is not null;

update public.project_problem_briefs
set in_scope=jsonb_build_array(nullif(btrim(primary_use_case),'')),
    updated_at=now()
where jsonb_array_length(coalesce(in_scope,'[]'::jsonb))=0
  and nullif(btrim(primary_use_case),'') is not null;

-- Remove only deterministic recovery milestones incorrectly attached to a
-- forming run by the historical generic trigger.
delete from public.project_milestones m
where m.title='Initial governed delivery milestone'
  and m.project_run_id is not null
  and exists (
    select 1 from public.project_runs r
    where r.id=m.project_run_id
      and r.project_id=m.project_id
      and r.status='forming'
      and coalesce(r.has_started,false)=false
  );

-- The workbook supplies duration + required deliverables. Materialise one
-- deterministic canonical first milestone only for projects whose core governed
-- definition (brief, deliverable, Success Criteria) already exists.
insert into public.project_milestones(
  project_id,title,description,status,sort_order,is_required,project_run_id,
  week_start,week_end,expected_output
)
select
  p.id,
  'Initial governed delivery milestone',
  left(
    'Begin delivery against the approved project objective: ' ||
    coalesce(nullif(btrim(pb.primary_objective),''),nullif(btrim(pb.expected_outcome),''),p.title),
    2000
  ),
  'planned',
  1,
  true,
  null,
  1,
  greatest(1,least(coalesce(p.duration_weeks,1),2)),
  d.title
from public.projects p
join public.project_problem_briefs pb on pb.project_id=p.id
join lateral (
  select d.title
  from public.project_deliverables d
  where d.project_id=p.id and d.project_run_id is null and d.is_required
  order by d.sort_order,d.created_at,d.id
  limit 1
) d on true
where exists (
  select 1 from public.project_success_criteria sc
  where sc.project_id=p.id and sc.is_required
)
and not exists (
  select 1 from public.project_milestones m
  where m.project_id=p.id and m.project_run_id is null
);

-- Restore curated capability evidence omitted by the historical importer.
with missing_projects as (
  select p.id,pb.technical_skills
  from public.projects p
  join public.project_problem_briefs pb on pb.project_id=p.id
  where not exists (
    select 1 from public.project_capabilities pc where pc.project_id=p.id
  )
),
specific_matches as (
  select distinct mp.id as project_id,c.id as capability_id,c.sort_order
  from missing_projects mp
  join public.capabilities c on c.is_active=true
  where exists (
    select 1
    from jsonb_array_elements_text(coalesce(mp.technical_skills,'[]'::jsonb)) skill(value)
    where lower(btrim(skill.value))=lower(btrim(c.name))
       or lower(btrim(skill.value)) like '%'||lower(btrim(c.name))||'%'
       or lower(btrim(c.name)) like '%'||lower(btrim(skill.value))||'%'
       or regexp_replace(lower(btrim(skill.value)),'[^a-z0-9]+','-','g')=c.slug
  )
),
ranked as (
  select project_id,capability_id,
         row_number() over(partition by project_id order by sort_order,capability_id) rn
  from specific_matches
)
insert into public.project_capabilities(project_id,capability_id,importance,evidence_expected)
select project_id,capability_id,'core',true
from ranked
where rn<=5
on conflict do nothing;

insert into public.project_capabilities(project_id,capability_id,importance,evidence_expected)
select p.id,c.id,'core',true
from public.projects p
join public.capabilities c on c.slug='data-analysis' and c.is_active=true
where not exists(select 1 from public.project_capabilities pc where pc.project_id=p.id)
on conflict do nothing;

with first_capability as (
  select pc.project_id,pc.capability_id,
         row_number() over(partition by pc.project_id order by c.sort_order,c.id) rn
  from public.project_capabilities pc
  join public.capabilities c on c.id=pc.capability_id
)
update public.project_capabilities pc
set evidence_expected=true
from first_capability f
where pc.project_id=f.project_id
  and pc.capability_id=f.capability_id
  and f.rn=1
  and not exists(
    select 1 from public.project_capabilities x
    where x.project_id=pc.project_id and x.evidence_expected
  );

-- Team starts at the product minimum of two accepted members. The designed
-- target/maximum remains the workbook's 3/4/5 capacity.
update public.projects
set min_team_size=2,
    team_size_threshold=2,
    updated_at=now()
where participation_mode='team'
  and coalesce(target_team_size,max_team_size,2)>=2
  and (min_team_size is distinct from 2 or team_size_threshold is distinct from 2);

update public.project_runs r
set required_team_size=2,
    team_size_threshold=2,
    updated_at=now()
from public.projects p
where r.project_id=p.id
  and p.participation_mode='team'
  and r.status='forming'
  and coalesce(r.has_started,false)=false
  and (r.required_team_size is distinct from 2 or r.team_size_threshold is distinct from 2);

do $$
declare x record;
begin
  for x in
    select id from public.project_runs
    where status='forming' and coalesce(has_started,false)=false
  loop
    perform public.phase9_reconcile_run_participation(x.id);
  end loop;
end $$;

-- Recover already-formed one-person review-required runs using the same
-- Phase 11 readiness and Phase 9 atomic activation authorities as live traffic.
do $$
declare
  x record;
  readiness jsonb;
  activation jsonb;
begin
  for x in
    select r.id as run_id,r.project_id
    from public.project_runs r
    join public.projects p on p.id=r.project_id
    where r.status='forming'
      and coalesce(r.has_started,false)=false
      and greatest(coalesce(r.required_team_size,r.team_size_threshold,1),1)=1
      and public.effective_project_admission_mode(p.project_type,p.admission_mode)='review_required'
  loop
    readiness:=public.phase11_project_start_readiness(x.project_id,x.run_id);
    if coalesce((readiness->>'ready')::boolean,false) then
      activation:=public.phase9_activate_project_run(
        x.project_id,x.run_id,'manual',null
      );
    end if;
  end loop;
end $$;


-- Historical invariant recovery: an active run with an established kickoff is
-- started even if a legacy writer omitted the has_started/started_at fields.
update public.project_runs
set has_started=true,
    started_at=coalesce(started_at,kickoff_at,updated_at,created_at,now()),
    updated_at=now()
where status='active'
  and coalesce(has_started,false)=false
  and kickoff_at is not null;
