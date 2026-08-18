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
  ['components/ProjectApplicationForm.tsx',['project_role_ids','Where could you contribute?','Select every area','type="checkbox"','/api/project-role-catalogue','REVIEW APPLICATION','Confirm & submit']],
  ['app/member/applications/page.tsx',['project_application_events','project_run_id','forming_deadline','MemberApplicationTracker','Know exactly what is happening next.','Find another project']],
  ['components/MemberApplicationTracker.tsx',['WHAT THIS MEANS','WHAT HAPPENS NEXT','DO I NEED TO DO SOMETHING?','Application timeline','View history','formationTrack']],
  ['app/api/project-applications/route.ts',['project_role_ids','project_role_catalogue','project_application_roles','catalogueRoles.map','application_submitted']],
  ['app/api/admin/project-role-catalogue/route.ts',['export async function POST','export async function PATCH','project_role_catalogue']],
  ['app/admin/project-operations/applications/page.tsx',['project_application_roles','project_role_catalogue(title)','selectedRoles.join']],
  ['supabase/migrations/20260818180500_project_role_catalogue.sql',['project_role_catalogue','project_application_roles','Data Analyst','Data Engineer','Data Scientist','ML Engineer','AI/ML Researcher','BI/Analytics Engineer','Product Analyst','Project Manager/Lead','Business Analyst','QA/Testing','Technical Writer/Documentation','UI/UX Designer','Frontend Developer','Backend Developer','DevOps/Infrastructure','Marketing/Content','Community/Mentorship','members add own application roles']],
  ['supabase/migrations/20260816001500_phase2_project_application_events.sql',['project_application_events','record_project_application_event','members read own project application events']],
  ['supabase/migrations/20260816004500_allow_open_forming_public_projects.sql',['open','forming','public projects readable anon','projects readable authenticated']],
  ['supabase/migrations/20260816010500_restrict_project_application_updates.sql',['applications updatable by admin','public.is_admin()']]
];
let failed=false;
for(const [file,needles] of checks){if(!fs.existsSync(file)){console.error(`Missing ${file}`);failed=true;continue;}const text=fs.readFileSync(file,'utf8');for(const needle of needles){if(!text.includes(needle)){console.error(`${file}: missing ${needle}`);failed=true;}}}
if(failed)process.exit(1);
console.log('Phase 2 member/project deterministic audit passed.');
