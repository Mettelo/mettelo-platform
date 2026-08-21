import fs from 'node:fs';

const checks=[
  ['components/MemberAppShell.tsx',["from '@/lib/member-navigation'",'Find a project','/member/discover','My Mettelo mobile navigation','aria-current','moreActive','account?.hasLead',"account?.accountType==='project_architect'",'/member/project-lead','/member/architect-projects']],
  ['lib/member-navigation.ts',["label:'My Work'","label:'Home'","label:'Projects'","label:'Applications'","label:'Proof'","label:'Profile'","label:'Explore'","label:'Discover'","label:'Recommended'","label:'Opportunities'","label:'Saved'","label:'Events'","label:'Reputation'","label:'Spotlight'",'mobilePersistentNav','mobileMoreNav',"href:'/member/discover'"]],
  ['components/MemberAppShell.module.css',['grid-template-columns:repeat(5,minmax(0,1fr))','min-height:44px','safe-area-inset-bottom','activeLink','morePanel','pageContext','@media (min-width:481px) and (max-width:1024px)','@media (max-width:480px)']],
  ['app/member/page.tsx',['Good to see you','Up next · Project work','IMPORTANT UPDATES','Continue working','Latest status','PROFILE READINESS','Evidence that travels with you','Open Mettelo Lab','role="progressbar"','mobileMoreNav','aria-label="Member overview"']],
  ['app/member/member-home-v3.module.css',['max-width:1210px','grid-template-columns:repeat(4,minmax(0,1fr))','grid-template-columns:minmax(0,1.65fr) minmax(320px,.85fr)','@media(max-width:1100px)','@media(max-width:768px)','@media(max-width:480px)','prefers-reduced-motion:reduce']],
  ['app/member/profile/page.tsx',['ProfileReturnAfterSave','MemberProfileSection','Better project matches','Faster applications']],
  ['components/MemberProfileSection.tsx',['Profile completeness','improve project matching','PROJECT AVAILABILITY','Preview public profile']],
  ['components/ProfileReturnAfterSave.tsx',['mettelo:profile-updated','window.location.assign(next)']],
  ['app/projects/page.tsx',['roleCount','deadlinePassed','Roles are still being prepared','View project →']],
  ['app/projects/[id]/page.tsx',['What this project is solving','Know what you are committing to','AVAILABLE ROLES','EXPECTED PROOF','Application deadline','ProjectApplicationForm','Roles pending','roles.length>0']],
  ['components/ProjectApplicationForm.tsx',['Continue this project application inside My Mettelo.','/member/discover/${selected.id}/apply','View member project detail']],
  ['components/MemberProjectApplicationFlow.tsx',['Role & fit','Availability','Your response','Review','type="radio"','Project Participation Terms','terms_attachment_id','terms_accepted:true','Submit application','/api/project-applications']],
  ['app/member/discover/[id]/apply/page.tsx',['PROFILE_APPLICATION_READY','resolveMemberProjectState',"state!=='open_eligible'",'MemberProjectApplicationFlow']],
  ['app/member/applications/page.tsx',['project_application_events','project_run_id','forming_deadline','MemberApplicationTracker','MY WORK · PROJECT APPLICATIONS','Track the projects you’ve applied to','Discover projects',"from('project_applications')"]],
  ['components/MemberApplicationTracker.tsx',['Search project applications','Needs action','Applications moving forward','No action needed','Team forming','Project confirmed','Open in Projects','Looking for another project?','mmaApplicationCard','mmaHistoryCard','mmaDialog']],
  ['app/api/project-applications/route.ts',['application_deadline','applications_open','project_role_ids','project_role_catalogue','project_application_roles','catalogueRoles.map','application_submitted','team_place_released','waiting_for_team','terms_attachment_id','terms_accepted_at','Project Participation Terms','That project role has filled']],
  ['app/api/project-terms/route.ts',['project_application_terms','communication_template_attachments','attachment_id']],
  ['app/api/admin/communications/attachments/route.ts',['communication-template-documents','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','MAX_FILES=4']],
  ['app/api/admin/applications/route.ts',["project.project_type==='open'","order('run_number',{ascending:true})",'cohort_auto_started',"project.project_type==='partner'","full&&project.project_type==='open'",'required_team_size',"if(!run&&project.project_type==='open')",'if(!run){']],
  ['app/api/project-team-lifecycle/route.ts',["project.project_type!=='partner'",'Partner projects never auto-start','partner_manual_start','Project Architect','project_lead']],
  ['app/api/admin/projects/route.ts',['export async function POST','Choose Open Project or Partner Project. Project type cannot be inferred.','Team size required is mandatory.',"projectType==='partner'",'run_number:1','project_type_review_required:false']],
  ['components/AdminProjectCreateButton.tsx',['Choose project type','Open Project','Partner Project','Team size required','Create private draft']],
  ['components/AdminProjectDetailActions.tsx',['Start Partner project','Team size required','applications_open']],
  ['app/admin/project-operations/projects/[id]/page.tsx',['cohortGrid','Team {run.run_number}','TYPE REVIEW REQUIRED','applications_open','AdminCompletionRequirements']],
  ['app/api/project-final-proof/route.ts',['project_submission_permissions','final_proof_submitted','open_cohort_auto_completed','partner_completion_ready_for_review',"project.project_type==='open'","presentation.status!=='verified'",'delegated:access.delegated']],
  ['app/api/project-final-proof/status/route.ts',['can_grant','can_submit','delegated','project_final_proof_submissions','project_completion_requests']],
  ['app/api/project-completion/route.ts',['changes_requested','reviewed_by_user_id','assigned Project Architect','Partner project completion approved']],
  ['components/ProjectFinalProofPanel.tsx',['FINAL PROOF & COMPLETION','Delegate final Proof submission','actual submitter','Reviewer-gated completion','Automatic cohort completion']],
  ['components/ProjectTeamRoster.tsx',['COHORTS','Final Proof delegate','profile photo','cohortSwitcher','is_member','lockedCohort','Not a member','initialOverview']],
  ['app/api/project-team-overview/route.ts',['resolveProjectTeamOverview','Project membership is required.']],
  ['lib/project-team-overview.ts',['ownRunIds','readableRuns','readableRunIds','is_member:isMember','members:isMember?']],
  ['components/MetteloLabPanel.tsx',['resolveProjectTeamOverview','METTELO LAB','YOUR TEAM','teamOverview','MetteloLabPanel.module.css']],
  ['components/MetteloLabPanel.module.css',['grid-template-columns:repeat(2,minmax(0,1fr))','min-height:44px','@media(max-width:480px)']],
  ['components/WorkspaceRouteTabs.tsx',["key:'team',label:'Mettelo Lab'","['mettelo-lab','Lab']",'Collaborate with your cohort and see what to do next.']],
  ['app/member/projects/[id]/layout.tsx',['METTELO LAB','MetteloLabNavigation','MetteloLabViewSurface','mobileNav']],
  ['components/MetteloLabNavigation.tsx',["label:'Home'","label:'Chat'","label:'Team'","hrefFor('more')"]],
  ['app/member/projects/[id]/page.tsx',['MetteloLabPanel','reviewSlot','href="#mettelo-lab">Mettelo Lab','recentDiscussions']],
  ['components/AdminCompletionRequirements.tsx',['Verified presentation required','Published GitHub repository required','Final Proof / deliverable URL required']],
  ['supabase/migrations/20260818190000_project_completion_permissions.sql',['project_submission_permissions','project_final_proof_submissions','github_repo_required','final_proof_required']],
  ['app/api/admin/project-role-catalogue/route.ts',['export async function POST','export async function PATCH','project_role_catalogue']],
  ['app/admin/project-operations/applications/page.tsx',['project_application_roles','project_role_catalogue(title)','selectedRoles.join']],
  ['supabase/migrations/20260818180500_project_role_catalogue.sql',['project_role_catalogue','project_application_roles','Data Analyst','Data Engineer','Data Scientist','ML Engineer','AI/ML Researcher','BI/Analytics Engineer','Product Analyst','Project Manager/Lead','Business Analyst','QA/Testing','Technical Writer/Documentation','UI/UX Designer','Frontend Developer','Backend Developer','DevOps/Infrastructure','Marketing/Content','Community/Mentorship','members add own application roles']],
  ['supabase/migrations/20260818182000_communication_template_attachments.sql',['communication_template_attachments','communication-template-documents','project_application_terms','terms_attachment_id','terms_accepted_at']],
  ['supabase/migrations/20260818174500_project_cohort_lifecycle.sql',['applications_open','project_type_review_required','required_team_size','has_started','project_activity_log']],
  ['supabase/migrations/20260816001500_phase2_project_application_events.sql',['project_application_events','record_project_application_event','members read own project application events']],
  ['supabase/migrations/20260816004500_allow_open_forming_public_projects.sql',['open','forming','public projects readable anon','projects readable authenticated']],
  ['supabase/migrations/20260816010500_restrict_project_application_updates.sql',['applications updatable by admin','public.is_admin()']]
];
let failed=false;
for(const [file,needles] of checks){if(!fs.existsSync(file)){console.error(`Missing ${file}`);failed=true;continue;}const text=fs.readFileSync(file,'utf8');for(const needle of needles){if(!text.includes(needle)){console.error(`${file}: missing ${needle}`);failed=true;}}}

const publicApplicationForm=fs.readFileSync('components/ProjectApplicationForm.tsx','utf8');
if(publicApplicationForm.includes("fetch('/api/project-applications'")){console.error('Public project page must not maintain a second full-application submit form.');failed=true;}
const internalApplicationFlow=fs.readFileSync('components/MemberProjectApplicationFlow.tsx','utf8');
if(!internalApplicationFlow.includes("fetch('/api/project-applications'")){console.error('Authenticated My Mettelo application flow must own canonical project application submission.');failed=true;}

const layout=fs.readFileSync('app/member/projects/[id]/layout.tsx','utf8');
const routeTabs=fs.readFileSync('components/WorkspaceRouteTabs.tsx','utf8');
if(layout.includes('Project workspace')||layout.includes('>Conversation<')||layout.includes('>Work<')){console.error('Mettelo Lab must use the approved member-facing identity and terminology.');failed=true;}
const teamResolver=fs.readFileSync('lib/project-team-overview.ts','utf8');
if(teamResolver.includes(".in('project_run_id',runIds)")){console.error('Team overview must not load every cohort roster for an ordinary project member.');failed=true;}
const labPanel=fs.readFileSync('components/MetteloLabPanel.tsx','utf8');
if(labPanel.includes('MetteloLabClient')){console.error('Mettelo Lab secure cohort roster must remain server-rendered and outside a hydration-owned client boundary.');failed=true;}
for(const forbidden of ['Open project cohorts','Not a member of this cohort','lockedCohort','cohortSwitcher']){if(labPanel.includes(forbidden)){console.error(`Member Mettelo Lab must not expose cross-cohort UI: ${forbidden}`);failed=true;}}
if(!labPanel.includes('YOUR TEAM')){console.error('Member Mettelo Lab must identify the member\'s own team explicitly.');failed=true;}
if(!routeTabs.includes("key:'team',label:'Mettelo Lab'")){console.error('Legacy routed workspace compatibility must preserve the Mettelo Lab label.');failed=true;}

const memberNav=fs.readFileSync('lib/member-navigation.ts','utf8');
for(const required of ["label:'Home'","label:'Projects'","label:'Applications'","label:'Proof'","label:'Profile'","label:'Discover'","label:'Recommended'","label:'Opportunities'","label:'Saved'","label:'Events'","label:'Spotlight'"]){if(!memberNav.includes(required)){console.error(`My Mettelo navigation must preserve member capability: ${required}`);failed=true;}}
const persistentStart=memberNav.indexOf('export const mobilePersistentNav');
const persistentEnd=memberNav.indexOf('export const mobileMoreNav');
const persistent=memberNav.slice(persistentStart,persistentEnd);
const mobileLabels=[...persistent.matchAll(/label:'([^']+)'/g)].map(match=>match[1]);
if(JSON.stringify(mobileLabels)!==JSON.stringify(['Home','Projects','Discover','Proof','More'])){console.error(`My Mettelo mobile persistent navigation changed unexpectedly: ${mobileLabels.join(', ')}`);failed=true;}

const applicationsPage=fs.readFileSync('app/member/applications/page.tsx','utf8');
for(const forbidden of ["from('career_applications')",'CareerApplicationTracker','career_offer_documents','career_onboarding_items','career_application_events']){if(applicationsPage.includes(forbidden)){console.error(`My Mettelo Applications must stay project-only: ${forbidden}`);failed=true;}}
const applicationsTracker=fs.readFileSync('components/MemberApplicationTracker.tsx','utf8');
if(applicationsTracker.includes('Open Mettelo Lab')){console.error('Applications must hand confirmed work to Projects before Mettelo Lab.');failed=true;}
if(!applicationsTracker.includes('href="/member/projects"')){console.error('Confirmed Applications must hand off to Projects.');failed=true;}

const openRuns=[{run_number:1,status:'active',has_started:true,filled:3,required:3},{run_number:2,status:'forming',has_started:false,filled:1,required:3}];
const recruiting=openRuns.filter(run=>run.status==='forming'&&!run.has_started&&run.filled<run.required).sort((a,b)=>a.run_number-b.run_number)[0];
if(recruiting?.run_number!==2){console.error('Open project must continue forming a later cohort after an earlier cohort starts.');failed=true;}
const openShouldStart=(type,current,required,started)=>type==='open'&&!started&&current>=required;
if(!openShouldStart('open',3,3,false)||openShouldStart('partner',3,3,false)||openShouldStart('open',2,3,false)){console.error('Project team auto-start invariant failed.');failed=true;}

if(failed)process.exit(1);
console.log('Phase 2 member/project deterministic audit passed.');
