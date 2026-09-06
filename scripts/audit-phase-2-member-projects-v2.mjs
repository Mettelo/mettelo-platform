import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Phase 2 established the member-project surfaces. Later Project Experience
// phases intentionally replaced several early literals and headcount-only
// assumptions. This compatibility audit protects the capabilities that must
// survive without requiring retired UI copy or retired admission/start logic.
const checks=[
  ['components/MemberAppShell.tsx',["from '@/lib/member-navigation'",'Find a project','/member/discover','My Mettelo mobile navigation','aria-current']],
  ['lib/member-navigation.ts',["label:'Home'","label:'Projects'","label:'Applications'","label:'Proof'","label:'Profile'","label:'Discover'","label:'Recommended'","label:'Opportunities'","label:'Saved'","label:'Events'","label:'Spotlight'",'mobilePersistentNav','mobileMoreNav']],
  ['app/projects/page.tsx',['resolveProjectPublicAvailability','View project →']],
  ['app/projects/[id]/page.tsx',['ProjectPublicDetailV2','getProjectExperiencePlanning','buildProjectExperienceModel','roles.length>0']],
  ['components/project-experience/ProjectPublicDetailV2.tsx',['Decide whether this is the right project for you.','Applications close','Open in My Mettelo','ProjectPublicDetailBodyV3']],
  ['components/project-experience/MemberProjectDetailV2.tsx',['YOUR DECISION','Submit Interest','Minimum to start','Target team','Maximum team','Solo participation capacity','Team participation capacity','MemberProjectDetailBodyV3']],
  ['components/MemberProjectApplicationFlow.tsx',['Availability','How you could contribute','Review','You are not choosing a formal project role at this stage.','Formal project responsibilities are assigned later','leadership_interest:leadershipInterest','participation_preference:participationPreference','PROJECT_PARTICIPATION_TERMS_VERSION','Submit Interest',"fetch('/api/project-applications'"]],
  ['app/api/project-applications/route.ts',['canonicalAdmissionMode','canonicalParticipationMode','resolveParticipationPreference','phase6_auto_admit_interest',"admission_decision:'review_required'",'leadership_interest:leadershipInterest','participation_preference','ALREADY_PARTICIPATING','CAPACITY_FULL']],
  ['lib/project-team-readiness.ts',["members.every(member=>Boolean(member.project_role_id))",".select('lab_ready')","if(leads.length===0)blockers.push('project_lead')","if(leads.length>1)blockers.push('multiple_project_leads')",'ready:blockers.length===0']],
  ['lib/project-start-service.ts',["db.rpc('phase9_activate_project_run'",'assessProjectTeamReadiness']],
  ['app/member/applications/page.tsx',['project_application_events','project_run_id','MemberApplicationTracker','MY WORK · PROJECT APPLICATIONS',"from('project_applications')"]],
  ['components/MemberApplicationTracker.tsx',['Search project applications','Team forming','Project confirmed','Open in Projects']],
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

const internalApplicationFlow=fs.readFileSync('components/MemberProjectApplicationFlow.tsx','utf8');
for(const forbidden of ['Role & fit','project_role_ids:','project_role_id:']){
  if(internalApplicationFlow.includes(forbidden)){
    console.error(`Submit Interest must remain role-neutral after Phase 6: ${forbidden}`);failed=true;
  }
}
if(!internalApplicationFlow.includes('This is an interest signal, not a guarantee or a formal role assignment.')){
  console.error('Leadership interest must remain an input rather than automatic Project Lead authority.');failed=true;
}

const applicationRoute=fs.readFileSync('app/api/project-applications/route.ts','utf8');
if(!applicationRoute.includes("if(admissionMode==='auto')")||!applicationRoute.includes("admission={decision:'review_required'")){
  console.error('Canonical project interest must preserve separate AUTO and REVIEW_REQUIRED admission paths.');failed=true;
}
if(applicationRoute.includes("status:'offered'")||applicationRoute.includes("status:'accepted'")){
  console.error('Initial Submit Interest must not fabricate Offer/Acceptance state.');failed=true;
}

const memberDetail=fs.readFileSync('components/project-experience/MemberProjectDetailV2.tsx','utf8');
if(!memberDetail.includes("project.participationMode==='solo'")){
  console.error('Member Project must preserve explicit Solo independent-work semantics.');failed=true;
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

// Later phases replaced Phase 2's headcount-only auto-start simulation. The
// compatibility invariant is now: participation readiness is necessary, but
// atomic final activation remains delegated to the canonical start service.
const startService=fs.readFileSync('lib/project-start-service.ts','utf8');
if(!startService.includes("db.rpc('phase9_activate_project_run'")){
  console.error('Project activation must remain delegated to the canonical atomic activation boundary.');failed=true;
}

if(failed)process.exit(1);
console.log('Phase 2 member/project compatibility audit passed against the current Project Experience architecture.');
await import(`${pathToFileURL(path.resolve('scripts/audit-project-experience-phase-2.mjs')).href}?v=${Date.now()}`);
