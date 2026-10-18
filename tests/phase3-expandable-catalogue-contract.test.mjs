import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('expansion is opt-in and only projects with public visibility, published status and validated audit snapshots enter discovery',()=>{
 const src=read('lib/github-catalogue-projection.ts');
 const loader=read('lib/expandable-github-catalogue.ts');
 assert.match(loader,/METTELO_PHASE3_EXPANDABLE_CATALOGUE_ENABLED/);
 assert.match(src,/row.visibility!=='public'/);
 assert.match(src,/PUBLIC_STATUSES.has\(row.status\)/);
 assert.match(src,/known.has\(row.canonical_project_key\)/);
 assert.match(src,/validateGithubProjectManifest\(record.manifest_snapshot,repo.url\)/);
 assert.match(loader,/project_created/);
 assert.match(loader,/\.eq\('visibility','public'\)/);
 assert.match(loader,/getGithubMasterProjects\(\)/);
});
test('existing member and public catalogue and detail route use expandable projection',()=>{
 for(const path of ['app/projects/page.tsx','app/member/discover/page.tsx']){
  assert.match(read(path),/await getExpandableGithubProjects\(\)/);
 }
 const detail=read('app/projects/master/[id]/page.tsx');
 assert.match(detail,/await getExpandableGithubProject\(id\)/);
 assert.match(detail,/project.operationalId&&project.applicationsOpen/);
 assert.match(detail,/\/projects\/\$\{project.operationalId\}/);
});
test('admin import saves manifest snapshot to audit and database indexes prevent races',()=>{
 const admin=read('app/api/admin/projects/route.ts');
 const sql=read('supabase/migrations/20261018000000_phase3_github_project_uniqueness.sql');
 assert.match(admin,/manifest_snapshot:manifest/);
 assert.match(admin,/METTELO_PHASE3_GITHUB_IMPORT_ENABLED/);
 assert.match(sql,/CREATE UNIQUE INDEX/);
 assert.match(sql,/canonical_project_key/);
 assert.match(sql,/lower\(trim\(trailing '\/' FROM github_url\)\)/);
});
