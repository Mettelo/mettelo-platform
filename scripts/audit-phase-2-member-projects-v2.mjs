import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Preserve the full established Phase 2 audit while updating only contracts that
// later approved phases deliberately centralised or strengthened. The transformed
// audit must still prove every member capability remains reachable, while rejecting
// the retired headcount-only Open Project auto-start rule.
const sourcePath='scripts/audit-phase-2-member-projects.mjs';
const source=fs.readFileSync(sourcePath,'utf8');
const legacyAvailability="['app/projects/page.tsx',['roleCount','deadlinePassed','Roles are still being prepared','View project →']],";
const governedAvailability="['app/projects/page.tsx',['roleCount','resolveProjectPublicAvailability','View project →']],\n  ['lib/project-public-availability.ts',['deadlinePassed','Roles are still being prepared','capacity_known','occupied_role_count','roles_filled']],";
if(!source.includes(legacyAvailability))throw new Error('Phase 2 availability audit contract changed unexpectedly; review before updating this compatibility audit.');

const legacyNavigation="['lib/member-navigation.ts',[\"label:'My Work'\",\"label:'Home'\",\"label:'Projects'\",\"label:'Applications'\",\"label:'Proof'\",\"label:'Profile'\",\"label:'Explore'\",\"label:'Discover'\",\"label:'Recommended'\",\"label:'Opportunities'\",\"label:'Saved'\",\"label:'Events'\",\"label:'Reputation'\",\"label:'Spotlight'\",'mobilePersistentNav','mobileMoreNav',\"href:'/member/discover'\"]],";
const governedNavigation="['lib/member-navigation.ts',[\"label:'My Work'\",\"label:'Home'\",\"label:'Projects'\",\"label:'Applications'\",\"label:'Proof'\",\"label:'Profile'\",\"label:'Direction & Discovery'\",\"label:'Capability Paths'\",\"label:'Discover'\",\"label:'Recommended'\",\"label:'Saved'\",\"label:'Opportunities & Community'\",\"label:'Opportunities'\",\"label:'Events'\",\"label:'Spotlight'\",'mobilePersistentNav','mobileMoreNav',\"href:'/member/discover'\",\"href:'/member/paths'\"]],";
if(!source.includes(legacyNavigation))throw new Error('Phase 2 member navigation audit contract changed unexpectedly; review before updating this compatibility audit.');

const legacyPublicDetail="['app/projects/[id]/page.tsx',['What this project is solving','Know what you are committing to','AVAILABLE ROLES','EXPECTED PROOF','Application deadline','ProjectApplicationForm','Roles pending','roles.length>0']],";
const canonicalPublicDetail="['app/projects/[id]/page.tsx',['ProjectPublicDetailV2','getProjectExperiencePlanning','buildProjectExperienceModel','roles.length>0']],\n  ['components/project-experience/ProjectPublicDetailV2.tsx',['Decide whether this is the right project for you.','Applications close','Continue to apply','Open in My Mettelo','ProjectPublicDetailBodyV3']],\n  ['components/project-experience/ProjectPublicDetailBodyV3.tsx',['01 · Overview','02 · Outputs','03 · Quality','04 · Participation','Project overview','Project deliverables','Success standards','How you can contribute','View detailed project context','View all ','challenge.decisionToSupport','successCriteria','acceptanceChecks','stakeholderHandover','capabilitySignals','roles','Continue to apply']],";
if(!source.includes(legacyPublicDetail))throw new Error('Phase 2 public project detail audit contract changed unexpectedly; review before updating this compatibility audit.');

const legacyMemberApplication="['components/MemberProjectApplicationFlow.tsx',['Role & fit','Availability','Your response','Review','type=\"radio\"','Project Participation Terms','terms_attachment_id','terms_accepted:true','Submit application','/api/project-applications']],";
const inlineMemberApplication="['components/MemberProjectApplicationFlow.tsx',['Role & fit','Availability','How you could contribute','Review','type=\"radio\"','Project Participation Terms','PROJECT_PARTICIPATION_TERMS_SUMMARY','PROJECT_PARTICIPATION_TERMS_FULL','PROJECT_PARTICIPATION_TERMS_VERSION','Read full participation terms','I have read, understood and agree to the Mettelo Project Participation Terms.','terms_accepted:true','terms_version:PROJECT_PARTICIPATION_TERMS_VERSION','Submit application','/api/project-applications']],";
if(!source.includes(legacyMemberApplication))throw new Error('Phase 2 member application terms audit contract changed unexpectedly; review before updating this compatibility audit.');

const legacyAdminAutoStart="['app/api/admin/applications/route.ts',[\"project.project_type==='open'\",\"order('run_number',{ascending:true})\",'cohort_auto_started',\"project.project_type==='partner'\",\"full&&project.project_type==='open'\",'required_team_size',\"if(!run&&project.project_type==='open')\",'if(!run){']],";
const readinessAdminAutoStart="['app/api/admin/applications/route.ts',[\"project.project_type==='open'\",\"order('run_number',{ascending:true})\",'cohort_auto_started',\"project.project_type==='partner'\",'assessProjectTeamReadiness',\"if(readiness.ready&&project.project_type==='open'&&!run.has_started)\",'responsibility_coverage_ready:readiness.responsibilityCoverageReady','lab_ready:readiness.labReady','required_team_size',\"if(!run&&project.project_type==='open')\",'if(!run){']],\n  ['lib/project-team-readiness.ts',[\"members.every(member=>Boolean(member.project_role_id))\",\".select('lab_ready')\",\"if(leads.length===0)blockers.push('project_lead')\",\"if(leads.length>1)blockers.push('multiple_project_leads')\",'ready:blockers.length===0']],";
if(!source.includes(legacyAdminAutoStart))throw new Error('Phase 2 Open Project start audit contract changed unexpectedly; review before updating this compatibility audit.');

const legacyStartInvariant="const openShouldStart=(type,current,required,started)=>type==='open'&&!started&&current>=required;\nif(!openShouldStart('open',3,3,false)||openShouldStart('partner',3,3,false)||openShouldStart('open',2,3,false)){console.error('Project team auto-start invariant failed.');failed=true;}";
const readinessStartInvariant="const openShouldStart=(type,{current,required,started,responsibilities,leadCount,labReady})=>type==='open'&&!started&&current>=required&&responsibilities&&leadCount===1&&labReady;\nif(!openShouldStart('open',{current:3,required:3,started:false,responsibilities:true,leadCount:1,labReady:true})||openShouldStart('partner',{current:3,required:3,started:false,responsibilities:true,leadCount:1,labReady:true})||openShouldStart('open',{current:3,required:3,started:false,responsibilities:false,leadCount:1,labReady:true})||openShouldStart('open',{current:3,required:3,started:false,responsibilities:true,leadCount:0,labReady:true})||openShouldStart('open',{current:3,required:3,started:false,responsibilities:true,leadCount:1,labReady:false})||openShouldStart('open',{current:2,required:3,started:false,responsibilities:true,leadCount:1,labReady:true})){console.error('Project team readiness-gated auto-start invariant failed.');failed=true;}";
if(!source.includes(legacyStartInvariant))throw new Error('Phase 2 headcount-only auto-start simulation changed unexpectedly; review before updating this compatibility audit.');

const transformed=source
  .replace(legacyAvailability,governedAvailability)
  .replace(legacyNavigation,governedNavigation)
  .replace(legacyPublicDetail,canonicalPublicDetail)
  .replace(legacyMemberApplication,inlineMemberApplication)
  .replace(legacyAdminAutoStart,readinessAdminAutoStart)
  .replace(legacyStartInvariant,readinessStartInvariant);
const tempPath=path.resolve(`.tmp-phase2-member-projects-${process.pid}.mjs`);
try{
  fs.writeFileSync(tempPath,transformed,'utf8');
  await import(`${pathToFileURL(tempPath).href}?v=${Date.now()}`);
}finally{
  fs.rmSync(tempPath,{force:true});
}
