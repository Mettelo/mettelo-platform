import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const foundation=fs.readFileSync('supabase/migrations/20260831143000_capability_paths_foundation.sql','utf8');
const migration=fs.readFileSync('supabase/migrations/20260831183000_capability_paths_member_experience.sql','utf8');
const helper=fs.readFileSync('lib/member-capability-paths.ts','utf8');
const availability=fs.readFileSync('lib/project-public-availability.ts','utf8');
const api=fs.readFileSync('app/api/member/capability-paths/route.ts','utf8');
const discover=fs.readFileSync('app/member/discover/page.tsx','utf8');
const catalogue=fs.readFileSync('components/MemberDiscoverCatalogue.tsx','utf8');
const pathsPage=fs.readFileSync('app/member/paths/page.tsx','utf8');
const panel=fs.readFileSync('components/MemberCapabilityPathsPanel.tsx','utf8');
const filters=fs.readFileSync('components/MemberCapabilityPathFilters.tsx','utf8');
const recommended=fs.readFileSync('app/member/recommended/layout.tsx','utf8');
const portfolioStrip=fs.readFileSync('components/MemberProjectsCapabilityPathStrip.tsx','utf8');
const projectsLayout=fs.readFileSync('app/member/projects/layout.tsx','utf8');
const projectsPage=fs.readFileSync('app/member/projects/page.tsx','utf8');
const labContext=fs.readFileSync('components/MetteloLabCapabilityPathContext.tsx','utf8');
const labSurface=fs.readFileSync('components/MetteloLabViewSurface.tsx','utf8');
const nav=fs.readFileSync('lib/member-navigation.ts','utf8');
const memberE2E=fs.readFileSync('tests/capability-paths-phase-4-member.spec.ts','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 4 member contract',()=>{
 test('progress is derived from canonical project completion and Proof records',()=>{
  hasAll(helper,[".eq('membership_status','completed')",".eq('verification_status','verified')",'completed.has(row.project_id)','verified.has(row.project_id)']);
  expect(helper).not.toContain('progress_percentage');expect(helper).not.toContain('localStorage');
  hasAll(panel,['completedProjects','verifiedProjects','project work','Verified Proof']);
 });
 test('one completed canonical project is recognised across every followed Path placement',()=>{
  hasAll(helper,['const completed=new Set','return follows.flatMap','pathPlacements=placements.filter','completed:completed.has(row.project_id)','verified:verified.has(row.project_id)']);
  expect(helper).toContain('projectId:row.project_id');
 });
 test('members can follow multiple published Paths while primary selection is atomic and unfollow is governed',()=>{
  hasAll(api,["action==='follow'","action==='set_primary'","action==='pause'","action==='resume'","action==='unfollow'",'set_my_primary_capability_path']);
  hasAll(panel,['Unfollow Path','Stop following ${name}? Your project work and Verified Proof will remain unchanged.','Path paused','Resume Path','Make primary']);
  hasAll(migration,['set_my_primary_capability_path',"cp.status='published'"]);
  expect(foundation).toContain('member_capability_paths_one_primary_idx');expect(api).not.toContain('completed_at:');
 });
 test('member IA gives Paths a dedicated destination without crowding persistent mobile navigation',()=>{
  hasAll(nav,["label:'Direction & Discovery'","label:'Capability Paths',href:'/member/paths'","label:'Opportunities & Community'"]);
  const persistent=nav.slice(nav.indexOf('mobilePersistentNav'),nav.indexOf('mobileMoreNav'));expect(persistent).not.toContain("label:'Capability Paths'");
  hasAll(pathsPage,['Build with direction','Team projects stay team projects','Multiple directions','One project, many contexts','Proof stays evidence-led']);
 });
 test('archived followed Paths retain historical read context without leaking members-only work publicly',()=>{
  hasAll(migration,['published or followed capability paths are readable','published or followed capability path stages are readable','published or followed visible capability path placements are readable',"p.visibility='members' and (select auth.uid()) is not null"]);
  hasAll(api,[".eq('status','published')",'Archived or draft Paths cannot be resumed.']);expect(panel).toContain('Historical Path');
 });
 test('Discover stays broad while Path and stage filters are additive structured context',()=>{
  expect(discover).not.toContain('MemberCapabilityPathsPanel');
  hasAll(discover,['MemberCapabilityPathFilters','selectedPath','selectedStage','MemberDiscoverCatalogue','resolveProjectPublicAvailability','occupied_role_count:occupiedRoleCount','capacity_known:availabilityKnown','summary:project.summary','pathContext:primaryContext']);
  hasAll(filters,['All followed Paths','All stages','Clear Path filters']);hasAll(catalogue,['mdPathContext','Capability Path context','Discover is broad. Recommended is personalised.']);
  expect(discover).toContain('if(selectedPath&&!contexts.some');expect(discover).not.toContain('pathSummary?');
 });
 test('member recommendations use the same capacity-aware availability truth and paused Paths stop guiding actions',()=>{
  hasAll(availability,['occupied_role_count','capacity_known','roles_filled','The currently advertised project roles are filled']);
  hasAll(helper,['serviceDb','filledByRole','occupiedRoleCount','capacity_known:capacityKnown',"follow.status==='following'?incomplete.find"]);
  hasAll(recommended,['RECOMMENDED FOR YOUR DIRECTION','NEXT IN PRIMARY PATH','nearest currently available project',"followStatus==='paused'",'Manage Paths']);
  expect(panel).toContain('actionable&&!archived&&!paused');
 });
 test('portfolio and Lab show compact Path context while team formation remains canonical',()=>{
  hasAll(portfolioStrip,['PRIMARY DIRECTION','projects completed','with Verified Proof','View Path',"pathname!=='/member/projects'"]);
  expect(projectsLayout).toContain('MemberProjectsCapabilityPathStrip');
  hasAll(projectsPage,['PREPARING TO START','Team forming','team_size_threshold','places filled','Mettelo Lab will only open when the project is ready']);
  hasAll(labContext,['WHY THIS PROJECT MATTERS','capabilityBuilt','competencyFocus','Verified Proof exists']);expect(labSurface).toContain('MetteloLabCapabilityPathContext');
 });
 test('new Path surfaces include accessible state, focus, touch and reduced-motion treatment',()=>{
  hasAll(panel,['role="progressbar"','aria-valuemin','aria-valuemax','aria-valuenow','min-height:44px','focus-visible','prefers-reduced-motion']);
  hasAll(catalogue,['aria-label={`Capability Path context','min-height:44px','focus-visible','prefers-reduced-motion']);
  hasAll(memberE2E,['320,375,390,414,768,1024,1440',"'/member/paths'", "'/member/profile'",'200% text']);
 });
 test('authenticated acceptance uses governed completion rather than direct membership completion',()=>{
  hasAll(memberE2E,["post('/api/project-completion'", "decision:'approved'", "getByText('WHY THIS PROJECT MATTERS'", "'/member/paths'", "'/member/projects'"]);
  expect(memberE2E).not.toContain("service.from('project_members').update({membership_status:'completed'}");
 });
});
