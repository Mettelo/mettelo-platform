import fs from 'node:fs';

const checks=[
  ['components/AdminShell.tsx',['Website','Recruiting','Projects','Community & Proof','Content & Comms','Platform','System','Website overview','Platform overview','System overview','Settings','Admin primary navigation','adminBreadcrumb','Open Admin navigation','Close Admin navigation','aria-expanded','adminNavBackdrop','adminNavMobileHeader','/admin/website','/admin/platform','/admin/system','/admin/settings','/admin/project-operations/projects','/admin/project-operations/applications']],
  ['components/AdminWorkspaceOverview.tsx',['AVAILABLE NOW','Working controls','PLANNED CONTROLS','intentionally not rendered as links or controls','adminFoundationGrid','@media(max-width:760px)']],
  ['app/admin/website/page.tsx',['Website management','Navigation','Footer & social','Branding','/admin/website/navigation','/admin/website/footer','/admin/website/branding','News & Insights','Structured publishing','Pages','SEO','Media']],
  ['app/admin/website/navigation/page.tsx',['website.navigation.manage','AdminWebsiteNavigationEditor','website_chrome_drafts','website_chrome_public']],
  ['app/admin/website/footer/page.tsx',['website.content.edit','platform.settings.manage','AdminFooterSocialEditor','platform_settings','website_chrome_drafts','website_chrome_public']],
  ['app/admin/website/branding/page.tsx',['website.content.edit','AdminWebsiteBrandingEditor','website_chrome_drafts','website_chrome_public']],
  ['components/AdminWebsiteChromeEditors.tsx',['Save draft','Publish','Public navigation','Footer & social','Branding','DRAFT PREVIEW','aria-live','@media(max-width:480px)']],
  ['lib/website-chrome.ts',['DEFAULT_WEBSITE_CHROME','validateWebsiteChromePayload','isSafePublicHref','website_chrome_public','noStore()','https://mettelo.com']],
  ['components/ManagedPublicNavigation.tsx',['ManagedDesktopNavigation','ManagedMobileNavigation','Primary navigation','Primary mobile navigation','noopener noreferrer','@media(max-width:1080px)']],
  ['app/layout.tsx',['getPublicWebsiteChrome','ManagedDesktopNavigation','MobileMenuEnhancer navigation={chrome.navigation}','FooterManagedLink','branding.logo_dark_url','branding.logo_light_url','footer.sections']],
  ['app/api/admin/website/chrome/route.ts',['website.navigation.manage','website.content.edit','website.content.publish','website.chrome.draft.updated','website.chrome.published','recordAdminAudit','website_chrome_drafts','website_chrome_public']],
  ['supabase/migrations/20260820143000_website_chrome_management.sql',['website_chrome_public','website_chrome_drafts','public website chrome readable','revoke all on public.website_chrome_drafts','grant select on public.website_chrome_public to anon, authenticated','grant select, insert, update on public.website_chrome_public to service_role']],
  ['app/admin/platform/page.tsx',['Platform controls','Platform settings','Admin access','Authentication & SSO','Feature flags']],
  ['app/admin/system/page.tsx',['System operations','Audit log','QA team','General intake','System health','/admin/system/health','General background-job telemetry','canonical job registry']],
  ['components/AdminStatusBadge.tsx',['adminStatusBadge','iconByStatus','success','warning','danger','neutral','info']],
  ['app/admin/page.tsx',['NEEDS ATTENTION','WORKSPACE SHORTCUTS','Nothing needs attention right now','Applications to review','Teams forming','overviewStats','Platform settings','/admin/settings']],
  ['app/admin/settings/page.tsx',['Settings unavailable','AdminPlatformSettings','platform_settings','project_role_catalogue']],
  ['components/AdminPlatformSettings.tsx',['PLATFORM CONFIGURATION','Social channels','Contact details','Contribution-role catalogue','Add role','aria-live','@media(max-width:480px)']],
  ['app/api/admin/settings/route.ts',['platform.settings.manage','Platform settings capability required.','platform.setting.updated','recordAdminAudit','platform_settings','updated_by']],
  ['components/PlatformSocialLinks.tsx',['platform_settings','public_read','social_instagram','social_youtube','aria-label']],
  ['supabase/migrations/20260818184000_platform_settings.sql',['platform_settings','contact_email','social_linkedin','social_x','public_read']],
  ['app/admin/project-operations/projects/page.tsx',['Admin / Projects / Projects','AdminProjectCreateButton','AdminProjectManager']],
  ['components/AdminProjectManager.tsx',['Search by project name or partner','Team fill % ascending','Rows per page','Archive selected','Publish and visibility changes are managed from each project so lifecycle checks cannot be bypassed.','No projects match these filters','rowMenu','mobileProjectList']],
  ['app/admin/project-operations/projects/[id]/page.tsx',['Admin / Projects / Projects /','Project brief','BRIEF DETAILS','COHORTS','cohortGrid','APPLICATION DEADLINE','PROJECT METADATA','Applications received','Open Team Formation','AdminProjectVisibilityControl','AdminExpandableText']],
  ['components/AdminExpandableText.tsx',['Show more','Show less','aria-expanded']],
  ['components/AdminProjectVisibilityControl.tsx',['AdminStatusBadge','Visibility is controlled by Publish, Unpublish and Archive actions.','visibilityControl']],
  ['components/AdminProjectDetailActions.tsx',['Delete this project permanently?','Editing content cannot accidentally publish, close or reopen a project.','Team formation','Start Partner project','Publish as Pilot','Pause intake','Resume intake']],
  ['app/admin/project-operations/applications/page.tsx',['Admin / Projects / Requests','focusProjectId','query.eq(\'project_id\',focusProjectId)','AdminApplicationQueue',"decision!=='auto_qualified'",'Human review and AUTO oversight are intentionally separate.','AUTO start oversight','autoByRun']],
  ['components/AdminApplicationQueue.tsx',['Current review work','All statuses','Filter project requests by status','Rows per page','Previous','Next','No project requests match these filters','applicationTable','applicationMobileList','Project interest','Project application']],
  ['app/admin/project-operations/team-formation/page.tsx',['Admin / Projects / Team Formation','AdminTeamFormation']],
  ['components/AdminTeamFormation.tsx',['Search project or team member','Current teams','All statuses','Filter teams by status','Not yet full','Projects per page','Previous','Next','Start this team','Pause reason','Make lead','Save role','teamTable']],
  ['app/admin/opportunity-sources/page.tsx',['AdminOpportunitySources']],
  ['components/AdminOpportunitySources.tsx',['AUTOMATION HEALTH','sourceAlert','Sync all official sources','Search by company name','Auto-publish','Never synced','Advanced: add a specific official employer source','sourceTable','sourceMobileList']],
  ['app/api/admin/opportunity-sources/route.ts',['export async function DELETE','organisation_name','source_key','employer_domain']],
  ['app/api/admin/projects/route.ts',['updated_by_user_id:user.id','applications, team activity or evidence','lifecycle-controlled','publicationReadiness']],
  ['app/admin/team-formation/page.tsx',["redirect('/admin/project-operations/team-formation')"]],
  ['app/admin/applications/page.tsx',["redirect('/admin/project-operations/applications')"]],
  ['supabase/migrations/20260816021000_admin_project_updated_by.sql',['updated_by_user_id']],
];
let failed=false;let passed=0;
for(const [file,needles] of checks){
  if(!fs.existsSync(file)){console.error(`FAIL missing ${file}`);failed=true;continue;}
  const text=fs.readFileSync(file,'utf8');let ok=true;
  for(const needle of needles){if(!text.includes(needle)){console.error(`FAIL ${file}: missing ${needle}`);failed=true;ok=false;}}
  if(file==='app/layout.tsx'&&text.includes('<ManagedMobileNavigation')){console.error('FAIL app/layout.tsx: legacy ManagedMobileNavigation must not render alongside MobileMenuEnhancer');failed=true;ok=false;}
  if(file==='components/AdminApplicationQueue.tsx'||file==='components/AdminTeamFormation.tsx'){
    if(text.includes('select multiple')){console.error(`FAIL ${file}: status filters must not use native multi-select controls`);failed=true;ok=false;}
  }
  if(file==='components/AdminProjectManager.tsx'&&(text.includes('Make public')||text.includes('Make private')||text.includes('bulkVisibility('))){console.error('FAIL components/AdminProjectManager.tsx: bulk visibility must not bypass governed lifecycle actions');failed=true;ok=false;}
  if(file==='components/AdminProjectVisibilityControl.tsx'&&text.includes("fetch('/api/admin/projects'")){console.error('FAIL components/AdminProjectVisibilityControl.tsx: visibility display must not write lifecycle state directly');failed=true;ok=false;}
  if(ok){console.log(`PASS ${file}`);passed++;}
}
if(failed)process.exit(1);
console.log(`Admin console deterministic audit passed: ${passed}/${checks.length} files.`);
