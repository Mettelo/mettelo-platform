-- Workstream 2 — one database-authoritative project publication blocker list.
create or replace function public.workstream2_publication_blockers(p_project_id uuid)
returns text[]
language plpgsql
security definer
stable
set search_path=public
as $$
declare
  v_project public.projects%rowtype;
  v_readiness public.project_experience_readiness%rowtype;
  v_catalogue public.project_catalogue_readiness%rowtype;
  v_blockers text[]:='{}'::text[];
begin
  select * into v_project from public.projects where id=p_project_id;
  if not found then return array['PROJECT_NOT_FOUND']; end if;

  select * into v_readiness from public.project_experience_readiness where project_id=p_project_id;
  if found then
    v_blockers:=v_blockers||coalesce(v_readiness.publication_blockers,'{}'::text[]);
  else
    v_blockers:=array_append(v_blockers,'READINESS_UNAVAILABLE');
  end if;

  select * into v_catalogue from public.project_catalogue_readiness where project_id=p_project_id;
  if not found then
    v_blockers:=array_append(v_blockers,'CATALOGUE_READINESS_UNAVAILABLE');
  elsif coalesce(v_catalogue.catalogue_ready,false) is not true then
    select v_blockers||coalesce(array_agg('catalogue:'||x),'{}'::text[])
    into v_blockers from unnest(coalesce(v_catalogue.missing_requirements,'{}'::text[])) x;
  end if;

  if v_project.project_type not in ('open','partner') then v_blockers:=array_append(v_blockers,'PROJECT_TYPE'); end if;
  if v_project.participation_mode not in ('solo','team','flexible') then v_blockers:=array_append(v_blockers,'PARTICIPATION_MODE'); end if;
  if v_project.participation_mode='team' and coalesce(v_project.min_team_size,0)<2 then v_blockers:=array_append(v_blockers,'TEAM_MINIMUM'); end if;
  if coalesce(v_project.target_team_size,0)<coalesce(v_project.min_team_size,0) then v_blockers:=array_append(v_blockers,'TARGET_BELOW_MINIMUM'); end if;
  if coalesce(v_project.max_team_size,0)<coalesce(v_project.target_team_size,0) then v_blockers:=array_append(v_blockers,'MAXIMUM_BELOW_TARGET'); end if;
  if v_project.participation_mode='solo' and (v_project.min_team_size<>1 or v_project.target_team_size<>1 or v_project.max_team_size<>1) then v_blockers:=array_append(v_blockers,'SOLO_GEOMETRY'); end if;
  if nullif(btrim(coalesce(v_project.slug,'')),'') is null then v_blockers:=array_append(v_blockers,'SLUG'); end if;
  if nullif(btrim(coalesce(v_project.title,'')),'') is null then v_blockers:=array_append(v_blockers,'TITLE'); end if;
  if nullif(btrim(coalesce(v_project.summary,'')),'') is null then v_blockers:=array_append(v_blockers,'SUMMARY'); end if;
  if nullif(btrim(coalesce(v_project.problem_statement,'')),'') is null then v_blockers:=array_append(v_blockers,'PROBLEM_STATEMENT'); end if;
  if nullif(btrim(coalesce(v_project.weekly_commitment,'')),'') is null then v_blockers:=array_append(v_blockers,'WEEKLY_COMMITMENT'); end if;
  if v_project.duration_weeks is null or v_project.duration_weeks<1 then v_blockers:=array_append(v_blockers,'DURATION'); end if;
  if v_project.project_type='partner' and nullif(btrim(coalesce(v_project.partner_name,'')),'') is null then v_blockers:=array_append(v_blockers,'PARTNER_NAME'); end if;
  if v_project.project_type='open' and v_project.application_deadline is not null then v_blockers:=array_append(v_blockers,'OPEN_PROJECT_DEADLINE'); end if;

  return (select coalesce(array_agg(distinct x order by x),'{}'::text[]) from unnest(v_blockers) x);
end;
$$;
revoke all on function public.workstream2_publication_blockers(uuid) from public,anon,authenticated;
grant execute on function public.workstream2_publication_blockers(uuid) to service_role;
