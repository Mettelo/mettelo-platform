import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');

const foundation=read('supabase/migrations/20260906020000_project_experience_phase_11_start_readiness.sql');
const hardening=read('supabase/migrations/20260906020100_project_experience_phase_11_readiness_hardening.sql');
const activationGuard=read('supabase/migrations/20260906020200_project_experience_phase_11_activation_guard.sql');
const finalAuthority=read('supabase/migrations/20260906020300_project_experience_phase_11_final_authority.sql');
const startService=read('lib/project-start-service.ts');
const adminFlow=read('app/api/admin/project-flow/route.ts');
const adminReadinessApi=read('app/api/admin/project-start-readiness/route.ts');
const adminReadinessUi=read('components/AdminProjectStartReadiness.tsx');

const migration=`${foundation}\n${hardening}\n${activationGuard}\n${finalAuthority}`;

test.describe('Project Experience Phase 11 start readiness contract',()=>{
  test('composes project team and system readiness without a second lifecycle',()=>{
    expect(migration).toContain('phase11_project_start_readiness');
    expect(migration).toContain("'project',jsonb_build_object");
    expect(migration).toContain("'team',jsonb_build_object");
    expect(migration).toContain("'system',jsonb_build_object");
    expect(migration).toContain("'state',case when project_ready and team_ready and system_ready then 'READY' else 'NOT_READY' end");
    expect(migration).not.toContain('create table public.project_runs_v2');
    expect(migration).not.toContain('create table public.project_members_v2');
  });

  test('returns safe reason codes while retaining compatibility blockers',()=>{
    for(const code of ['PROJECT_INCOMPLETE','TEAM_BELOW_MINIMUM','MEMBERSHIP_INVALID','LEAD_REQUIRED','RESPONSIBILITY_GAP','LAB_NOT_READY','RESOURCE_NOT_READY','MILESTONE_NOT_READY','PROJECT_PAUSED','PROJECT_BLOCKED','OFFER_NOT_ACCEPTED','RECRUITMENT_STATE_INVALID','SCHEDULE_NOT_DUE'])expect(migration).toContain(code);
    expect(hardening).toContain("'reason_codes'");
    expect(hardening).toContain("'blockers'");
  });

  test('uses canonical Phase 3 brief, resources, deliverables, success criteria and timeline truth',()=>{
    expect(migration).toContain('public.project_experience_readiness');
    expect(hardening).toContain('public.project_problem_briefs');
    expect(hardening).toContain('key_questions');
    expect(hardening).toContain('in_scope');
    expect(hardening).toContain('out_of_scope');
    expect(hardening).toContain('public.project_milestones');
    expect(hardening).toContain('public.project_data_sources');
    expect(migration).toContain('publication_ready');
    expect(migration).toContain('lab_ready');
  });

  test('preserves AUTO vs REVIEW_REQUIRED governance without fake Offers',()=>{
    expect(hardening).toContain("effective_admission='review_required'");
    expect(hardening).toContain('public.project_offers');
    expect(hardening).toContain("o.status='accepted'");
    expect(hardening).not.toContain("effective_admission='auto' then\n    select count(*)::integer into missing_accepted_offers");
  });

  test('final REVIEW_REQUIRED authority is exact-run accepted Offer consumption',()=>{
    expect(finalAuthority).toContain('join public.project_offers o on o.application_id=a.id');
    expect(finalAuthority).toContain('a.project_run_id=p_run_id');
    expect(finalAuthority).toContain('a.user_id=m.user_id');
    expect(finalAuthority).toContain("o.status='accepted'");
    expect(finalAuthority).toContain('o.accepted_at is not null');
    expect(finalAuthority).toContain('o.reservation_released_at is null');
    expect(finalAuthority).toContain('o.reservation_consumed_at is not null');
  });

  test('preserves Phase 10 lead and normalized responsibility authority',()=>{
    expect(migration).toContain("team_role='project_lead'");
    expect(migration).toContain('public.project_member_responsibilities');
    expect(migration).toContain("r.assignment_status='active'");
    expect(migration).toContain('if required_members>1 then');
  });

  test('keeps target non-blocking and maximum explicit',()=>{
    expect(hardening).toContain('target_members:=greatest(required_members');
    expect(hardening).toContain('if filled<required_members then');
    expect(hardening).toContain('if filled>maximum_members then');
    expect(hardening).not.toContain('if filled<target_members then');
  });

  test('AUTO delay consumes configuration and does not reset a valid timer',()=>{
    expect(hardening).toContain('auto_start_delay_minutes set default 360');
    expect(hardening).toContain('make_interval(mins=>delay_minutes)');
    expect(hardening).toContain('coalesce(project_row.auto_start_delay_minutes,360)');
    expect(hardening).toContain('if run_row.scheduled_start_at is null');
    expect(hardening).not.toContain("interval '6 hours'");
    expect(hardening).not.toContain('auto_start_delay_minutes=360');
  });

  test('final readiness includes AUTO schedule eligibility',()=>{
    expect(finalAuthority).toContain("reasons ? 'SCHEDULE_NOT_DUE'");
    expect(finalAuthority).toContain("system_blockers ? 'schedule_not_due'");
    expect(finalAuthority).toContain("run_row.scheduled_start_at is null or run_row.scheduled_start_at>now()");
    expect(finalAuthority).toContain("'{system,schedule_due}'");
  });

  test('database ACTIVE transition is guarded by current Phase 11 readiness',()=>{
    expect(activationGuard).toContain('create or replace function public.phase11_guard_run_activation()');
    expect(activationGuard).toContain("readiness:=public.phase11_project_start_readiness(old.project_id,old.id)");
    expect(activationGuard).toContain("message='PHASE11_START_NOT_READY'");
    expect(activationGuard).toContain("message='SCHEDULE_NOT_DUE'");
    expect(activationGuard).toContain("message='PROJECT_PAUSED'");
    expect(activationGuard).toContain("message='PROJECT_BLOCKED'");
    expect(activationGuard).toContain('before update of status,has_started on public.project_runs');
  });

  test('keeps one canonical start entry point and final atomic authority',()=>{
    expect(startService).toContain("rpc('phase11_project_start_readiness'");
    expect(startService).toContain("rpc('phase9_activate_project_run'");
    expect(startService.indexOf("rpc('phase11_project_start_readiness'")).toBeLessThan(startService.indexOf("rpc('phase9_activate_project_run'"));
    expect(startService).not.toContain('autoStartProject');
    expect(startService).not.toContain('partnerStartProject');
    expect(startService).not.toContain('soloStartProject');
    expect(startService).not.toContain('teamStartProject');
  });

  test('Admin start no longer directly mutates activation state',()=>{
    expect(adminFlow).toContain("startProjectRun({db,projectId,runId,source:'manual',actorUserId:user.id})");
    const forceStart=adminFlow.slice(adminFlow.indexOf("if(action==='force_start')"),adminFlow.indexOf("if(action==='cancel')"));
    expect(forceStart).not.toContain("from('project_runs').update({status:'active'");
    expect(forceStart).not.toContain("from('project_members').update({membership_status:'active'");
    expect(forceStart).not.toContain("from('project_applications').update({status:'team_complete'");
  });

  test('Admin readiness UI consumes server authority and exposes grouped textual status',()=>{
    expect(adminReadinessApi).toContain("rpc('phase11_project_start_readiness'");
    expect(adminReadinessUi).toContain('PROJECT');
    expect(adminReadinessUi).toContain('TEAM');
    expect(adminReadinessUi).toContain('SYSTEM');
    expect(adminReadinessUi).toContain('NOT READY');
    expect(adminReadinessUi).toContain('START SCHEDULED · No approval required.');
    expect(adminReadinessUi).toContain('aria-live="polite"');
    expect(adminReadinessUi).toContain('@media(max-width:480px)');
  });

  test('only canonical readiness remains service-callable',()=>{
    expect(migration).toContain('security definer');
    expect(finalAuthority).toContain('alter function public.phase11_project_start_readiness(uuid,uuid)\n  rename to phase11_project_start_readiness_v1_base');
    expect(finalAuthority).toContain('revoke all on function public.phase11_project_start_readiness_v1_base(uuid,uuid)\n  from public,anon,authenticated,service_role');
    expect(finalAuthority).toContain('revoke all on function public.phase11_project_start_readiness(uuid,uuid)\n  from public,anon,authenticated');
    expect(finalAuthority).toContain('grant execute on function public.phase11_project_start_readiness(uuid,uuid)\n  to service_role');
    expect(activationGuard).toContain('revoke all on function public.phase11_guard_run_activation() from public,anon,authenticated');
  });
});
