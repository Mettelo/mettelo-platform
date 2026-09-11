import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Phase 2 established the member-project surfaces. Later Project Experience
// phases intentionally replaced early role-neutral and automatic-admission UI
// assumptions. This compatibility audit protects the surviving capabilities
// while asserting the current canonical Submit Interest boundary.
const checks=[
  ['components/MemberAppShell.tsx',["from '@/lib/member-navigation'",'Find a project','/member/discover','My Mettelo mobile navigation','aria-current']],
  ['lib/member-navigation.ts',["label:'Home'","label:'Projects'","label:'Applications'","label:'Proof'","label:'Profile'","label:'Discover'","label:'Recommended'","label:'Opportunities'","label:'Saved'","label:'Events'","label:'Spotlight'",'mobilePersistentNav','mobileMoreNav']],
  ['app/projects/page.tsx',['resolveProjectPublicAvailability','View project →']],
  ['app/projects/[id]/page.tsx',['ProjectPublicDetailV2','buildProjectExperienceModel']],
  ['components/project-experience/ProjectPublicDetailV2.tsx',['Decide whether this is the right project for you.','Interest closes','ProjectPublicDetailBodyV3']],
  ['components/project-experience/MemberProjectDetailV2.tsx',['YOUR DECISION','Submit Interest','Participation','Capacity','Applications','Minimum to start','Target team','Solo place currently allocated','You can still submit interest while applications remain open.','MemberProjectDetailBodyV3']],
  ['components/MemberProjectApplicationFlow.tsx',['Participation','Role & contribution','Availability','Fit','Review','Primary role','Second-choice role','Relevant contribution areas','Published project commitment','Why do you want to work on this project?','What would you contribute?','leadership_interest:isSolo?false:leadership','participation_preference:participation','PROJECT_PARTICIPATION_TERMS_VERSION','Submit Interest',"fetch('/api/project-applications'"]],
  ['app/api/project-applications/route.ts',['canonicalParticipationMode','resolveParticipationPreference',"rpc('submit_project_interest'",'p_participation_preference','p_primary_project_role_id','p_secondary_project_role_id','p_leadership_interest:leadershipInterest','participation_preference','ALREADY_PARTICIPATING','PERSISTENCE_NOT_CONFIRMED']],
  ['supabase/migrations/20260911110000_submit_interest_participation_journey.sql',['create or replace function public.submit_project_interest','pg_advisory_xact_lock','PARTICIPATION_NOT_SUPPORTED','PRIMARY_ROLE_REQUIRED','PRIMARY_ROLE_FULL',"'submitted','interest'","'review_required','review_required'",'security definer']],
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

const internalApplicationFlow=fs.readFileSync('components/MemberProjectApplicationFlow.tsx','utf8');
if(!internalApplicationFlow.includes("const isSolo=participation==='solo'")){
  console.error('Submit Interest must preserve explicit Solo semantics.');failed=true;
}
if(!internalApplicationFlow.includes("if(participation==='solo'){setPrimaryRole('');setSecondaryRole('');setRoleFit('');setLeadership(false)}")){
  console.error('Solo interest must clear team role and leadership fields.');failed=true;
}
if(!internalApplicationFlow.includes('I would be willing to lead this project team if selected.')){
  console.error('Team leadership willingness must remain an input rather than automatic Project Lead authority.');failed=true;
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
if(!memberDetail.includes("const applicationsOpen=state==='open_eligible'||state==='full'")){
  console.error('Member Project must keep application availability separate from current placement capacity.');failed=true;
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
const interestMigration=fs.readFileSync('supabase/migrations/20260911110000_submit_interest_participation_journey.sql','utf8');
for(const forbidden of ['insert into public.project_members','insert into public.project_runs','phase9_activate_project_run']){
  if(interestMigration.includes(forbidden)){console.error(`Initial Submit Interest must not create participation/run state: ${forbidden}`);failed=true;}
}

if(failed)process.exit(1);
console.log('Phase 2 member/project compatibility audit passed against the current Project Experience architecture.');
await import(`${pathToFileURL(path.resolve('scripts/audit-project-experience-phase-2.mjs')).href}?v=${Date.now()}`);
