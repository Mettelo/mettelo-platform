import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 17 support, conflict and safeguarding contract',()=>{
 test('support cases attach to canonical project/run/membership without creating parallel systems',()=>{
  const migration=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');
  for(const text of ['references public.projects(id)','references public.project_runs(id)','public.project_members pm','pm.project_run_id=project_support_cases.project_run_id','pm.user_id=auth.uid()'])expect(migration).toContain(text);
  for(const text of ['create table public.project_members','create table public.project_runs','create table public.projects'])expect(migration).not.toContain(text);
 });
 test('case categories and states match the Phase 17 contract',()=>{
  const migration=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');
  for(const text of ['technical_access','resource_data','project_scope','project_lead_support','team_collaboration','workload','conduct','accessibility_adjustment','other'])expect(migration).toContain(text);
  for(const text of ['open','under_review','awaiting_member','recovery_in_progress','escalated','resolved','closed'])expect(migration).toContain(text);
 });
 test('RLS makes cases reporter-private and does not grant Project Lead access',()=>{
  const migration=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');
  for(const text of ['enable row level security','reporter_user_id=auth.uid()','member_visible=true','membership_status=\'active\''])expect(migration).toContain(text);
  expect(migration).not.toContain("team_role='project_lead'");
  expect(migration).not.toContain('for update to authenticated');
  expect(migration).not.toContain('for delete to authenticated');
 });
 test('member API authenticates exact-run membership and keeps support notification copy generic',()=>{
  const route=read('app/api/project-support-cases/route.ts');
  for(const text of ['auth.auth.getUser()',".eq('project_run_id',runId).eq('user_id',user.id)","membership.membership_status!=='active'",'notifyAdmins','A private project support case needs review'])expect(route).toContain(text);
  expect(route.indexOf('auth.auth.getUser()')).toBeLessThan(route.indexOf('serviceDb()'));
  const notification=route.slice(route.indexOf('await notifyAdmins'),route.indexOf('}catch(notificationError)'));
  for(const privateField of ['description,','body.description','category,description','internal_notes','recovery_plan'])expect(notification).not.toContain(privateField);
 });
 test('Admin workflow requires project-management capability and emits non-sensitive project audit metadata',()=>{
  const route=read('app/api/admin/project-support-cases/route.ts');
  for(const text of ["hasAdminCapability(user,'projects.manage')",'project_support_case_updates','project_activity_log',"actor_type:'admin'",'support_case_id:caseId'])expect(route).toContain(text);
  const email=route.slice(route.indexOf('await notifyUser'),route.indexOf('}catch(notificationError)'));
  expect(email).toContain('A secure update is available on your private project support case in Mettelo.');
  for(const privateField of ['note,','current.description','internal_notes','current.resolution','current.recovery_plan'])expect(email).not.toContain(privateField);
 });
 test('Admin state transitions keep safeguarding detail restricted and closing requires resolution',()=>{
  const route=read('app/api/admin/project-support-cases/route.ts');
  for(const action of ['review','assign_self','request_information','record_recovery_plan','escalate_safeguarding','resolve','close','reopen'])expect(route).toContain(`'${action}'`);
  expect(route).toContain("if(current.status!=='resolved')return NextResponse.json({error:'Resolve the case before closing it.'}");
  expect(route).toContain("patch.internal_notes=[current.internal_notes,note]");
  expect(route).toContain("memberVisible=false");
 });
 test('readiness document keeps all seventeen release criteria explicit',()=>{
  const doc=read('docs/PHASE_17_SUPPORT_CONFLICT_SAFEGUARDING_READINESS.md');
  for(const text of ['Member can create case.','Correct project/run attached.','Case private.','Admin access restricted.','Lead complaint does not require Lead permission.','Sensitive details not emailed.','Case states work.','Audit works.','Recovery plan works.','Replacement can follow resolution.','Removal authorized.','RLS passes.','Mobile works.','Accessibility passes.','Security review passes.','Support E2E passes.','Docs updated.'])expect(doc).toContain(text);
 });
});
