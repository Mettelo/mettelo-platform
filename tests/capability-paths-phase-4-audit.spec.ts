import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const foundation=fs.readFileSync('supabase/migrations/20260831143000_capability_paths_foundation.sql','utf8');
const migration=fs.readFileSync('supabase/migrations/20260831183000_capability_paths_member_experience.sql','utf8');
const helper=fs.readFileSync('lib/member-capability-paths.ts','utf8');
const availability=fs.readFileSync('lib/project-public-availability.ts','utf8');
const api=fs.readFileSync('app/api/member/capability-paths/route.ts','utf8');
const discover=fs.readFileSync('app/member/discover/page.tsx','utf8');
const panel=fs.readFileSync('components/MemberCapabilityPathsPanel.tsx','utf8');
const filters=fs.readFileSync('components/MemberCapabilityPathFilters.tsx','utf8');
const recommended=fs.readFileSync('app/member/recommended/layout.tsx','utf8');
const portfolioStrip=fs.readFileSync('components/MemberProjectsCapabilityPathStrip.tsx','utf8');
const projectsLayout=fs.readFileSync('app/member/projects/layout.tsx','utf8');
const labContext=fs.readFileSync('components/MetteloLabCapabilityPathContext.tsx','utf8');
const labSurface=fs.readFileSync('components/MetteloLabViewSurface.tsx','utf8');
const memberE2E=fs.readFileSync('tests/capability-paths-phase-4-member.spec.ts','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 4 member contract',()=>{
 test('progress is derived from canonical project completion and Proof records',()=>{
  hasAll(helper,[".eq('membership_status','completed')",".eq('verification_status','verified')",'completed.has(row.project_id)','verified.has(row.project_id)']);
  expect(helper).not.toContain('progress_percentage');expect(helper).not.toContain('localStorage');
  hasAll(panel,['completedProjects','verifiedProjects','Progress comes from completed project work','Verified Proof remains a separate evidence signal']);
 });
 test('one completed canonical project is recognised across every followed Path placement',()=>{
  hasAll(helper,['const completed=new Set','return follows.flatMap','pathPlacements=placements.filter','completed:completed.has(row.project_id)','verified:verified.has(row.project_id)']);
  expect(helper).toContain('projectId:row.project_id');
 });
 test('members can follow multiple published Paths while primary selection is atomic and unfollow is governed',()=>{
  hasAll(api,["action==='follow'","action==='set_primary'","action==='pause'","action==='resume'","action==='unfollow'",'set_my_primary_capability_path']);
  hasAll(panel,['Unfollow Path','Stop following ${name}? Your project work and Verified Proof will remain unchanged.','Path paused','Resume Path']);
  hasAll(migration,['set_my_primary_capability_path',"cp.status='published'"]);
  expect(foundation).toContain('member_capability_paths_one_primary_idx');
  expect(api).not.toContain('completed_at:');
 });
 test('archived followed Paths retain historical read context without leaking members-only work publicly',()=>{
  hasAll(migration,['published or followed capability paths are readable','published or followed capability path stages are readable','published or followed visible capability path placements are readable',"p.visibility='members' and (select auth.uid()) is not null"]);
  hasAll(api,[".eq('status','published')",'Archived or draft Paths cannot be resumed.']);
  expect(panel).toContain('Historical Path');
 });
 test('Discover stays broad while Path and stage filters are additive',()=>{
  hasAll(discover,['MemberCapabilityPathsPanel','MemberCapabilityPathFilters','selectedPath','selectedStage','MemberDiscoverCatalogue','resolveProjectPublicAvailability','occupied_role_count:occupiedRoleCount','capacity_known:availabilityKnown']);
  hasAll(filters,['All followed Paths','All stages','Clear Path filters']);
  expect(discover).toContain('if(selectedPath&&!contexts.some');
 });
 test('member recommendations use the same capacity-aware availability truth as public Projects',()=>{
  hasAll(availability,['occupied_role_count','capacity_known','roles_filled','The currently advertised project roles are filled']);
  hasAll(helper,['serviceDb','filledByRole','occupiedRoleCount','capacity_known:capacityKnown',"follow.status==='following'?incomplete.find"]);
  expect(panel).toContain('actionable&&!archived&&!paused');
 });
 test('recommendations, portfolio and Lab show compact explainable Path context',()=>{
  hasAll(recommended,['PRIMARY CAPABILITY PATH','next.available','nearest currently available project','Verified Proof remains a separate evidence count']);
  hasAll(portfolioStrip,['PRIMARY CAPABILITY PATH','projects completed','with Verified Proof','Next: Project',"pathname!=='/member/projects'"]);
  expect(projectsLayout).toContain('MemberProjectsCapabilityPathStrip');
  hasAll(labContext,['WHY THIS PROJECT MATTERS','capabilityBuilt','competencyFocus','Verified Proof exists']);
  expect(labSurface).toContain('MetteloLabCapabilityPathContext');
 });
 test('authenticated acceptance uses governed completion and full responsive matrix',()=>{
  hasAll(memberE2E,["post('/api/project-completion'", "decision:'approved'", "getByText('WHY THIS PROJECT MATTERS'",'320,375,390,414,768,1024,1440',"'/member/projects'",'200% text']);
  expect(memberE2E).not.toContain("service.from('project_members').update({membership_status:'completed'}");
 });
});
