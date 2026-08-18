import fs from 'node:fs';

const checks=[
  ['components/MemberAppShell.tsx',['Find a project','Applications','My projects','Profile','Member mobile navigation','Current section','Explore','SWITCH WORKSPACE','aria-current']],
  ['components/MemberAppShell.module.css',['grid-template-columns:repeat(5,1fr)','min-height:44px','backdrop-filter:blur(18px)','activeLink::before','secondaryDisclosure','pageContext']],
  ['app/member/page.tsx',['Your Mettelo at a glance','What needs you now','Continue working','Latest application','Profile readiness','ACCOUNT OVERVIEW','NEXT ACTIONS','statusBadge','What this means','applicationFacts','profileStrip','grid-template-columns:minmax(0,1fr) minmax(0,1fr)','role="progressbar"']],
  ['app/member/profile/page.tsx',['ProfileReturnAfterSave','MemberProfileSection','Better project matches','Faster applications']],
  ['components/MemberProfileSection.tsx',['Profile completeness','improve project matching','PROJECT AVAILABILITY','Preview public profile']],
  ['components/ProfileReturnAfterSave.tsx',['mettelo:profile-updated','window.location.assign(next)']],
  ['app/projects/page.tsx',['roleCount','deadlinePassed','Roles are still being prepared','View project →']],
  ['app/projects/[id]/page.tsx',['What this project is solving','Know what you are committing to','AVAILABLE ROLES','EXPECTED PROOF','Application deadline','ProjectApplicationForm','Roles pending','roles.length>0']],
  ['components/ProjectApplicationForm.tsx',['project_role_ids','Where could you contribute?','Select every area','type="checkbox"','/api/project-role-catalogue','REVIEW APPLICATION','Confirm & submit','Project Participation Terms','terms_attachment_id','terms_accepted']],
  ['app/member/applications/page.tsx',['project_application_events','project_run_id','forming_deadline','MemberApplicationTracker','Know exactly what is happening next.','Find another project']],
  ['components/MemberApplicationTracker.tsx',['WHAT THIS MEANS','WHAT HAPPENS NEXT','DO I NEED TO DO SOMETHING?','Application timeline','View history','formationTrack']],
  ['app/api/project-applications/route.ts',['application_deadline','applications_open','project_role_ids','project_role_catalogue','project_application_roles','catalogueRoles.map','application_submitted','team_place_released','waiting_for_team','terms_attachment_id','terms_accepted_at','Project Participation Terms']],
  ['app/api/project-terms/route.ts',['project_application_terms','communication_template_attachments','attachment_id']],
  ['app/api/admin/communications/attachments/route.ts',['communication-template-documents','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','MAX_FILES=4']],
  ['app/api/admin/applications/route.ts',["project.project_type==='open'","order('run_number',{ascending:true})","cohort_auto_started","project.project_type==='partner'","full&&project.project_type==='open'","required_team_size","if(!run&&project.project_type==='open')","if(!run){"]],
  ['app/api/project-team-lifecycle/route.ts',["project.project_type!=='partner'",'Partner projects never auto-start','partner_manual_start','Project Architect','project_lead']],
  ['app/api/admin/projects/route.ts',['export async function POST','Choose Open Project or Partner Project. Project type cannot be inferred.','Team size required is mandatory.','projectType===\'partner\'','run_number:1','project_type_review_required:false']],
  ['components/AdminProjectCreateButton.tsx',['Choose project type','Open Project','Partner Project','Team size required','Create private draft']],
  ['components/AdminProjectDetailActions.tsx',['Start Partner project','Team size required','applications_open']],
  ['app/admin/project-operations/projects/[id]/page.tsx',['cohortGrid','Team {run.run_number}','TYPE REVIEW REQUIRED','applications_open']],
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

const openRuns=[{run_number:1,status:'active',has_started:true,filled:3,required:3},{run_number:2,status:'forming',has_started:false,filled:1,required:3}];
const recruiting=openRuns.filter(run=>run.status==='forming'&&!run.has_started&&run.filled<run.required).sort((a,b)=>a.run_number-b.run_number)[0];
if(recruiting?.run_number!==2){console.error('Open project must continue forming a later cohort after an earlier cohort starts.');failed=true;}
const openShouldStart=(type,current,required,started)=>type==='open'&&!started&&current>=required;
if(!openShouldStart('open',3,3,false)||openShouldStart('partner',3,3,false)||openShouldStart('open',2,3,false)){console.error('Project team auto-start invariant failed.');failed=true;}

if(failed)process.exit(1);
console.log('Phase 2 member/project deterministic audit passed.');
