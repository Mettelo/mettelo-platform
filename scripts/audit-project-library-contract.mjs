import fs from 'node:fs';

const fail=(message)=>{console.error(`Project Library contract audit failed: ${message}`);process.exitCode=1;};
const read=(path)=>fs.readFileSync(path,'utf8');

const publicLoader=read('lib/project-detail-content.ts');
const labLoader=read('lib/project-lab-canonical-data.ts');
const labBrief=read('components/project-experience/ProjectLabCanonicalBrief.tsx');
const publicPage=read('components/project-experience/ProjectPublicDetailV2.tsx');
const publicBody=read('components/project-experience/ProjectPublicDetailBodyV3.tsx');
const memberPage=read('components/project-experience/MemberProjectDetailV2.tsx');
const memberBody=read('components/project-experience/MemberProjectDetailBodyV3.tsx');
const publicExperience=`${publicPage}\n${publicBody}`;
const memberExperience=`${memberPage}\n${memberBody}`;
const publicRoute=read('app/projects/[id]/page.tsx');
const memberRoute=read('app/member/discover/[id]/page.tsx');
const importer=read('scripts/import-project-library.py');
const governanceReconciler=read('scripts/reconcile-project-library-governance.py');
const migration=read('supabase/migrations/20260902210000_project_library_import_contract.sql');
const templateMigration=read('supabase/migrations/20260902214500_project_library_template_rows.sql');
const governanceMigration=read('supabase/migrations/20260903083000_project_library_governance_metadata.sql');
const phase7Migration=read('supabase/migrations/20260903133000_project_library_phase7_publish_discovery.sql');
const phase8Migration=read('supabase/migrations/20260903140000_project_library_phase8_trigger_security_hardening.sql');
const phase8PrivateImportMigration=read('supabase/migrations/20260903141000_project_library_phase8_private_import_rls.sql');

const publicSelects=[...publicLoader.matchAll(/\.select\((['"`])([\s\S]*?)\1\)/g)].map(match=>match[2]);
for(const token of ['external_url','provider_url','licence_url','internal_storage_url','internal_storage_policy','legal_review_basis','preservation_action']){
  if(publicSelects.some(selection=>selection.includes(token)))fail(`public discovery loader selects restricted column ${token}`);
}
for(const token of ['externalUrl:null','providerUrl:null','licenceUrl:null']){
  if(!publicLoader.includes(token))fail(`public discovery loader must hard-null ${token}`);
}

// Phase 8: authorised Lab projection must gate before service-role reads.
for(const token of [
  "if(!user)return null",
  "const isAdmin=user.app_metadata?.role==='admin'",
  ".in('membership_status',['active','completed'])",
  "if(!membership)return null",
  'const db=serviceDb()',
  "governanceStatus==='green'&&row.internal_storage_policy==='permitted'",
  ".is('project_run_id',null)"
]){
  if(!labLoader.includes(token))fail(`Lab canonical loader missing Phase 8 guard ${token}`);
}
if(labLoader.indexOf('const db=serviceDb()')<labLoader.indexOf('if(!membership)return null'))fail('Lab service-role client must only be created after non-admin membership authorisation');
for(const token of ['internalStorageUrl:storagePermitted?text(row.internal_storage_url):null','proofSignals=[...new Set','Potential evidence']){
  if(token==='Potential evidence'){
    if(!labBrief.includes(token))fail('Lab UI must state that configured capability signals are potential evidence, not automatic Proof');
  }else if(!labLoader.includes(token))fail(`Lab canonical loader missing ${token}`);
}
for(const token of ['resource.internalStorageUrl&&<a','resource.externalUrl&&<a','Private stored-copy links appear only inside authorised Lab access']){
  if(!labBrief.includes(token))fail(`Lab canonical brief missing governed resource presentation ${token}`);
}
for(const token of [
  "alter function public.project_problem_brief_skip_noop_update()",
  "set search_path = ''",
  'revoke all on function public.project_problem_brief_skip_noop_update()',
  'from public, anon, authenticated',
  'grant execute on function public.project_problem_brief_skip_noop_update()',
  'to postgres, service_role'
]){
  if(!phase8Migration.includes(token))fail(`Phase 8 trigger hardening missing ${token}`);
}
for(const token of [
  'alter table if exists private_import.project_identity_baseline enable row level security',
  'alter table if exists private_import.project_library_stage enable row level security',
  'revoke all on schema private_import from public, anon, authenticated',
  'revoke all on all tables in schema private_import from public, anon, authenticated'
]){
  if(!phase8PrivateImportMigration.includes(token))fail(`Phase 8 private import hardening missing ${token}`);
}

// Phase 4 deliberately separates anonymous public projection from the richer authenticated member projection.
for(const token of ['getPublicProjectExperienceData','buildProjectExperienceModel']){
  if(!publicRoute.includes(token))fail(`public project detail route missing secure Phase 4 projection dependency ${token}`);
}
for(const forbidden of ['getProjectDetailContent','getProjectExperiencePlanning','getProjectExperienceRoleDetails']){
  if(publicRoute.includes(forbidden))fail(`public project detail route must not use privileged projection dependency ${forbidden}`);
}
for(const token of ['getProjectDetailContent','getProjectExperiencePlanning','getProjectExperienceRoleDetails','buildProjectExperienceModel']){
  if(!memberRoute.includes(token))fail(`member project detail route missing canonical projection dependency ${token}`);
}
for(const route of [publicRoute,memberRoute]){
  if(!route.includes('project_roles(id,title,description,skills,openings,discipline,canonical_role_key)'))fail('project detail route must load canonical project-role identity');
  if(!route.includes('project.canonical_project_key'))fail('canonical project detail must distinguish preserved legacy roles from canonical roles');
  if(!route.includes('canonical_role_key'))fail('canonical project detail must filter to canonical roles');
  if(route.includes('Project Contributor'))fail('project detail route must not invent generic Project Contributor roles');
}

if(!publicPage.includes('ProjectPublicDetailBodyV3'))fail('public project detail wrapper must render the approved V3 body');
if(!memberPage.includes('MemberProjectDetailBodyV3'))fail('member project detail wrapper must render the approved V3 body');
for(const token of ['challenge.decisionToSupport','challenge.constraintsTradeOffs','challenge.assumptions','challenge.responsibleUseRisks','acceptanceChecks','stakeholderHandover','deliverables','successCriteria','capabilities','proofSignals','roles']){
  if(!publicExperience.includes(token))fail(`public project detail does not render ${token}`);
}
for(const token of ['model','roles','contributionAreas','primaryAction']){
  if(!memberExperience.includes(token))fail(`member project detail does not preserve ${token}`);
}
for(const marker of ['01 · Overview','02 · Project fit','03 · Team &amp; capacity','04 · Delivery','05 · Quality','06 · Possible contribution areas','07 · What happens next']){
  if(!memberBody.includes(marker))fail(`member project detail must preserve Phase 5 decision journey marker ${marker}`);
}
for(const marker of ['Possible contribution areas','You are not choosing or applying for a formal role at this stage.','What happens after you submit interest','Phase 5 ends with the qualification decision and handoff. The actual interest answers are collected and persisted by the canonical Phase 6 form.']){
  if(!memberBody.includes(marker))fail(`member project detail must preserve Phase 5 handoff marker ${marker}`);
}
for(const retired of ['<strong>Apply</strong>','roleSelectButton',"?role=${encodeURIComponent(selectedRole.id)}",'/apply?role=']){
  if(memberBody.includes(retired))fail(`member project detail reintroduced retired role-first marker ${retired}`);
}

for(const token of ["visibility = 'public'","status = 'open'","applications_open = true",'project_identity_baseline']){
  if(!phase7Migration.includes(token))fail(`Phase 7 publication migration missing ${token}`);
}
for(const token of ["'open'::text","'forming'::text",'project roles readable anon','project roles readable authenticated']){
  if(!phase7Migration.includes(token))fail(`Phase 7 role discovery policy missing ${token}`);
}

for(const token of ['canonical_project_key','canonical_item_key','canonical_role_key','canonical_source_key']){
  if(!migration.includes(token))fail(`canonical migration missing ${token}`);
}
for(const token of ['project_deliverables_run_or_canonical_check','project_data_sources_run_or_canonical_check','project_data_sources_actor_or_canonical_check']){
  if(!templateMigration.includes(token))fail(`template-row migration missing ${token}`);
}
for(const token of ['career_domain_path','target_role','path_stage','competency_focus','capability_built','prerequisite_prior_project','path_outcome','content_quality_status','director_review_note','may_redistribute','commercial_reuse','attribution_required','recommended_archive_format','preservation_action','legal_review_basis','last_classification_review','preservation_mode']){
  if(!governanceMigration.includes(token))fail(`governance metadata migration missing ${token}`);
}

if(!importer.includes('project_payload(r, False)'))fail('importer must distinguish existing project updates');
if(!importer.includes('payload["role_status"] = "open"'))fail('new roles must receive explicit open status');
if(!importer.includes('existing_roles = api.request'))fail('importer must read existing roles before reconciliation');
if(!importer.includes('canonical_slug(title, pid)'))fail('new project slugs must retain workbook Project ID identity');
if(!importer.includes('INVALID_DATA_LINK'))fail('importer must fail closed on invalid dataset links');

for(const token of ['06_DATASET_PRESERVATION','07_SOURCES','08_PROJECT_REVIEW','09_DIRECTOR_QUALITY_AUDIT']){
  if(!governanceReconciler.includes(token))fail(`governance reconciler must validate ${token}`);
}
for(const token of ['stale_children','project_deliverables','project_success_criteria','project_roles','project_data_sources']){
  if(!governanceReconciler.includes(token))fail(`governance reconciler missing stale canonical child protection for ${token}`);
}
if(!governanceReconciler.includes('project_run_id=is.null'))fail('stale reconciliation must remain template-scoped and preserve run history');
if(!governanceReconciler.includes('WRITE_AUTHORIZATION_PHRASE'))fail('governance apply must require explicit production authorization');

if(!process.exitCode)console.log('Project Library contract audit passed.');
