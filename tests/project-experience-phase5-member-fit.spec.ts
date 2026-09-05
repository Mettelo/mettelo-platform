import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {evaluateMemberProjectFit} from '../lib/member-project-fit';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience Phase 5 member fit and readiness',()=>{
 test('fit evaluator is transparent and does not create a hidden acceptance score',()=>{
  const fit=evaluateMemberProjectFit({
   profile:{skills:['SQL','Power BI'],preferredRoles:['Data Analyst'],experienceLevel:'Intermediate',weeklyCapacity:'5-7 hours/week'},
   preferredDomains:[{slug:'retail-ecommerce',name:'Retail & E-commerce'}],preferredTools:[{slug:'power-bi',name:'Power BI'}],
   project:{difficultyLevel:'Intermediate',weeklyCommitment:'3-5 hours/week',domains:[{slug:'retail-ecommerce',name:'Retail & E-commerce'}],tools:[{slug:'power-bi',name:'Power BI'},{slug:'python',name:'Python'}]},
   roles:[{id:'r1',title:'Data Analyst',canonicalRoleKey:'data-analyst',skills:['SQL','Python'],recommendedSkills:['Power BI']}]
  });
  expect(fit.matchedCount).toBeGreaterThanOrEqual(3);
  expect(fit.gapCount).toBe(0);
  expect(fit.roleFits.r1.preferredRoleMatch).toBeTruthy();
  expect(fit.roleFits.r1.matchedSkills).toContain('SQL');
  expect(fit.roleFits.r1.matchedSkills).toContain('Power BI');
 });

 test('capacity shortfall is explicit while softer experience mismatch remains review guidance',()=>{
  const fit=evaluateMemberProjectFit({profile:{skills:[],preferredRoles:[],experienceLevel:'Beginner',weeklyCapacity:'Up to 3 hours/week'},preferredDomains:[],preferredTools:[],project:{difficultyLevel:'Advanced',weeklyCommitment:'7-10 hours/week',domains:[],tools:[]},roles:[]});
  expect(fit.signals.find(item=>item.key==='commitment')?.status).toBe('gap');
  expect(fit.signals.find(item=>item.key==='experience')?.status).toBe('review');
 });

 test('member detail owns fit and role decision but not the Phase 6 submission form',()=>{
  const page=read('app/member/discover/[id]/page.tsx');
  const hero=read('components/project-experience/MemberProjectDetailV2.tsx');
  const body=read('components/project-experience/MemberProjectDetailBodyV3.tsx');
  const apply=read('app/member/discover/[id]/apply/page.tsx');
  expect(page).toContain('evaluateMemberProjectFit');
  expect(page).toContain("profile_domain_preferences').select('domains(slug,name)'");
  expect(page).toContain("profile_tool_preferences').select('tools(slug,name)'");
  expect(hero).toContain("label:'Review your fit',href:'#fit'");
  expect(hero).not.toContain("label:'Apply now'");
  expect(body).toContain('Your fit &amp; readiness');
  expect(body).toContain('These signals support your decision; they are not an acceptance decision or guarantee.');
  expect(body).toContain('Continue to submit interest');
  expect(body).toContain('/apply?role=${encodeURIComponent(selectedRole.id)}');
  expect(body).not.toContain('MemberProjectApplicationFlow');
  expect(apply).toContain("if(!requestedRole||!availableRoles.some(role=>role.id===requestedRole))redirect(`/member/discover/${id}#roles`)");
  expect(apply).toContain('const initialRoleId=requestedRole');
 });

 test('Phase 5 keeps profile completion and role capacity as separate readiness gates',()=>{
  const page=read('app/member/discover/[id]/page.tsx');
  const journey=read('lib/member-project-journey.ts');
  expect(page).toContain('calculateMemberReadiness');
  expect(page).toContain('loadProjectRoleUsage');
  expect(page).toContain('roleAvailabilityKnown:availabilityKnown');
  expect(journey).toContain("if(!input.applicationReady)return 'ineligible'");
  expect(journey).toContain("if(input.roleAvailabilityKnown===false||!input.hasAvailableRole)return 'ineligible'");
  expect(journey).toContain("label:'Review fit',href:`/member/discover/${projectId}#fit`");
 });
});
