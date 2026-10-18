import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('admin-only GitHub preview uses fixed GitHub API host and server-side manifest validation',()=>{
 const helper=read('lib/admin-github-project-import.ts');
 const preview=read('app/api/admin/projects/github-preview/route.ts');
 assert.match(helper,/https:\/\/api\.github\.com\/repos\/Mettelo\//);
 assert.match(helper,/mettelo-project\.json/);
 assert.match(helper,/redirect:'error'/);
 assert.match(helper,/validateGithubProjectManifest/);
 assert.match(preview,/user\.app_metadata\?\.role!=='admin'/);
 assert.match(preview,/fetchGithubProjectManifest/);
 assert.doesNotMatch(preview,/\.insert\(|\.update\(|\.delete\(/);
});
test('existing project creation supports verified GitHub imports only behind disabled-by-default gate',()=>{
 const api=read('app/api/admin/projects/route.ts');
 assert.match(api,/METTELO_PHASE3_GITHUB_IMPORT_ENABLED/);
 assert.match(api,/fetchGithubProjectManifest/);
 assert.match(api,/canonical_project_key:manifest\?\.id/);
 assert.match(api,/github_url:manifest\?\.repository/);
 assert.match(api,/status:'draft',visibility:'private'/);
 assert.match(api,/applications_open:false/);
 assert.match(api,/GitHub import currently supports Open Project drafts only/);
 assert.match(api,/if\(auditError\)/);
 assert.match(api,/GitHub import draft cleanup failed/);
 assert.match(api,/canonical_project_key\.eq\./);
});
test('admin import page is discoverable, supports preview, and retains manual creation route',()=>{
 const home=read('app/admin/page.tsx');
 const page=read('components/AdminGithubProjectImport.tsx');
 const guard=read('app/admin/projects/github-import/page.tsx');
 assert.ok(guard.includes("user.app_metadata?.role!=='admin'"));
 assert.match(home,/\/admin\/projects\/github-import/);
 assert.match(home,/\/admin\/content#publisher/);
 assert.match(page,/github-preview/);
 assert.match(page,/Create private draft/);
 assert.match(page,/\/admin\/content#publisher/);
});
test('future publishing is explicitly blocked until database uniqueness and persistent catalogue exist',()=>{
 const doc=read('docs/PHASE-3-ADMIN-GITHUB-IMPORT.md');
 assert.match(doc,/unique partial index/);
 assert.match(doc,/persistent versioned master catalogue/);
 assert.match(doc,/Do not enable/);
});
