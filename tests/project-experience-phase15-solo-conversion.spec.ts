import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Project Experience Phase 15 solo delivery contract',()=>{
 test('Lab shows independent delivery from the canonical active run',()=>{
  const lab=read('components/MetteloLabPanel.tsx');
  const section=read('components/project-experience/ProjectSoloDeliverySection.tsx');
  const controls=read('components/project-experience/ProjectSoloDeliveryControls.tsx');
  expect(lab).toContain('ProjectSoloDeliverySection');
  expect(lab).toContain('activeMemberCount={visibleMembers.length}');
  expect(section).toContain("runStatus!=='active'||activeMemberCount!==1");
  expect(section).toContain("['solo','flexible'].includes(project.participation_mode)");
  expect(controls).toContain('WORKING INDEPENDENTLY');
  expect(controls).toContain('Current project state');
  expect(controls).toContain('Target team');
  expect(controls).toContain('Joining availability');
 });

 test('opening collaboration reuses Phase 9 capacity and the same run recruitment flag',()=>{
  const route=read('app/api/project-joining-availability/route.ts');
  expect(route).toContain("db.rpc('phase9_project_run_capacity'");
  expect(route).toContain(".eq('project_run_id',runId)");
  expect(route).toContain("project.participation_mode!=='flexible'");
  expect(route).toContain("(activeCount||0)!==1");
  expect(route).toContain("db.from('project_runs').update({recruitment_open:recruitmentOpen");
  expect(route).toContain(".eq('id',runId).eq('project_id',projectId)");
  expect(route).not.toContain("from('project_runs').insert");
  expect(route).not.toContain("from('project_members').insert");
  expect(route).not.toContain('project_invitations');
 });

 test('joining controls do not bypass late-joining or maximum-capacity policy',()=>{
  const route=read('app/api/project-joining-availability/route.ts');
  const phase9=read('supabase/migrations/20260906002000_project_experience_phase_9_participation_hardening.sql');
  expect(route).toContain("project.late_joining_enabled===false");
  expect(route).toContain("Date.now()>=cutoff");
  expect(route).toContain("capacity.capacity_available!==true");
  expect(phase9).toContain("'available',greatest(maximum_members-used_capacity,0)");
  expect(phase9).toContain("'late_join_allowed',late_join_allowed");
  expect(phase9).toContain('phase9_lock_project_capacity');
 });

 test('strict Team cannot surface independent-delivery controls and strict Solo cannot open collaboration',()=>{
  const section=read('components/project-experience/ProjectSoloDeliverySection.tsx');
  const controls=read('components/project-experience/ProjectSoloDeliveryControls.tsx');
  const route=read('app/api/project-joining-availability/route.ts');
  expect(section).toContain("if(!['solo','flexible'].includes(project.participation_mode))return null");
  expect(controls).toContain("const flexible=props.participationMode==='flexible'");
  expect(controls).toContain('Independent delivery only');
  expect(route).toContain('Only Flexible projects can open a collaboration place after starting independently.');
 });

 test('same-run history remains canonical when a collaboration place is opened',()=>{
  const controls=read('components/project-experience/ProjectSoloDeliveryControls.tsx');
  const route=read('app/api/project-joining-availability/route.ts');
  const phase9Model=read('tests/project-experience-phase9-participation-model.spec.ts');
  expect(controls).toContain('this same project run');
  expect(controls).toContain('does not restart or replace your work');
  expect(route).not.toContain('delete(');
  expect(route).not.toContain("from('project_tasks')");
  expect(route).not.toContain("from('project_milestones')");
  expect(route).not.toContain("from('project_discussions')");
  expect(route).not.toContain("from('project_resources')");
  expect(phase9Model).toContain('late joining reuses Phase 6 policy and canonical project_members path');
 });

 test('solo delivery never auto-awards Collaboration or Peer Leadership proof',()=>{
  const controls=read('components/project-experience/ProjectSoloDeliveryControls.tsx');
  const route=read('app/api/project-joining-availability/route.ts');
  const contributions=read('app/api/contributions/route.ts');
  expect(controls).toContain('Collaboration or peer-leadership evidence requires actual collaborative activity');
  expect(route).not.toContain("from('contributions')");
  expect(route).not.toContain('verification_status');
  expect(contributions).toContain("verification_status:'pending'");
  expect(contributions).toContain('Contribution evidence requires membership in a specific project run.');
  expect(contributions).not.toContain("verification_status:'verified'");
 });

 test('Phase 15 does not create a duplicate invitation or conversion state machine',()=>{
  const route=read('app/api/project-joining-availability/route.ts');
  const controls=read('components/project-experience/ProjectSoloDeliveryControls.tsx');
  expect(route).not.toContain('invitation');
  expect(route).not.toContain('conversion');
  expect(controls).not.toContain('Invite collaborator');
  expect(controls).toContain('Open collaboration place');
 });
});
