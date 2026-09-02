import fs from 'node:fs';

const fail=(message)=>{console.error(`Project Library contract audit failed: ${message}`);process.exitCode=1;};
const read=(path)=>fs.readFileSync(path,'utf8');

const publicLoader=read('lib/project-detail-content.ts');
const labLoader=read('lib/project-lab-canonical-data.ts');
const publicPage=read('components/project-experience/ProjectPublicDetailV2.tsx');
const importer=read('scripts/import-project-library.py');
const migration=read('supabase/migrations/20260902210000_project_library_import_contract.sql');
const templateMigration=read('supabase/migrations/20260902214500_project_library_template_rows.sql');

const publicSelects=[...publicLoader.matchAll(/\.select\((['"`])([\s\S]*?)\1\)/g)].map(match=>match[2]);
for(const token of ['external_url','internal_storage_url']){
  if(publicSelects.some(selection=>selection.includes(token)))fail(`public discovery loader selects restricted column ${token}`);
}
for(const token of ['externalUrl:null','providerUrl:null','licenceUrl:null']){
  if(!publicLoader.includes(token))fail(`public discovery loader must hard-null ${token}`);
}
if(!labLoader.includes(".in('membership_status',['active','completed'])"))fail('Lab loader must require active/completed project membership');
if(!labLoader.includes("governanceStatus==='green'&&row.internal_storage_policy==='permitted'"))fail('Lab stored-copy URL must require green governance plus storage permission');

for(const token of ['challenge.decisionToSupport','challenge.constraintsTradeOffs','challenge.assumptions','challenge.responsibleUseRisks','acceptanceChecks','stakeholderHandover']){
  if(!publicPage.includes(token))fail(`public project detail does not render ${token}`);
}

for(const token of ['canonical_project_key','canonical_item_key','canonical_role_key','canonical_source_key']){
  if(!migration.includes(token))fail(`canonical migration missing ${token}`);
}
for(const token of ['project_deliverables_run_or_canonical_check','project_data_sources_run_or_canonical_check','project_data_sources_actor_or_canonical_check']){
  if(!templateMigration.includes(token))fail(`template-row migration missing ${token}`);
}
if(!importer.includes('project_payload(r, False)'))fail('importer must distinguish existing project updates');
if(!importer.includes('payload["role_status"] = "open"'))fail('new roles must receive explicit open status');
if(!importer.includes('project_roles?select=id,title,canonical_role_key,role_status'))fail('importer must read existing role status before reconciliation');
if(!importer.includes('canonical_slug(title, pid)'))fail('new project slugs must retain workbook Project ID identity');
if(!importer.includes('INVALID_DATA_LINK'))fail('importer must fail closed on invalid dataset links');

if(!process.exitCode)console.log('Project Library contract audit passed.');
