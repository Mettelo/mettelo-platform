import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {hasAdminCapability} from '../lib/admin-capabilities';
const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 17 support, conflict and safeguarding contract',()=>{
 test('support cases attach to canonical project/run/membership without creating parallel systems',()=>{
  const migration=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');
  const hardening=read('supabase/migrations/20260908013000_project_experience_phase_17_signoff_hardening.sql');
  for(const text of ['references public.projects(id)','references public.project_runs(id)','public.project_members pm','pm.project_run_id=project_support_cases.project_run_id','pm.user_id=auth.uid()'])expect(migration).toContain(text);
  for(const text of ['SUPPORT_CASE_PROJECT_RUN_MISMATCH','SUPPORT_CASE_ACTIVE_REPORTER_MEMBERSHIP_REQUIRED','before insert or update of project_id,project_run_id,reporter_user_id'])expect(hardening).toContain(text);
  for(const text of ['create table public.project_members','create table public.project_runs','create table public.projects'])expect(migration).not.toContain(text);
 });
 test('case categories and states match the Phase 17 contract and unsupported pause is rejected by the final schema',()=>{
  const migration=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');
  const hardening=read('supabase/migrations/20260908013000_project_experience_phase_17_signoff_hardening.sql');
  for(const text of ['technical_access','resource_data','project_scope','project_lead_support','team_collaboration','workload','conduct','accessibility_adjustment','other'])expect(migration).toContain(text);
  for(const text of ['open','under_review','awaiting_member','recovery_in_progress','escalated','resolved','closed'])expect(migration).toContain(text);
  expect(hardening).not.toContain("'participation_paused'");
  for(const action of ['created','reviewed','assigned','information_requested','member_update','recovery_plan_recorded','responsibility_reassigned','lead_changed','replacement_approved','member_removed','safeguarding_escalated','resolved','closed','reopened'])expect(hardening).toContain(`'${action}'`);
 });
 test('RLS plus column privileges keep cases reporter-private and internal notes unreadable',()=>{
  const migration=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');
  for(const text of ['enable row level security','reporter_user_id=auth.uid()','member_visible=true',"membership_status='active'",'revoke all on public.project_support_cases from anon,authenticated','grant select ('])expect(migration).toContain(text);
  const safeGrant=migration.slice(migration.indexOf('grant select ('),migration.indexOf(') on public.project_support_cases to authenticated;'));
  expect(safeGrant).not.toContain('internal_notes');expect(safeGrant).not.toContain('assigned_admin_user_id');expect(migration).not.toContain("team_role='project_lead'");expect(migration).not.toContain('for update to authenticated');expect(migration).not.toContain('for delete to authenticated');
 });
 test('legacy Admin compatibility does not implicitly grant Phase 17 private-support or safeguarding authority',()=>{
  const legacy={app_metadata:{role:'admin'}};
  expect(hasAdminCapability(legacy,'projects.manage')).toBe(true);
  expect(hasAdminCapability(legacy,'projects.support.manage')).toBe(false);
  expect(hasAdminCapability(legacy,'projects.safeguarding.manage')).toBe(false);
  const supportOnly={app_metadata:{role:'admin',admin_capabilities:['projects.support.manage']}};
  expect(hasAdminCapability(supportOnly,'projects.support.manage')).toBe(true);
  expect(hasAdminCapability(supportOnly,'projects.safeguarding.manage')).toBe(false);
  const explicit={app_metadata:{role:'admin',admin_capabilities:['projects.support.manage','projects.safeguarding.manage']}};
  expect(hasAdminCapability(explicit,'projects.support.manage')).toBe(true);
  expect(hasAdminCapability(explicit,'projects.safeguarding.manage')).toBe(true);
 });
 test('member API authenticates exact-run membership, supports secure reporter response and keeps notification copy generic',()=>{
  const route=read('app/api/project-support-cases/route.ts');
  for(const text of ['auth.auth.getUser()',".eq('project_run_id',runId).eq('user_id',user.id)","membership.membership_status!=='active'",'notifyAdmins','A private project support case needs review','export async function PATCH',".eq('reporter_user_id',user.id)","current.status!=='awaiting_member'", "action:'member_update'"])expect(route).toContain(text);
  expect(route.indexOf('auth.auth.getUser()')).toBeLessThan(route.indexOf('serviceDb()'));
  const createNotification=route.slice(route.indexOf('await notifyAdmins'),route.indexOf('}catch(notificationError)'));for(const privateField of ['description,','body.description','category,description','internal_notes','recovery_plan'])expect(createNotification).not.toContain(privateField);
 });
 test('Admin workflow requires explicit support capability and safeguarding access is narrower',()=>{
  const route=read('app/api/admin/project-support-cases/route.ts');const capabilities=read('lib/admin-capabilities.ts');
  for(const text of ["hasAdminCapability(user,'projects.support.manage')","hasAdminCapability(user,'projects.safeguarding.manage')",'project_support_case_updates','project_activity_log',"actor_type:'admin'",'support_case_id:caseId','safeguarding_escalated_at','Confirm safeguarding escalation before continuing.'])expect(route).toContain(text);
  expect(capabilities).toContain("'projects.support.manage'");expect(capabilities).toContain("'projects.safeguarding.manage'");expect(capabilities).toContain('EXPLICIT_ONLY_CAPABILITIES');
  const email=route.slice(route.indexOf('await notifyUser'),route.indexOf('}catch(notificationError)'));expect(email).toContain('A secure update is available on your private project support case in Mettelo.');for(const privateField of ['note,','current.description','internal_notes','current.resolution','current.recovery_plan'])expect(email).not.toContain(privateField);
 });
 test('governed handler reassignment requires elevated authority and an already-authorized support target',()=>{
  const route=read('app/api/admin/project-support-cases/route.ts'),admin=read('app/admin/project-support/page.tsx');
  for(const text of ["'assign_admin'","hasAdminCapability(user,'admin.access.manage')","hasAdminCapability(candidate,'projects.support.manage')","hasAdminCapability(target.data.user,'projects.support.manage')","hasAdminCapability(target.data.user,'projects.safeguarding.manage')",'The selected account is not an authorized private-support Admin.'])expect(route).toContain(text);
  for(const text of ['Reassign support handler','Authorized support handler','Only Admins already granted private-support capability are listed.','assigned_admin_user_id:action===\'assign_admin\'?assignedAdminUserId:undefined'])expect(admin).toContain(text);
 });
 test('Admin state transitions keep safeguarding detail restricted, reject stale concurrent writes and closing requires resolution',()=>{
  const route=read('app/api/admin/project-support-cases/route.ts');const privacy=read('supabase/migrations/20260908011000_project_experience_phase_17_support_privacy_hardening.sql');
  for(const action of ['review','assign_self','assign_admin','request_information','record_recovery_plan','escalate_safeguarding','resolve','close','reopen'])expect(route).toContain(`'${action}'`);
  expect(route).toContain("if(current.status!=='resolved')return NextResponse.json({error:'Resolve the case before closing it.'}");expect(route).toContain("patch.internal_notes=[current.internal_notes,note]");expect(route).toContain(".eq('updated_at',current.updated_at)");expect(route).toContain('This support case changed before your action was saved.');expect(privacy).toContain('safeguarding_escalated_at timestamptz');expect(privacy).toContain('Permanent sensitivity marker');
 });
 test('consequential recovery reuses Phase 10 and 16 authorities and keeps private text out of handover',()=>{
  const recovery=read('supabase/migrations/20260908012000_project_experience_phase_17_canonical_recovery_actions.sql');const route=read('app/api/admin/project-support-recovery/route.ts');const admin=read('app/admin/project-support/page.tsx');
  for(const text of ['phase10_release_delivery_responsibility','phase10_assign_delivery_responsibility','phase10_confirm_project_lead','phase16_request_replacement','phase16_transition_member_departure',"'support_resolution'",'SUPPORT_CASE_STALE',"set status='recovery_in_progress'",'grant execute on function public.phase17_execute_support_recovery'])expect(recovery).toContain(text);
  expect(recovery).not.toContain('case_row.description');expect(recovery).not.toContain('case_row.internal_notes');
  for(const text of ["hasAdminCapability(user,'projects.support.manage')","hasAdminCapability(user,'projects.manage')",'body.confirmed!==true','p_expected_updated_at:expectedUpdatedAt','pause_supported:false'])expect(route).toContain(text);
  for(const text of ['Consequential project recovery','I confirm this consequential action','Participation pause is not offered'])expect(admin).toContain(text);
  expect(recovery).not.toContain("membership_status='paused'");
 });
 test('real recovery and responsive evidence are release-blocking rather than imported between Playwright files',()=>{
  const pkg=read('package.json'),e2e=read('tests/project-experience-phase17-support-e2e.spec.ts'),responsive=read('tests/project-experience-phase17-responsive-e2e.spec.ts'),phase15=read('tests/project-experience-phase15-solo-conversion-e2e.spec.ts');
  expect(pkg.match(/tests\/project-experience-phase17-support-e2e\.spec\.ts/g)||[]).toHaveLength(2);expect(pkg.match(/tests\/project-experience-phase17-responsive-e2e\.spec\.ts/g)||[]).toHaveLength(2);
  for(const text of ['responsibility_reassigned','lead_changed','member_removed','replacement_requested','staleLead.response.status()).toBe(409)'])expect(e2e).toContain(text);
  for(const text of ['width:320','fontSize=\'200%\'','noHorizontalOverflow(page)','Consequential project recovery'])expect(responsive).toContain(text);
  expect(phase15).not.toContain("import './project-experience-phase16-member-exit-e2e.spec'");
 });
 test('member Lab surface provides private entry, safe reference, tracker and secure information response',()=>{
  const member=read('components/project-experience/ProjectSupportCaseSection.tsx');for(const text of ['PRIVATE SUPPORT','Your Project Lead and teammates do not automatically receive access','Support case created. Reference','Mettelo project support is not an emergency service.',"item.status==='awaiting_member'",'Respond securely','Send secure response',"item.status==='closed'"])expect(member).toContain(text);
 });
 test('readiness document keeps all seventeen release criteria explicit',()=>{
  const doc=read('docs/PHASE_17_SUPPORT_CONFLICT_SAFEGUARDING_READINESS.md');for(const text of ['Member can create case.','Correct project/run attached.','Case private.','Admin access restricted.','Lead complaint does not require Lead permission.','Sensitive details not emailed.','Case states work.','Audit works.','Recovery plan works.','Replacement can follow resolution.','Removal authorized.','RLS passes.','Mobile works.','Accessibility passes.','Security review passes.','Support E2E passes.','Docs updated.'])expect(doc).toContain(text);
 });
});