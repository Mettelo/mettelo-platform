import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Phase 2 established the member-project surfaces. Later Project Experience
// phases replaced early role-opening capacity and role-first application assumptions.
// This compatibility audit protects the surviving capabilities while asserting
// the current canonical role-neutral interest and hard-cap boundaries.
const checks=[
  ['components/MemberAppShell.tsx',["from '@/lib/member-navigation'",'Find a project','/member/discover','My Mettelo mobile navigation','aria-current']],
  ['lib/member-navigation.ts',["label:'Home'","label:'Projects'","label:'Applications'","label:'Proof'","label:'Profile'","label:'Discover'","label:'Recommended'","label:'Opportunities'","label:'Saved'","label:'Events'","label:'Spotlight'",'mobilePersistentNav','mobileMoreNav']],
  ['app/projects/page.tsx',["rpc('get_public_project_capacities'",'capacity_available','recruitment_state','View project →']],
  ['app/projects/[id]/page.tsx',['ProjectPublicDetailV2','buildProjectExperienceModel',"rpc('get_public_project_capacity'",'const canApply=capacity.capacity_available']],
  ['components/project-experience/ProjectPublicDetailV2.tsx',['Decide whether this is the right project for you.','Interest closes','ProjectPublicDetailBodyV3']],
  ['components/project-experience/MemberProjectDetailV2.tsx',['YOUR DECISION','Submit Interest','Participation','Capacity','Applications','Minimum to start','Target team','Maximum team','Full · interest closed','canonical hard capacity','MemberProjectDetailBodyV3']],
  ['components/MemberProjectInterestFlow.tsx',['Participation','Contribution','Availability','Fit','Review','No formal role is selected at this stage.','Contribution areas','Published commitment','Why do you want to work on this project?','What would you contribute?','project_role_id:null','secondary_project_role_id:null','PROJECT_PARTICIPATION_TERMS_VERSION','Submit Interest',"fetch('/api/project-applications'"]],
  ['app/api/project-applications/route.ts',['canonicalParticipationMode','resolveParticipationPreference',"rpc('submit_project_interest'",'p_participation_preference','participation_preference','ALREADY_PARTICIPATING','PERSISTENCE_NOT_CONFIRMED']],
  ['supabase/migrations/20260912170500_workstream2_canonical_project_contract.sql',['create or replace function public.submit_project_interest','security definer','project_role_id','secondary_project_role_id']],
  ['lib/project-team-readiness.ts',["from('project_member_responsibilities')",'assignment_status','responsibility_coverage',".select('lab_ready')","if(leads.length===0)blockers.push('project_lead')","if(leads.length>1)blockers.push('multiple_project_leads')",'ready:blockers.length===0']],
  ['lib/project-start-service.ts',["db.rpc('phase9_activate_project_run'",'assessProjectTeamReadiness']],
  ['app/member/applications/page.tsx',['project_application_events','project_run_id','MemberApplicationTracker',"from('project_applications')"]],
  ['components/MemberApplicationTracker.tsx',['Search project requests','Project requests','Team forming','Project confirmed']],
  ['components/ProjectTeamRoster.tsx',['COHORTS','profile photo','is_member']],
  ['app/api/project-team-overview/route.ts',['resolveProjectTeamOverview','Project membership is required.']],
  ['lib/project-team-overview.ts',['ownRunIds','readableRuns','readableRunIds','is_member:isMember','members:isMember?']],
  ['components/MetteloLabPanel.tsx',['resolveProjectTeamOverview','METTELO LAB','YOUR TEAM','teamOverview']],
  ['app/member/projects/[id]/layout.tsx',['METTELO LAB','MetteloLabNavigation','MetteloLabViewSurface']],
];

let failed=false;
for(const [file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`Missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');
  for(const needle of needles){if(!text.includes(needle)){console.error(`${file}: missing ${needle}`);failed=true;}}
}

const publicApplicationForm=fs.readFileSync('components/ProjectApplicationForm.tsx','utf8');
if(publicApplicationForm.includes("fetch('/api/project-applications'")){
  console.error('Public project page must not maintain a second full-application submit form.');failed=true;
}

const interestFlow=fs.readFileSync('components/MemberProjectInterestFlow.tsx','utf8');
for(const forbidden of ['Primary role','Second-choice role','PRIMARY_ROLE_REQUIRED','PRIMARY_ROLE_FULL']){
  if(interestFlow.includes(forbidden)){console.error(`Initial interest must remain role-neutral: ${forbidden}`);failed=true;}
}
if(!interestFlow.includes("const isSolo=participation==='solo'")){
  console.error('Submit Interest must preserve explicit Solo semantics.');failed=true;
}
if(!interestFlow.includes("if(isSolo){setLeadership(false);setCollaborationAvailability('')}")){
  console.error('Solo interest must clear team-only collaboration and leadership inputs.');failed=true;
}
if(!interestFlow.includes('I would be open to a leadership responsibility if selected.')){
  console.error('Leadership willingness must remain optional input rather than automatic Project Lead authority.');failed=true;
}
if(!interestFlow.includes('project_role_id:null')||!interestFlow.includes('secondary_project_role_id:null')){
  console.error('Initial project interest must submit without a formal role allocation.');failed=true;
}

const applicationRoute=fs.readFileSync('app/api/project-applications/route.ts','utf8');
if(!applicationRoute.includes("const isInterest=String(body.application_kind||'application')==='interest'")||!applicationRoute.includes("rpc('submit_project_interest'")){
  console.error('Canonical project interest must route through the atomic Submit Interest boundary.');failed=true;
}
if(applicationRoute.includes("status:'offered'")||applicationRoute.includes("status:'accepted'")){
  console.error('Initial Submit Interest must not fabricate Offer/Acceptance state.');failed=true;
}

const memberDetail=fs.readFileSync('components/project-experience/MemberProjectDetailV2.tsx','utf8');
if(!memberDetail.includes("project.participationMode==='solo'")){
  console.error('Member Project must preserve explicit Solo independent-work semantics.');failed=true;
}
if(!memberDetail.includes("const canApply=state==='open_eligible'")){
  console.error('Member Project must expose Submit Interest only for the canonical open-eligible state.');failed=true;
}
if(!memberDetail.includes("state==='full'?'Full · interest closed'")){
  console.error('A hard-cap FULL project must present interest as closed.');failed=true;
}
if(memberDetail.includes("const applicationsOpen=state==='open_eligible'||state==='full'")){
  console.error('FULL must never be treated as applications-open.');failed=true;
}

const publicDetail=fs.readFileSync('app/projects/[id]/page.tsx','utf8');
if(publicDetail.includes('resolveProjectPublicAvailability')){
  console.error('Public project availability must not use the retired role-opening authority.');failed=true;
}
if(!publicDetail.includes("rpc('get_public_project_capacity'")||!publicDetail.includes("!['closed','joining_closed','completed','full'].includes(capacity.recruitment_state)")){
  console.error('Public project CTA must be governed by canonical capacity and recruitment state.');failed=true;
}

const publicCatalogue=fs.readFileSync('app/projects/page.tsx','utf8');
if(publicCatalogue.includes('occupied_role_count')||publicCatalogue.includes('resolveProjectPublicAvailability')){
  console.error('Public catalogue must not restore role-opening capacity authority.');failed=true;
}
if(!publicCatalogue.includes("rpc('get_public_project_capacities'")){
  console.error('Public catalogue must resolve canonical aggregate capacity.');failed=true;
}

const teamResolver=fs.readFileSync('lib/project-team-overview.ts','utf8');
if(teamResolver.includes(".in('project_run_id',runIds)")){
  console.error('Team overview must not load every cohort roster for an ordinary project member.');failed=true;
}
const labPanel=fs.readFileSync('components/MetteloLabPanel.tsx','utf8');
if(labPanel.includes('MetteloLabClient')){
  console.error('Mettelo Lab secure cohort roster must remain server-rendered and outside a hydration-owned client boundary.');failed=true;
}
for(const forbidden of ['Open project cohorts','Not a member of this cohort','lockedCohort','cohortSwitcher']){
  if(labPanel.includes(forbidden)){console.error(`Member Mettelo Lab must not expose cross-cohort UI: ${forbidden}`);failed=true;}
}

const applicationsPage=fs.readFileSync('app/member/applications/page.tsx','utf8');
for(const forbidden of ["from('career_applications')",'CareerApplicationTracker','career_offer_documents','career_onboarding_items','career_application_events']){
  if(applicationsPage.includes(forbidden)){console.error(`My Mettelo Applications must stay project-only: ${forbidden}`);failed=true;}
}

// Participation readiness is necessary, but final project activation remains
// delegated to the canonical start service; interest submission cannot start a run.
const startService=fs.readFileSync('lib/project-start-service.ts','utf8');
if(!startService.includes("db.rpc('phase9_activate_project_run'")){
  console.error('Project activation must remain delegated to the canonical atomic activation boundary.');failed=true;
}
const interestMigration=fs.readFileSync('supabase/migrations/20260912170500_workstream2_canonical_project_contract.sql','utf8');
for(const forbidden of ['insert into public.project_members','insert into public.project_runs','phase9_activate_project_run']){
  if(interestMigration.includes(forbidden)){console.error(`Initial Submit Interest must not create participation/run state: ${forbidden}`);failed=true;}
}

if(failed)process.exit(1);
console.log('Phase 2 member/project compatibility audit passed against the current canonical Project Experience architecture.');
await import(`${pathToFileURL(path.resolve('scripts/audit-project-experience-phase-2.mjs')).href}?v=${Date.now()}`);
