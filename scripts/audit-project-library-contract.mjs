import fs from 'node:fs';

const fail=(message)=>{console.error(`Project Library contract audit failed: ${message}`);process.exitCode=1;};
const read=(path)=>fs.readFileSync(path,'utf8');

const publicLoader=read('lib/project-detail-content.ts');
const labLoader=read('lib/project-lab-canonical-data.ts');
const publicPage=read('components/project-experience/ProjectPublicDetailV2.tsx');
const memberPage=read('components/project-experience/MemberProjectDetailV2.tsx');
const publicRoute=read('app/projects/[id]/page.tsx');
const memberRoute=read('app/member/discover/[id]/page.tsx');
const importer=read('scripts/import-project-library.py');
const governanceReconciler=read('scripts/reconcile-project-library-governance.py');
const migration=read('supabase/migrations/20260902210000_project_library_import_contract.sql');
const templateMigration=read('supabase/migrations/20260902214500_project_library_template_rows.sql');
const governanceMigration=read('supabase/migrations/20260903083000_project_library_governance_metadata.sql');
const phase7Migration=read('supabase/migrations/20260903133000_project_library_phase7_publish_discovery.sql');

const publicSelects=[...publicLoader.matchAll(/\.select\((['"`])([\s\S]*?)\1\)/g)].map(match=>match[2]);
for(const token of ['external_url','provider_url','licence_url','internal_storage_url','internal_storage_policy','legal_review_basis','preservation_action']){
  if(publicSelects.some(selection=>selection.includes(token)))fail(`public discovery loader selects restricted column ${token}`);
}
for(const token of ['externalUrl:null','providerUrl:null','licenceUrl:null']){
  if(!publicLoader.includes(token))fail(`public discovery loader must hard-null ${token}`);
}
if(!labLoader.includes(".in('membership_status',['active','completed'])"))fail('Lab loader must require active/completed project membership');
if(!labLoader.includes("governanceStatus==='green'&&row.internal_storage_policy==='permitted'"))fail('Lab stored-copy URL must require green governance plus storage permission');

for(const route of [publicRoute,memberRoute]){
  for(const token of ['getProjectDetailContent','getProjectExperiencePlanning','getProjectExperienceRoleDetails','buildProjectExperienceModel']){
    if(!route.includes(token))fail(`project detail route missing canonical projection dependency ${token}`);
  }
  if(!route.includes('project_roles(id,title,description,skills,openings,discipline)'))fail('project detail route must load actual project roles');
  if(route.includes('Project Contributor'))fail('project detail route must not invent generic Project Contributor roles');
}

for(const token of ['challenge.decisionToSupport','challenge.constraintsTradeOffs','challenge.assumptions','challenge.responsibleUseRisks','acceptanceChecks','stakeholderHandover','deliverables','successCriteria','capabilities','proofSignals','roles']){
  if(!publicPage.includes(token))fail(`public project detail does not render ${token}`);
}
for(const token of ['model','roles','contributionAreas','primaryAction']){
  if(!memberPage.includes(token))fail(`member project detail does not preserve ${token}`);
}
if(!memberPage.includes('Project journey'))fail('member project detail must preserve the five-step Project journey');

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
