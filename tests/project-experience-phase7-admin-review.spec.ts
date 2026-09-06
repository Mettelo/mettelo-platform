import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 7 source contract',()=>{
 test('Partner Projects are canonically REVIEW_REQUIRED across app and database',()=>{
  const admission=read('lib/project-admission.ts');
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const api=read('app/api/admin/project-admission/route.ts');
  const scheduler=read('app/api/cron/project-formation/route.ts');
  const start=read('lib/project-start-service.ts');
  expect(admission).toContain("if(String(projectType||'').toLowerCase()==='partner')return'review_required'");
  expect(migration).toContain('projects_partner_requires_review_check');
  expect(migration).toContain("check (project_type is distinct from 'partner' or admission_mode='review_required')");
  expect(api).toContain('Partner Projects always require human review. AUTO cannot be enabled.');
  expect(scheduler).toContain("effectiveProjectAdmissionMode(project.project_type,project.admission_mode)!=='auto'");
  expect(start).toContain("if(source==='auto_scheduler'&&effectiveMode!=='auto')");
 });

 test('Open AUTO uses a durable six-hour intervention window and zero-Admin happy path',()=>{
  const admission=read('lib/project-admission.ts');
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const adminPolicy=read('components/AdminProjectAdmissionPolicy.tsx');
  const scheduler=read('app/api/cron/project-formation/route.ts');
  expect(admission).toContain('DEFAULT_AUTO_START_DELAY_MINUTES=360');
  expect(migration).toContain('alter column auto_start_delay_minutes set default 360');
  expect(migration).toContain('add column if not exists start_ready_at timestamptz');
  expect(migration).toContain('project_run_start_ready_capture');
  expect(adminPolicy).toContain('No action required');
  expect(adminPolicy).toContain('scheduler starts the run automatically');
  expect(scheduler).toContain("source:'auto_scheduler'");
 });

 test('AUTO oversight supports start, pause, block, resume, retry and safe conversion',()=>{
  const api=read('app/api/admin/project-admission/route.ts');
  const adminPolicy=read('components/AdminProjectAdmissionPolicy.tsx');
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  for(const action of ['pause_run','resume_run','block_run','unblock_run','retry_run','start_run'])expect(api).toContain(`'${action}'`);
  expect(api).toContain("action==='convert_to_review_required'");
  expect(api).toContain("auth.rpc('phase7_convert_open_auto_to_review_required'");
  expect(adminPolicy).toContain('Convert to review required');
  expect(adminPolicy).toContain('Block start');
  expect(adminPolicy).toContain('Unblock');
  expect(migration).toContain('phase7_convert_open_auto_to_review_required');
 });

 test('scheduler and canonical start service reject stale policy, pause/block and unsafe readiness',()=>{
  const scheduler=read('app/api/cron/project-formation/route.ts');
  const start=read('lib/project-start-service.ts');
  expect(scheduler).toContain('project_auto_start_policy_blocked');
  expect(scheduler).toContain('start_ready_at:null');
  expect(start).toContain("blockers:['admission_mode']");
  expect(start).toContain("blockers:['project_lifecycle']");
  expect(start).toContain("blockers:['auto_start_blocked']");
  expect(start).toContain("blockers:['capacity']");
  expect(start).toContain('assessProjectTeamReadiness');
 });

 test('REVIEW_REQUIRED uses governed clarification, shortlist, offer and decline without membership',()=>{
  const route=read('app/api/admin/applications/route.ts');
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  expect(route).toContain("'clarification_requested'");
  expect(route).toContain("auth.rpc('phase7_transition_review_request'");
  expect(route).toContain('creates_membership:false');
  expect(migration).toContain("(app.status='in_review' and p_to_status in ('clarification_requested','shortlisted','offered','declined'))");
  expect(migration).toContain("(app.status='clarification_requested' and p_to_status in ('in_review','declined'))");
  expect(route).not.toContain(".from('project_members').insert");
  expect(route).not.toContain("startProjectRun(");
 });

 test('Offer is capacity-safe, concurrency-safe and remains Phase 8 handoff',()=>{
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const queue=read('components/AdminApplicationQueue.tsx');
  expect(migration).toContain("perform pg_advisory_xact_lock(hashtextextended(project.id::text,7))");
  expect(migration).toContain("status='offered'");
  expect(migration).toContain("message='OFFER_CAPACITY_FULL'");
  expect(migration).toContain("'creates_membership',false");
  expect(migration).toContain("'requires_member_acceptance',p_to_status='offered'");
  expect(queue).toContain('Capacity is revalidated server-side before the Offer is recorded.');
  expect(queue).toContain('explicit member acceptance remains required');
 });

 test('member clarification response is owner scoped and returns the same request to review',()=>{
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const route=read('app/api/project-applications/clarification/route.ts');
  const member=read('components/MemberClarificationRequests.tsx');
  expect(migration).toContain('phase7_respond_to_clarification');
  expect(migration).toContain('app.user_id<>actor');
  expect(migration).toContain("if app.status<>'clarification_requested'");
  expect(migration).toContain("set status='in_review'");
  expect(route).toContain("supabase.rpc('phase7_respond_to_clarification'");
  expect(member).toContain('NEEDS YOU');
  expect(member).toContain('Send clarification');
 });

 test('Admin review separates Partner identity, self-declared profile and verified Proof',()=>{
  const queue=read('components/AdminApplicationQueue.tsx');
  const page=read('app/admin/project-operations/applications/page.tsx');
  expect(queue).toContain('PARTNER PROJECT');
  expect(queue).toContain('Partner organisation');
  expect(queue).toContain('Self-declared professional profile');
  expect(queue).toContain('They are not verified Mettelo Proof');
  expect(queue).toContain('Verified Mettelo Proof');
  expect(queue).toContain("function openPlaces(item:Item){return Math.max(0,item.capacity.maximum-item.capacity.confirmed-(item.capacity.reservedOffers||0))}");
  expect(queue).toContain('{openPlaces(detail)} open');
  expect(page).toContain('Partner / review required');
  expect(page).toContain('AUTO start scheduled');
  expect(page).toContain('AUTO needs attention');
 });

 test('canonical audit records actors, states and reviewer notes',()=>{
  const phase7=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const route=read('app/api/admin/applications/route.ts');
  expect(phase7).toContain('add column if not exists reviewer_notes text');
  expect(phase7).toContain('auth.uid()');
  expect(phase7).toContain('new.reviewer_notes');
  expect(route).toContain("actor_type:'user'");
  expect(route).toContain("event_type:status==='in_review'?'review_started':status==='clarification_requested'?'clarification_requested'");
 });

 test('review communication failures cannot falsify the canonical decision',()=>{
  const route=read('app/api/admin/applications/route.ts');
  expect(route).toContain('let communicationRecorded=true');
  expect(route).toContain("console.error('project review communication error',error)");
  expect(route).toContain('communication:{body:memberMessage,recorded:communicationRecorded}');
 });

 test('member Offer copy remains truthful and does not expose Phase 8 acceptance early',()=>{
  const tracker=read('components/MemberApplicationTracker.tsx');
  expect(tracker).toContain("offered:'Place offered'");
  expect(tracker).toContain("if(item.status==='offered')return'→ Place offered'");
  expect(tracker).toContain('Selection does not enrol you automatically');
  expect(tracker).not.toContain("withdrawable=new Set(['submitted','in_review','shortlisted','offered'");
 });
});
