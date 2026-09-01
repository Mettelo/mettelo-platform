import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260831223000_capability_paths_import_governance.sql','utf8');
const retryMigration=fs.readFileSync('supabase/migrations/20260831223100_capability_path_import_retryable_batches.sql','utf8');
const parser=fs.readFileSync('lib/capability-path-import-workbook.ts','utf8');
const api=fs.readFileSync('app/api/admin/capability-paths/import/route.ts','utf8');
const ui=fs.readFileSync('components/AdminCapabilityPathImport.tsx','utf8');
const page=fs.readFileSync('app/admin/capability-paths/import/page.tsx','utf8');
const docs=fs.readFileSync('docs/CAPABILITY_PATHS_PHASE_5_IMPORT_RELEASE.md','utf8');

function hasAll(source:string,values:string[]){for(const value of values)expect(source,`missing ${value}`).toContain(value)}

test.describe('Capability Paths Phase 5 import governance contract',()=>{
 test('workbook import is dry-run first, fingerprinted and never auto-publishes',()=>{
  hasAll(migration,['capability_path_import_batches','source_sha256','capability_path_import_rows','capability_path_import_resources','admin_commit_capability_path_import','admin_rollback_capability_path_import']);
  hasAll(api,["action==='dry_run'","action==='approve'","action==='commit'","CAPABILITY_PATH_IMPORT_COMMIT_ENABLED","status:'approved'"]);
  hasAll(migration,["'draft','private','open'","status='imported'"]);
  expect(migration).not.toContain("'published','public'");
  expect(api).not.toContain("action:'publish'");
 });
 test('canonical projects are reused and placement semantics remain many-to-many',()=>{
  hasAll(migration,['capability_path_import_project_origins','existing_project_id','was_existing','capability_path_import_placement_origins','capability_path_projects','source_project_key']);
  hasAll(api,['AMBIGUOUS_EXISTING_PROJECT_TITLE','reused_existing_projects','new_projects_proposed']);
  expect(migration).not.toContain('career_path_id');
 });
 test('resource governance prevents public-download-equals-redistribution assumptions',()=>{
  hasAll(migration,["governance_status in ('green','amber','red','link_only')","storage_decision in ('review','store_allowed','link_only','do_not_store')",'checksum_sha256','subset_scope']);
  hasAll(api,['Only Green resources can be approved for Mettelo storage','storage_decision===\'store_allowed\'']);
  hasAll(ui,['Publicly downloadable does not mean Mettelo may redistribute it.','Store allowed','Link only','Do not store']);
  expect(ui).not.toContain('download(resource');
 });
 test('workbook parser uses the real index and numeric placements rather than hard-coded volume',()=>{
  hasAll(parser,['Domain Paths Index','Project Library','Path Project #','Path #','Number.isFinite','expectedPlacements=index.reduce','expectedProjectIds']);
  expect(parser).not.toContain('expected:{paths:15,placements:225,projects:117}');
  hasAll(docs,['15 indexed Capability Path sheets','225 numeric Path placements','117 unique project codes','not hard-coded into the importer']);
 });
 test('unapproved content, ambiguous matches and invalid prerequisites block approval',()=>{
  hasAll(api,['PROJECT_REVIEW_NOT_APPROVED','PROJECT_QUALITY_FIELDS_MISSING','AMBIGUOUS_EXISTING_PROJECT_TITLE','PREREQUISITE_NOT_IN_PATH','PREREQUISITE_NOT_EARLIER','Resolve or reject every blocked/needs-change import row before approval.']);
  hasAll(ui,['Approve override','Reject unmapped term','No unresolved import rows.']);
 });
 test('taxonomy is normalized by mapping, not silently created',()=>{
  hasAll(api,['UNMAPPED_TAXONOMY','matched_taxonomy_id',"type==='technical'||type==='professional'?'capability':type",'taxonomy_type:taxonomyType','Map this taxonomy term before approving it, or reject the term for this import.']);
  expect(migration).not.toContain('insert into public.capabilities(');
  expect(migration).not.toContain('insert into public.domains(');
  expect(migration).not.toContain('insert into public.tools(');
  expect(migration).not.toContain('insert into public.methods(');
 });
 test('rollback is conservative and existing evidence cannot be destroyed',()=>{
  hasAll(migration,['Cannot rollback: imported Path already has member history','Cannot rollback: imported Path is no longer Draft','project_applications','project_members','project_runs','contributions','rollback_retained']);
  hasAll(docs,['existing projects are never deleted','canonical project IDs are never rewritten']);
 });
 test('Admin route is protected and raw workbook is kept out of public storage',()=>{
  hasAll(page,["user.app_metadata?.role!=='admin'",'AdminCapabilityPathImport']);
  hasAll(ui,['parsed in your browser','is not uploaded to a public bucket','SHA-256 fingerprint']);
  hasAll(parser,["crypto.subtle.digest('SHA-256'",'readZip','DecompressionStream']);
 });
 test('rolled-back fingerprints can be reviewed again without permitting active duplicate batches',()=>{
  hasAll(retryMigration,['drop constraint if exists capability_path_import_batches_batch_key_key','capability_path_import_batches_batch_key_idx']);
  hasAll(migration,['capability_path_import_batches_source_hash_idx',"where status <> 'rolled_back'"]);
 });
});
