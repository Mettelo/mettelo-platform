import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 21 scale contract',()=>{
  test('extends the canonical projects model for updated Phase 18 policy instead of creating a second project system',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    for(const text of [
      'alter table public.projects',
      'collaboration_marketplace_enabled',
      'project_lead_invites_enabled',
      'team_member_invites_enabled',
      'external_collaboration_invites_enabled',
      'collaboration_social_sharing_enabled',
      'offer_expiry_hours',
      'offer_reminders_enabled'
    ])expect(migration).toContain(text);
    for(const duplicate of ['create table public.projects','create table public.project_runs','create table public.project_members','create table public.project_offers','create table public.project_collaboration_needs'])expect(migration).not.toContain(duplicate);
  });

  test('Admin Create converges on the canonical 10-step builder rather than the legacy quick-create POST path',()=>{
    const button=read('components/AdminProjectCreateButton.tsx');
    const adminBuilder=read('app/admin/project-operations/projects/new/page.tsx');
    const canonicalBuilder=read('components/ArchitectProjectForm.tsx');
    for(const text of [
      'href="/admin/project-operations/projects/new"',
      'Create project'
    ])expect(button).toContain(text);
    expect(button).not.toContain("fetch('/api/admin/projects'");
    expect(button).not.toContain('Create private draft');
    expect(adminBuilder).toContain("import ArchitectProjectForm from '@/components/ArchitectProjectForm'");
    expect(adminBuilder).toContain("user.app_metadata?.role!=='admin'");
    expect(adminBuilder).toContain('<ArchitectProjectForm providers={providers||[]} capabilities={capabilities||[]}/>');
    for(const step of ['Project basics','Problem & context','Data & resources','Deliverables & success','Skills & Proof','Roles & team','Timeline','Application settings','Lab preview','Review & publish readiness'])expect(canonicalBuilder).toContain(step);
    expect(canonicalBuilder).toContain("fetch('/api/architect-projects'");
  });

  test('canonical project creation persists the Phase 21 admission recruitment and Offer policy on projects',()=>{
    const route=read('app/api/architect-projects/route.ts');
    for(const text of [
      "DEFAULT_AUTO_START_DELAY_MINUTES,canonicalAdmissionMode",
      "projectType==='partner'?'review_required':canonicalAdmissionMode(body.admission_mode)",
      'late_joining_enabled:lateJoining',
      'late_joining_cutoff_at:lateJoiningCutoff',
      'project_sharing_enabled:projectSharing',
      'member_invites_enabled:memberInvites',
      'collaboration_marketplace_enabled:collaborationMarketplace',
      'project_lead_invites_enabled:leadInvites',
      'team_member_invites_enabled:teamInvites',
      'external_collaboration_invites_enabled:externalInvites',
      'collaboration_social_sharing_enabled:socialSharing',
      'offer_expiry_hours:offerExpiryHours',
      'offer_reminders_enabled:offerReminders',
      'applications_open:false'
    ])expect(route).toContain(text);
    expect(route).toContain("const leadInvites=memberInvites&&body.project_lead_invites_enabled!==false");
    expect(route).toContain("const externalInvites=collaborationMarketplace&&body.external_collaboration_invites_enabled===true");
    expect(route).toContain("const socialSharing=collaborationMarketplace&&projectSharing&&body.collaboration_social_sharing_enabled===true");
  });

  test('Partner mandatory review remains a database invariant and AUTO delay stays canonical in application code',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    const admission=read('lib/project-admission.ts');
    const api=read('app/api/admin/project-admission/route.ts');
    expect(migration).toContain("project_type is distinct from 'partner' or admission_mode='review_required'");
    expect(admission).toMatch(/DEFAULT_AUTO_START_DELAY_MINUTES\s*=\s*360/);
    expect(api).toContain('safeAutoStartDelayMinutes(project.auto_start_delay_minutes)');
    expect(api).not.toContain('const delay=360');
    expect(api).not.toContain('setDelay(360)');
  });

  test('Admin admission policy owns the updated Phase 18 project controls on the same canonical row',()=>{
    const api=read('app/api/admin/project-admission/route.ts');
    for(const text of [
      'late_joining_enabled',
      'late_joining_cutoff_at',
      'project_sharing_enabled',
      'member_invites_enabled',
      'collaboration_marketplace_enabled',
      'project_lead_invites_enabled',
      'team_member_invites_enabled',
      'external_collaboration_invites_enabled',
      'collaboration_social_sharing_enabled',
      'offer_expiry_hours',
      'offer_reminders_enabled',
      "event_type:'project_admission_policy_updated'"
    ])expect(api).toContain(text);
    expect(api).toContain("Partner Projects always require human review. AUTO cannot be enabled.");
  });

  test('database guards fail closed when updated Phase 18 recruitment policy or lifecycle forbids recruitment',()=>{
    const migration=read('supabase/migrations/20260908204000_project_experience_phase_21_recruitment_policy_guards.sql');
    for(const text of [
      'COLLABORATION_MARKETPLACE_DISABLED',
      'COLLABORATION_NEED_PROJECT_CLOSED',
      'COLLABORATION_NEED_JOINING_WINDOW_CLOSED',
      'COLLABORATION_NEED_RUN_RECRUITMENT_CLOSED',
      'MEMBER_INVITES_DISABLED',
      'EXTERNAL_INVITES_DISABLED',
      "project_row.status in ('completed','cancelled','archived')",
      'phase21_terminal_project_recruitment_close',
      'phase21_marketplace_policy_close'
    ])expect(migration).toContain(text);
  });

  test('terminal lifecycle and marketplace disable close needs and invalidate pending invites without deleting history',()=>{
    const migration=read('supabase/migrations/20260908204000_project_experience_phase_21_recruitment_policy_guards.sql');
    for(const text of [
      "set status='closed',closed_reason=close_reason",
      "set status='invalidated',invalidated_at=coalesce(invalidated_at,now())",
      "closed_reason='marketplace_disabled'",
      'project_member_collaboration_invitations',
      'project_external_collaboration_invites'
    ])expect(migration).toContain(text);
    for(const destructive of ['delete from public.project_collaboration_needs','delete from public.project_member_collaboration_invitations','delete from public.project_external_collaboration_invites'])expect(migration).not.toContain(destructive);
  });

  test('Review Required Offer expiry reuses the canonical Phase 8 Offer trigger instead of inventing another Offer model',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    for(const text of ['create or replace function public.phase8_create_offer_from_application()','public.project_offers','offer_expiry_hours','make_interval(hours=>expiry_hours)'])expect(migration).toContain(text);
    expect(migration).not.toContain('create table public.project_offers');
  });

  test('duplication is Admin-only, authenticated, idempotent and creates a private draft',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    const route=read('app/api/admin/project-duplication/route.ts');
    for(const text of ['phase21_duplicate_project','ADMIN_REQUIRED','project_duplication_requests','idempotency_key',"'draft','private'",'historical_data_copied'])expect(migration).toContain(text);
    for(const text of ["user.app_metadata?.role!=='admin'","auth.rpc('phase21_duplicate_project'",'p_idempotency_key','idempotency-key'])expect(route).toContain(text);
    expect(route).not.toContain('serviceDb()');
  });

  test('duplication only copies reusable project definition relations',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    for(const allowed of [
      'insert into public.project_problem_briefs',
      'insert into public.project_roles',
      'insert into public.project_capabilities',
      'insert into public.project_domains',
      'insert into public.project_tools',
      'insert into public.project_deliverables',
      'insert into public.project_success_criteria',
      'insert into public.project_milestones',
      'insert into public.project_data_sources'
    ])expect(migration).toContain(allowed);
    expect(migration).toContain('project_run_id is null');
    expect(migration).toContain("governance_status='green'");
    expect(migration).toContain("sensitivity='public'");
  });

  test('duplication never inserts historical applications Offers membership runs Chat invitations contributions Proof completion or source activity',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    const functionStart=migration.indexOf('create or replace function public.phase21_duplicate_project');
    expect(functionStart).toBeGreaterThan(0);
    const duplication=migration.slice(functionStart);
    for(const forbidden of [
      'insert into public.project_applications',
      'insert into public.project_offers',
      'insert into public.project_members',
      'insert into public.project_runs',
      'insert into public.project_messages',
      'insert into public.project_collaboration_invitations',
      'insert into public.project_external_collaboration_invites',
      'insert into public.project_collaboration_interests',
      'insert into public.contributions',
      'insert into public.project_completion_requests',
      'insert into public.project_run_completion_submissions'
    ])expect(duplication).not.toContain(forbidden);
    expect(duplication).not.toContain('insert into public.project_activity_log select');
  });

  test('copied resources are deliberately downgraded for revalidation and cannot carry private storage forward',()=>{
    const migration=read('supabase/migrations/20260908203000_project_experience_phase_21_scale_foundation.sql');
    const functionStart=migration.indexOf('create or replace function public.phase21_duplicate_project');
    const duplication=migration.slice(functionStart);
    for(const text of ["'needs_access'","'unreviewed'","'not_permitted'","'unknown','unknown','unreviewed'"])expect(duplication).toContain(text);
    expect(duplication).not.toContain('internal_storage_url');
  });

  test('Phase 21 acceptance authority remains explicit and not falsely approved',()=>{
    const matrix=read('docs/PHASE_21_ACCEPTANCE_MATRIX.md');
    const readiness=read('docs/PHASE_21_READINESS.md');
    for(const text of ['264 user stories','148 mandatory E2E journeys','131 Director sign-off areas','21 final non-negotiable rules'])expect(matrix).toContain(text);
    expect(matrix).toContain('PHASE 21: NOT APPROVED');
    expect(readiness).toContain('PHASE 21: NOT APPROVED');
  });
});