import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 7 contract',()=>{
 test('AUTO keeps a six-hour default oversight window without rewriting explicit project overrides',()=>{
  const admission=read('lib/project-admission.ts');
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  const adminPolicy=read('components/AdminProjectAdmissionPolicy.tsx');
  expect(admission).toContain('DEFAULT_AUTO_START_DELAY_MINUTES=360');
  expect(migration).toContain('alter column auto_start_delay_minutes set default 360');
  expect(migration).not.toMatch(/update\s+public\.projects\s+set\s+auto_start_delay_minutes\s*=\s*360/i);
  expect(migration).toContain('Explicit per-project configuration remains authoritative');
  expect(adminPolicy).toContain('six-hour oversight window');
  expect(adminPolicy).toContain('item.auto_start_delay_minutes??360');
 });

 test('REVIEW_REQUIRED selection cannot auto-enrol or start a run',()=>{
  const route=read('app/api/admin/applications/route.ts');
  expect(route).toContain("submitted:new Set(['in_review','declined'])");
  expect(route).toContain("in_review:new Set(['shortlisted','declined'])");
  expect(route).toContain("shortlisted:new Set(['offered','declined'])");
  expect(route).toContain("project.admission_mode==='auto'");
  expect(route).toContain('creates_membership:false');
  expect(route).toContain("requires_member_acceptance:status==='offered'");
  expect(route).not.toContain(".from('project_members').insert");
  expect(route).not.toContain(".from('project_runs').insert");
  expect(route).not.toContain("startProjectRun(");
 });

 test('review transitions use the authenticated Admin client so canonical audit captures actor',()=>{
  const route=read('app/api/admin/applications/route.ts');
  const audit=read('supabase/migrations/20260816001500_phase2_project_application_events.sql');
  expect(route).toContain("const {auth,db,user}=connection");
  expect(route).toContain("await auth\n      .from('project_applications')");
  expect(route).not.toContain(".from('project_application_events').insert");
  expect(route).toContain("actor_type:'user'");
  expect(audit).toContain('after insert or update of status on public.project_applications');
  expect(audit).toContain('auth.uid()');
 });

 test('Admin review UI uses offer language and complete review context',()=>{
  const queue=read('components/AdminApplicationQueue.tsx');
  const page=read('app/admin/project-operations/applications/page.tsx');
  expect(queue).toContain("return'Offer project place'");
  expect(queue).not.toContain('Approve selected → team');
  expect(queue).toContain('Verified Proof');
  expect(queue).toContain('Participation preference');
  expect(queue).toContain('Current capacity');
  expect(queue).toContain('does not create project membership');
  expect(page).toContain('username');
  expect(page).toContain("verification_status','verified'");
  expect(page).toContain('min_team_size,target_team_size,max_team_size');
  expect(page).toContain("item.admissionMode!=='auto'");
 });

 test('offered is a canonical non-membership review status',()=>{
  const migration=read('supabase/migrations/20260905178000_project_experience_phase_7_review_offer_boundary.sql');
  expect(migration).toContain("'offered'");
  expect(migration).toContain('offered is a selection boundary only and does not create membership');
 });
});