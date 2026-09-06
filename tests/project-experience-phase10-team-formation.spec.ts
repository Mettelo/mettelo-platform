import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const formation=()=>read('supabase/migrations/20260906010000_project_experience_phase_10_canonical_formation.sql');
const governance=()=>read('supabase/migrations/20260906010100_project_experience_phase_10_responsibility_lead_governance.sql');
const responsibilities=()=>read('supabase/migrations/20260906010200_project_experience_phase_10_delivery_responsibilities.sql');

test.describe('Project Experience Phase 10 canonical team-formation contract',()=>{
  test('formation reuses project_runs and project_members rather than creating another team authority',()=>{
    const sql=formation();
    expect(sql).toContain('existing\n-- project_runs + project_members architecture');
    expect(sql).toContain('insert into public.project_runs');
    expect(sql).toContain('insert into public.project_members');
    expect(sql).not.toMatch(/create table(?: if not exists)? public\.project_teams/i);
    expect(sql).not.toContain('project_teams_v2');
  });

  test('accepted REVIEW_REQUIRED Offer is mandatory and AUTO membership is not duplicated',()=>{
    const sql=formation();
    expect(sql).toContain("offer_row.status<>'accepted'");
    expect(sql).toContain('FORMATION_REQUIRES_REVIEW_REQUIRED');
    expect(sql).toContain('AUTO_MEMBERSHIP_ALREADY_OWNED_BY_PHASE6');
    expect(sql).toContain("membership_status in ('waiting','active')");
    expect(sql).toContain("'already_formed',true");
  });

  test('formation consumes Phase 9 participation geometry and shared capacity lock',()=>{
    const sql=formation();
    expect(sql).toContain('perform public.phase9_lock_project_capacity(project_row.id)');
    expect(sql).toContain('public.phase9_effective_participation_threshold');
    expect(sql).toContain("project_row.participation_mode='flexible' and preference='team'");
    expect(sql).toContain('required_team_size=required_members');
  });

  test('collaborative formation reuses a forming run while independent formation can create its own run',()=>{
    const sql=formation();
    expect(sql).toContain('if team_geometry then');
    expect(sql).toContain("where project_id=project_row.id\n      and status='forming'");
    expect(sql).toContain('if run_row.id is null then');
    expect(sql).toContain("'source','phase10_accepted_offer_formation'");
  });

  test('formation remains waiting and never activates the project or run',()=>{
    const sql=formation();
    expect(sql).toContain("'contributor','waiting'");
    expect(sql).toContain("status='waiting_for_team'");
    expect(sql).toContain("'creates_active_project',false");
    expect(sql).toContain("'project_active',false");
    expect(sql).not.toContain("set status='active'");
    expect(sql).not.toContain('has_started=true');
  });

  test('accepted Offer reservation is preserved as history and consumed by the existing Phase 8/9 boundary',()=>{
    const sql=formation();
    const consumption=read('supabase/migrations/20260906002400_project_experience_phase_9_lock_order_hardening.sql');
    expect(sql).toContain('capacity_consumed_at is null');
    expect(sql).not.toContain('delete from public.project_offers');
    expect(consumption).toContain('phase8_consume_offer_reservation_on_membership');
    expect(consumption).toContain('set capacity_consumed_at=now()');
  });

  test('delivery responsibility ownership is many-to-many assignment state, not another catalogue',()=>{
    const sql=responsibilities();
    expect(sql).toContain('create table if not exists public.project_member_responsibilities');
    expect(sql).toContain('project_member_id uuid not null references public.project_members');
    expect(sql).toContain('source_project_role_id uuid references public.project_roles');
    expect(sql).toContain('unnest(coalesce(pr.responsibilities,array[]::text[]))');
    expect(sql).not.toMatch(/create table(?: if not exists)? public\.project_responsibilit(?:y|ies)/i);
    expect(sql).toContain('project_member_responsibilities_one_live_assignment');
  });

  test('one member can own several responsibilities and one responsibility can be shared',()=>{
    const sql=responsibilities();
    expect(sql).toContain('project_member_id,lower(btrim(responsibility))');
    expect(sql).not.toContain('unique (project_run_id,responsibility)');
    expect(sql).not.toContain('unique(project_run_id,responsibility)');
    expect(sql).toContain("assignment_status='active'");
  });

  test('delivery responsibility assignment validates canonical project definitions and is auditable/releasable',()=>{
    const sql=responsibilities();
    expect(sql).toContain('RESPONSIBILITY_NOT_DEFINED_FOR_PROJECT');
    expect(sql).toContain('RESPONSIBILITY_MEMBERSHIP_CONTEXT_MISMATCH');
    expect(sql).toContain('formation_responsibility_assigned');
    expect(sql).toContain('formation_responsibility_released');
    expect(sql).toContain('phase10_release_delivery_responsibility');
    expect(sql).not.toContain('set project_role_id=');
  });

  test('formation, responsibility and Lead writers remain service-role only',()=>{
    expect(formation()).toContain('revoke all on function public.phase10_form_accepted_offer(uuid) from public,anon,authenticated');
    expect(formation()).toContain('grant execute on function public.phase10_form_accepted_offer(uuid) to service_role');
    expect(responsibilities()).toContain('revoke all on function public.phase10_assign_delivery_responsibility(uuid,text,uuid,uuid,text) from public,anon,authenticated');
    expect(responsibilities()).toContain('grant execute on function public.phase10_assign_delivery_responsibility(uuid,text,uuid,uuid,text) to service_role');
    expect(responsibilities()).toContain('revoke all on function public.phase10_confirm_project_lead(uuid,uuid,text) from public,anon,authenticated');
    expect(responsibilities()).toContain('grant execute on function public.phase10_confirm_project_lead(uuid,uuid,text) to service_role');
  });

  test('Project Lead reuses project_members team_role and supports audited reassignment',()=>{
    const sql=responsibilities();
    expect(sql).toContain("set team_role='project_lead'");
    expect(sql).toContain("set team_role='contributor'");
    expect(sql).toContain('previous_membership_id');
    expect(sql).toContain('project_lead_confirmed');
    expect(sql).toContain('project_members_one_live_project_lead_per_run');
    expect(sql).toContain('PROJECT_LEAD_NOT_REQUIRED_FOR_INDEPENDENT_RUN');
  });

  test('legacy single project_role_id responsibility writer is removed',()=>{
    const sql=responsibilities();
    expect(sql).toContain('drop function if exists public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid)');
    expect(sql).toContain('Phase 10 no longer mutates it');
  });

  test('formation guard follows Phase 9 canonical project capacity run lock order',()=>{
    const sql=governance();
    const projectAt=sql.indexOf('from public.projects\n  where id=new.project_id\n  for update');
    const capacityAt=sql.indexOf('perform public.phase9_lock_project_capacity(project_lock_id)');
    const runAt=sql.indexOf('from public.project_runs\n    where id=new.project_run_id\n    for update');
    expect(projectAt).toBeGreaterThan(-1);
    expect(capacityAt).toBeGreaterThan(projectAt);
    expect(runAt).toBeGreaterThan(capacityAt);
  });

  test('Phase 11 start authority remains the existing canonical atomic activation boundary',()=>{
    const start=read('lib/project-start-service.ts');
    const activation=read('supabase/migrations/20260906002900_project_experience_phase_9_atomic_run_activation.sql');
    expect(start).toContain("db.rpc('phase9_activate_project_run'");
    expect(activation).toContain('create or replace function public.phase9_activate_project_run');
    expect(formation()).not.toContain('phase9_activate_project_run');
    expect(responsibilities()).not.toContain('phase9_activate_project_run');
  });
});
