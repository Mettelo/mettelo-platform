import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260831183000_capability_paths_member_experience.sql','utf8');
const helper=fs.readFileSync('lib/member-capability-paths.ts','utf8');
const api=fs.readFileSync('app/api/member/capability-paths/route.ts','utf8');
const discover=fs.readFileSync('app/member/discover/page.tsx','utf8');
const panel=fs.readFileSync('components/MemberCapabilityPathsPanel.tsx','utf8');
const filters=fs.readFileSync('components/MemberCapabilityPathFilters.tsx','utf8');
const recommended=fs.readFileSync('app/member/recommended/layout.tsx','utf8');
const projectsLayout=fs.readFileSync('app/member/projects/layout.tsx','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 4 member contract',()=>{
 test('progress is derived from canonical project completion and Proof records',()=>{
  hasAll(helper,[".eq('membership_status','completed')",".eq('verification_status','verified')",'completed.has(row.project_id)','verified.has(row.project_id)']);
  expect(helper).not.toContain('progress_percentage');expect(helper).not.toContain('localStorage');
  hasAll(panel,['completedProjects','verifiedProjects','Progress comes from completed project work','Verified Proof remains a separate evidence signal']);
 });
 test('one completed canonical project is recognised across every followed Path placement',()=>{
  hasAll(helper,['const completed=new Set','for(const path of progress)','placement.projectId','projectId:path.id']);
  expect(helper).toContain('completed:completed.has(row.project_id)');
  expect(helper).toContain('verified:verified.has(row.project_id)');
 });
 test('members can follow multiple published Paths while primary selection is atomic',()=>{
  hasAll(api,["action==='follow'","action==='set_primary'","action==='pause'","action==='resume'","action==='unfollow'",'set_my_primary_capability_path']);
  hasAll(migration,['set_my_primary_capability_path','status=\'published\'','member_capability_paths_one_primary_idx']);
  expect(api).not.toContain('completed_at:');
 });
 test('archived followed Paths retain historical read context but cannot be resumed as active direction',()=>{
  hasAll(migration,['published or followed capability paths are readable','published or followed capability path stages are readable','published or followed visible capability path placements are readable']);
  hasAll(api,[".eq('status','published')","Archived or draft Paths cannot be resumed."]);
  expect(panel).toContain('Historical Path');
 });
 test('Discover stays broad while Path and stage filters are additive',()=>{
  hasAll(discover,['MemberCapabilityPathsPanel','MemberCapabilityPathFilters','selectedPath','selectedStage','MemberDiscoverCatalogue']);
  hasAll(filters,['All followed Paths','All stages','Clear Path filters']);
  expect(discover).toContain("if(selectedPath&&!contexts.some");
 });
 test('recommendations and portfolio surfaces show compact explainable Path context',()=>{
  hasAll(recommended,['PRIMARY CAPABILITY PATH','next.available','nearest currently available project','Verified Proof remains a separate evidence count']);
  hasAll(projectsLayout,['PRIMARY CAPABILITY PATH','projects completed','with Verified Proof','Next: Project']);
 });
});
