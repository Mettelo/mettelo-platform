import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');
const formation=()=>read('supabase/migrations/20260906010000_project_experience_phase_10_canonical_formation.sql');
const governance=()=>read('supabase/migrations/20260906010100_project_experience_phase_10_responsibility_lead_governance.sql');

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
    expect(sql).toContain("FORMATION_REQUIRES_REVIEW_REQUIRED");
    expect(sql).toContain("AUTO_MEMBERSHIP_ALREADY_OWNED_BY_PHASE6");
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

  test('formation and responsibility writers remain service-role only',()=>{
    expect(formation()).toContain('revoke all on function public.phase10_form_accepted_offer(uuid) from public,anon,authenticated');
    expect(formation()).toContain('grant execute on function public.phase10_form_accepted_offer(uuid) to service_role');
    expect(governance()).toContain('revoke all on function public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid) from public,anon,authenticated');
    expect(governance()).toContain('grant execute on function public.phase10_assign_member_responsibility(uuid,uuid,boolean,uuid) to service_role');
  });

  test('responsibility assignment validates role ownership and preserves a selected lead',()=>{
    const sql=governance();
    expect(sql).toContain('PROJECT_ROLE_PROJECT_MISMATCH');
    expect(sql).toContain("next_team_role:=coalesce(member_row.team_role,'contributor')");
    expect(sql).toContain('FORMATION_ASSIGNMENT_REQUIRES_FORMING_RUN');
    expect(sql).toContain("'project_active',false");
  });

  test('multi-member formation allows exactly one live Project Lead and independent runs require none',()=>{
    const sql=governance();
    expect(sql).toContain('PROJECT_LEAD_NOT_REQUIRED_FOR_INDEPENDENT_RUN');
    expect(sql).toContain('PROJECT_LEAD_ALREADY_ASSIGNED');
    expect(sql).toContain("team_role='project_lead'");
    expect(sql).toContain("membership_status in ('waiting','active')");
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
    expect(governance()).not.toContain('phase9_activate_project_run');
  });
});
