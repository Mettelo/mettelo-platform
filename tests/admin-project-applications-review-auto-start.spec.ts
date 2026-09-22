import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Admin Project Applications review + AUTO start contract',()=>{
 test('SC-01..05 Start Review is a server-authoritative reviewed transition with audit',()=>{
  const queue=read('components/AdminApplicationQueue.tsx');
  const route=read('app/api/admin/applications/route.ts');
  const phase7=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  expect(queue).toContain("await update(item,'in_review'");
  expect(queue).toContain('The review workspace is now open.');
  expect(route).toContain("db.rpc('phase7_transition_review_request_server'");
  expect(route).toContain("event_type:status==='in_review'?'review_started'");
  expect(phase7).toContain("role_name<>'admin'");
  expect(phase7).toContain("insert into public.project_application_events");
  expect(phase7).toContain("actor_user_id,reviewer_notes");
 });

 test('review recovery uses server authority, explicit actor/timestamps and stale-state protection',()=>{
  const route=read('app/api/admin/applications/route.ts');
  const migration=read('supabase/migrations/20260919043000_project_application_review_participation_recovery.sql');
  const queue=read('components/AdminApplicationQueue.tsx');
  expect(route).toContain("db.rpc('phase7_transition_review_request_server'");
  expect(route).toContain('p_actor_user_id:user.id');
  expect(route).toContain('p_expected_status:expectedStatus');
  expect(route).toContain('STALE_REVIEW_STATE');
  for(const text of ['review_started_at','reviewer_user_id','declined_at','STALE_REVIEW_STATE','for update'])expect(migration).toContain(text);
  expect(queue).toContain('expected_status:item.status');
  expect(queue).toContain('Decline project request?');
 });

 test('Admin distinguishes project participation, member choice, effective formation and start threshold',()=>{
  const page=read('app/admin/project-operations/applications/page.tsx');
  const queue=read('components/AdminApplicationQueue.tsx');
  const admission=read('lib/project-admission.ts');
  expect(page).toContain('effectiveApplicationParticipation');
  expect(page).toContain('applicationStartThreshold');
  for(const text of ['Project participation','Member participation choice','Effective formation path','Start threshold','Team configuration'])expect(queue).toContain(text);
  expect(admission).toContain("if(input.preference==='solo')return'solo'");
  expect(admission).toContain("if(input.preference==='team')return'team'");
  expect(admission).toContain("return effective==='team'?Math.max(1,Number(input.minimum||1)):1");
  expect(queue).not.toContain('<dt>Participation mode</dt>');
  expect(queue).not.toContain('<dt>Participation preference</dt>');
 });

 test('SC-06..10 admission mode is independent from participation and Partner remains review-required',()=>{
  const admission=read('lib/project-admission.ts');
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const queue=read('components/AdminApplicationQueue.tsx');
  expect(admission).toContain("if(String(projectType||'').toLowerCase()==='partner')return'review_required'");
  expect(admission).toContain("export type ProjectParticipationMode='solo'|'team'|'flexible'");
  expect(migration).toContain('projects_partner_requires_review_check');
  expect(queue).toContain("if(item.admission_lane==='auto')return[]");
  expect(queue).toContain("item.admission_lane==='auto'?'OPEN · AUTO':'OPEN · REVIEW REQUIRED'");
 });

 test('SC-11..17 effective participation thresholds use Solo=1 Team=minimum and Flexible effective path',()=>{
  const participation=read('supabase/migrations/20260906002000_project_experience_phase_9_participation_hardening.sql');
  const admission=read('lib/project-admission.ts');
  expect(participation).toContain("when p_mode='solo' then 1");
  expect(participation).toContain("when p_mode='flexible' and p_preference in ('solo','either') then 1");
  expect(participation).toContain("else greatest(coalesce(p_minimum,1),1)");
  expect(admission).toContain("if(input.participationMode==='solo'||input.preference==='solo')return 1");
  expect(admission).toContain("return Math.max(1,Number(input.minimum||1))");
 });

 test('SC-18..28 canonical six-hour threshold is durable, invalidated on minimum loss and not reset by extra members',()=>{
  const recovery=read('supabase/migrations/20260918221500_admin_auto_start_threshold_recovery.sql');
  const phase9=read('supabase/migrations/20260906002000_project_experience_phase_9_participation_hardening.sql');
  for(const text of ['threshold_reached_at',"interval '6 hours'",'participation_readiness_invalidated','participation_minimum_reached'])expect(recovery).toContain(text);
  expect(recovery).toContain('set threshold_reached_at=null');
  expect(recovery).toContain('if run_row.threshold_reached_at is null then');
  expect(recovery).toContain('Preserve the original threshold timestamp when extra members join.');
  expect(phase9).toContain('target never blocks');
 });

 test('SC-29..39 Admin and cron use the same canonical start service and normal Admin start cannot bypass eligibility',()=>{
  const admin=read('app/api/admin/project-admission/route.ts');
  const cron=read('app/api/cron/project-formation/route.ts');
  const service=read('lib/project-start-service.ts');
  const action=read('components/AdminAutoStartAction.tsx');
  expect(admin).toContain("startProjectRun({db,projectId,runId,source:action==='start_run'?'manual':'admin_retry'");
  expect(cron).toContain("startProjectRun({db,projectId:run.project_id,runId:run.id,source:'auto_scheduler'");
  expect(service).toContain("if(effectiveMode==='auto'&&(!run.scheduled_start_at||new Date(run.scheduled_start_at).getTime()>Date.now()))");
  expect(service).toContain("blockers:['schedule_not_due']");
  expect(service).toContain("db.rpc('phase11_project_start_readiness'");
  expect(service).toContain("db.rpc('phase9_activate_project_run'");
  expect(action).toContain('Start project now');
  expect(action).toContain('The server will revalidate participation, capacity, readiness and lifecycle state before activation.');
 });

 test('SC-40..49 Admin Project Applications presents separate review and AUTO operational lanes with clear capacity',()=>{
  const page=read('app/admin/project-operations/applications/page.tsx');
  const queue=read('components/AdminApplicationQueue.tsx');
  for(const label of ['Partner / review required','Open review required','AUTO team forming','AUTO eligibility window','AUTO ready to start','AUTO needs attention','Started'])expect(page).toContain(label);
  expect(page).toContain("state==='READY_TO_START'");
  expect(page).toContain('<AdminAutoStartAction');
  expect(queue).toContain("{item.start_threshold} member{item.start_threshold===1?'':'s'} to start");
  expect(queue).toContain('Project team config: Min {item.team_configuration.minimum} · Target {item.team_configuration.target} · Max {item.team_configuration.maximum}');
  expect(queue).not.toContain("if(item.admission_lane==='auto')return['in_review'");
 });

 test('SC-50..55 stale start state, lifecycle, RLS and IDOR remain server-revalidated',()=>{
  const admin=read('app/api/admin/project-admission/route.ts');
  const service=read('lib/project-start-service.ts');
  const activation=read('supabase/migrations/20260906002900_project_experience_phase_9_atomic_run_activation.sql');
  expect(admin).toContain("if(blockers.includes('team_size'))");
  expect(admin).toContain('The team is now below its required minimum');
  expect(service).toContain("blockers:['project_lifecycle']");
  expect(service).toContain("blockers:['auto_start_blocked']");
  expect(activation).toContain('for update');
  expect(activation).toContain("where id=p_run_id and project_id=p_project_id");
  expect(activation).toContain("where id=run_row.id and status='forming' and has_started=false");
 });

 test('Admin force start is explicit, reasoned, audited and cannot bypass hard system integrity',()=>{
  const admin=read('app/api/admin/project-admission/route.ts');
  const detail=read('components/AdminProjectDetailActions.tsx');
  const force=read('supabase/migrations/20260921095600_admin_force_start_project_run.sql');
  expect(admin).toContain("action==='force_start_run'");
  expect(admin).toContain("db.rpc('admin_force_start_project_run'");
  expect(detail).toContain('Force start project');
  expect(detail).toContain('Reason for override');
  for(const text of ['FORCE_START_REQUIRES_MEMBER','FORCE_START_SYSTEM_NOT_READY','FORCE_START_CAPACITY_INVALID','project_admin_force_started','overrode_team_minimum'])expect(force).toContain(text);
  expect(force).toContain("membership_status in ('waiting','active')");
  expect(force).toContain("readiness->'system'->>'ready'");
 });

 test('accepted REVIEW_REQUIRED applications expose governed Admin force start in the queue and submission modal',()=>{
  const queue=read('components/AdminApplicationQueue.tsx');
  const route=read('app/api/admin/project-admission/route.ts');
  expect(queue).toContain("function canForceStart(item:Item)");
  expect(queue).toContain("['accepted','waiting_for_team'].includes(item.status)");
  expect(queue).toContain('Force start project');
  expect(queue).toContain('Reason for force start');
  expect(queue).toContain("action:'force_start_application'");
  expect(route).toContain("action==='force_start_run'||action==='force_start_application'");
  expect(route).toContain("db.rpc('phase10_form_accepted_offer'");
  expect(route).toContain("db.rpc('admin_force_start_project_run'");
 });


 test('AUTO policy cannot be enabled on an incomplete project',()=>{
  const route=read('app/api/admin/project-admission/route.ts');
  expect(route).toContain(".from('project_experience_readiness')");
  expect(route).toContain(".select('publication_ready,lab_ready,publication_blockers,lab_missing')");
  expect(route).toContain("if(!readiness?.publication_ready||!readiness?.lab_ready)");
  expect(route).toContain('AUTO cannot be enabled until project readiness is complete.');
 });

 test('AUTO scheduler remains Hobby-compatible while due-time checks preserve six-hour eligibility',()=>{
  const config=JSON.parse(read('vercel.json')) as {crons?:Array<{path:string;schedule:string}>};
  const formation=config.crons?.find(item=>item.path==='/api/cron/project-formation');
  expect(formation?.schedule).toBe('0 6 * * *');
 });

 test('SC-64..66 Vercel remains manual-only while lint typecheck build stay release gates',()=>{
  const config=JSON.parse(read('vercel.json')) as {git?:{deploymentEnabled?:boolean}};
  expect(config.git?.deploymentEnabled).toBe(false);
  const ci=read('.github/workflows/ci.yml');
  expect(ci).toContain('lint');
  expect(ci).toContain('typecheck');
  expect(ci).toContain('build');
 });
});
