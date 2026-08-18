import fs from 'node:fs';

const checks=[
  ['components/AdminShell.tsx',['Recruiting','Projects','Community & Proof','Content & Comms','System','Admin primary navigation','adminBreadcrumb','/admin/project-operations/projects','/admin/project-operations/applications']],
  ['components/AdminStatusBadge.tsx',['adminStatusBadge','iconByStatus','success','warning','danger','neutral','info']],
  ['app/admin/page.tsx',['NEEDS ATTENTION','WORKSPACE SHORTCUTS','Nothing needs attention right now','Applications to review','Teams forming','overviewStats','Platform settings','/admin/settings']],
  ['app/admin/settings/page.tsx',['Platform settings','AdminPlatformSettings','project_role_catalogue','General contact']],
  ['components/AdminPlatformSettings.tsx',['General contact','Social & community','Save settings','role catalogue','aria-live','@media(max-width:']],
  ['app/api/admin/settings/route.ts',['Admin access required','platform_settings','updated_by']],
  ['components/PlatformSocialLinks.tsx',['platform_settings','public_read','social_instagram','social_youtube','aria-label']],
  ['supabase/migrations/20260818184000_platform_settings.sql',['platform_settings','contact_email','social_linkedin','social_x','public_read']],
  ['app/admin/project-operations/projects/page.tsx',['Admin / Projects / Projects','Create project','AdminProjectManager']],
  ['components/AdminProjectManager.tsx',['Search by project name or partner','Team fill % ascending','Rows per page','Archive selected','Make public','Make private','No projects match these filters','rowMenu','mobileProjectList']],
  ['app/admin/project-operations/projects/[id]/page.tsx',['Admin / Projects / Projects /','Project brief','BRIEF DETAILS','TEAM FILL','APPLICATION DEADLINE','PROJECT METADATA','Applications received','Open Team Formation','AdminProjectVisibilityControl','AdminExpandableText']],
  ['components/AdminExpandableText.tsx',['Show more','Show less','aria-expanded']],
  ['components/AdminProjectVisibilityControl.tsx',['Confirm visibility','Change visibility','removed from public discovery','Make this project']],
  ['components/AdminProjectDetailActions.tsx',['Delete this project permanently?','applications, team members and workspace data','Edit project','Open team formation']],
  ['app/admin/project-operations/applications/page.tsx',['Admin / Projects / Applications','focusProjectId','query.eq(\'project_id\',focusProjectId)','AdminApplicationQueue']],
  ['components/AdminApplicationQueue.tsx',['Project','Applied from','Applied to','Approve selected → team','MESSAGE PREVIEW','Confirm status & send','Edit message before sending','Rows per page','No applications match your filters','applicationTable','applicationMobileList']],
  ['app/admin/project-operations/team-formation/page.tsx',['Admin / Projects / Team Formation','AdminTeamFormation']],
  ['components/AdminTeamFormation.tsx',['Search project or team member','Not yet full','Start this team','Pause reason','Make lead','Save role','teamTable','Page']],
  ['app/admin/opportunity-sources/page.tsx',['AdminOpportunitySources']],
  ['components/AdminOpportunitySources.tsx',['AUTOMATION HEALTH','sourceAlert','Sync all official sources','Search by company name','Auto-publish','Never synced','Advanced: add a specific official employer source','sourceTable','sourceMobileList']],
  ['app/api/admin/opportunity-sources/route.ts',['export async function DELETE','organisation_name','source_key','employer_domain']],
  ['app/api/admin/projects/route.ts',['updated_by_user_id:user.id','applications, team activity or evidence']],
  ['app/admin/team-formation/page.tsx',["redirect('/admin/project-operations/team-formation')"]],
  ['app/admin/applications/page.tsx',["redirect('/admin/project-operations/applications')"]],
  ['supabase/migrations/20260816021000_admin_project_updated_by.sql',['updated_by_user_id']],
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');let ok=true;
  for(const needle of needles){if(!text.includes(needle)){console.error(`FAIL ${file}: missing ${needle}`);failed=true;ok=false;}}
  if(ok){console.log(`PASS ${file}`);passed++;}
}
if(failed)process.exit(1);
console.log(`Admin console deterministic audit passed: ${passed}/${checks.length} files.`);
