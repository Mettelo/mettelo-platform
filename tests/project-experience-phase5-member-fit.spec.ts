import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {compareWeeklyCapacity,evaluateMemberProjectFit} from '../lib/member-project-fit';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience Phase 5 member decision and qualification',()=>{
 test('fit guidance is transparent and advisory rather than a hidden eligibility score',()=>{
  const fit=evaluateMemberProjectFit({profile:{skills:['SQL','Power BI'],preferredRoles:['Data Analyst / BI'],experienceLevel:'Intermediate',weeklyCapacity:'5-7 hours/week'},preferredDomains:[{slug:'retail-ecommerce',name:'Retail & E-commerce'}],preferredTools:[{slug:'power-bi',name:'Power BI'}],project:{difficultyLevel:'Intermediate',weeklyCommitment:'3-5 hours/week',domains:[{slug:'retail-ecommerce',name:'Retail & E-commerce'}],tools:[{slug:'power-bi',name:'Power BI'},{slug:'python',name:'Python'}]},roles:[{id:'r1',title:'Data Analyst',canonicalRoleKey:'data-analyst',skills:['SQL','Python'],recommendedSkills:['Power BI']}]});
  expect(fit.matchedCount).toBeGreaterThanOrEqual(3);expect(fit.gapCount).toBe(0);expect(fit.roleFits.r1.preferredRoleMatch).toBeTruthy();expect(fit.roleFits.r1.matchedSkills).toContain('SQL');expect(fit.roleFits.r1.matchedSkills).toContain('Power BI');
 });

 test('weekly capacity can inform fit but does not invent hard Phase 5 eligibility',()=>{
  expect(compareWeeklyCapacity('4-6 hours/week','5-8 hours/week')).toBe('match');
  expect(compareWeeklyCapacity('Up to 3 hours/week','5-8 hours/week')).toBe('review');
  expect(compareWeeklyCapacity('Flexible','5-8 hours/week')).toBe('review');
  const fit=evaluateMemberProjectFit({profile:{skills:[],preferredRoles:[],experienceLevel:'Beginner',weeklyCapacity:'Up to 3 hours/week'},preferredDomains:[],preferredTools:[],project:{difficultyLevel:'Advanced',weeklyCommitment:'7-10 hours/week',domains:[],tools:[]},roles:[]});
  expect(fit.signals.find(item=>item.key==='commitment')?.status).toBe('review');expect(fit.gapCount).toBe(0);
 });

 test('one dominant member conversion CTA is Submit Interest with no mandatory role selection',()=>{
  const journey=read('lib/member-project-journey.ts');const hero=read('components/project-experience/MemberProjectDetailV2.tsx');const body=read('components/project-experience/MemberProjectDetailBodyV3.tsx');const apply=read('app/member/discover/[id]/apply/page.tsx');const flow=read('components/MemberProjectApplicationFlow.tsx');
  expect(journey).toContain("label:'Submit Interest',href:`/member/discover/${projectId}/apply`");expect(hero).toContain("label:'Submit Interest'");expect(body).toContain('Possible contribution areas');expect(body).toContain('You are not choosing or applying for a formal role at this stage.');expect(body).not.toContain('Review and choose this role');expect(body).not.toContain('selectedRoleId');expect(body).not.toContain('/apply?role=');expect(apply).not.toContain('requestedRole');expect(apply).not.toContain('initialRoleId');expect(flow).toContain("application_kind:'interest'");expect(flow).not.toContain('project_role_id:selected');expect(flow).not.toContain('Choose the project role');
 });

 test('qualification uses canonical project capacity, profile readiness and current persisted member state',()=>{
  const page=read('app/member/discover/[id]/page.tsx');const journey=read('lib/member-project-journey.ts');const api=read('app/api/project-applications/route.ts');
  expect(page).toContain('loadMemberProjectTeamState');expect(page).toContain('capacityAvailable:teamState.capacityAvailable');expect(page).toContain('capacityKnown:teamState.known');expect(page).toContain("project_applications').select('id,status,application_kind,project_run_id')");expect(journey).toContain("if(!input.applicationReady)return 'ineligible'");expect(journey).toContain("if(!capacityAvailable)return 'full'");expect(api).toContain('calculateMemberReadiness');expect(api).toContain("'PROFILE_INCOMPLETE'");expect(api).toContain("'CAPACITY_FULL'");expect(api).toContain("'ALREADY_PARTICIPATING'");expect(api).toContain("'DEADLINE_PASSED'");expect(api).toContain('loadMemberProjectTeamState');
 });

 test('team state distinguishes confirmed, reserved, minimum, target and maximum',()=>{
  const helper=read('lib/member-project-team-state.ts');const hero=read('components/project-experience/MemberProjectDetailV2.tsx');const body=read('components/project-experience/MemberProjectDetailBodyV3.tsx');
  for(const marker of ['confirmedMembers','reservedMembers','minTeamSize','targetTeamSize','maxTeamSize','capacityAvailable'])expect(helper).toContain(marker);
  expect(hero).toContain('<dt>Minimum to start</dt>');expect(hero).toContain('<dt>Target team</dt>');expect(hero).toContain('<dt>Maximum team</dt>');expect(body).toContain('Reserved or offered places are included in current capacity');
 });

 test('Phase 6 handoff does not create an interest record until the form submits',()=>{
  const apply=read('app/member/discover/[id]/apply/page.tsx');const flow=read('components/MemberProjectApplicationFlow.tsx');
  expect(apply).not.toContain("from('project_applications').insert");expect(flow).toContain("fetch('/api/project-applications'");expect(flow).toContain("'Submit Interest'");
 });
});
