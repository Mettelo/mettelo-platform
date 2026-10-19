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
 assert.match(preview,/reserved by the pinned 50-project catalogue/);
 assert.doesNotMatch(preview,/\.insert\(|\.update\(|\.delete\(/);
});
test('existing project creation supports verified GitHub imports only behind disabled-by-default gate',()=>{
 const api=read('app/api/admin/projects/route.ts');
 assert.match(api,/METTELO_PHASE3_GITHUB_IMPORT_ENABLED/);
 assert.match(api,/fetchGithubProjectManifest/);
 assert.match(api,/canonical_project_key:manifest\?\.id/);
 assert.match(api,/reserved by the pinned 50-project catalogue/);
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
 assert.match(page,/\/admin\/projects\/github-import\/review/);
 const review=read('app/admin/projects/github-import/review/page.tsx');
 assert.ok(review.includes("user.app_metadata?.role!=='admin'"));
 assert.match(read('components/AdminGithubProjectReview.tsx'),/\/admin\/content#publisher/);
});
test('production activation remains blocked until migration review and owner approval',()=>{
 const doc=read('docs/PHASE-3-ADMIN-GITHUB-IMPORT.md');
 assert.match(doc,/unique partial indexes/);
 assert.match(doc,/versioned expandable catalogue projection/);
 assert.match(doc,/Do not enable any of them or apply either migration without explicit Production change approval/);
});

test('repository change preview is read-only, admin-only and refuses project identity changes',()=>{
 const preview=read('app/api/admin/projects/github-revision-preview/route.ts');
 const review=read('components/AdminGithubProjectReview.tsx');
 assert.ok(preview.includes("user.app_metadata?.role!=='admin'"));
 assert.match(preview,/fetchGithubProjectManifest/);
 assert.match(preview,/Repository identity cannot change/);
 assert.match(preview,/changed_fields:changedFields/);
 assert.match(preview,/applied:false/);
 assert.doesNotMatch(preview,/\.insert\(|\.update\(|\.delete\(/);
 assert.match(review,/Check GitHub changes/);
 assert.match(review,/github-revision-preview/);
});

test('draft revision approval requires explicit admin confirmation and an atomic gated database RPC',()=>{
 const endpoint=read('app/api/admin/projects/github-revision-approve/route.ts');
 const sql=read('supabase/migrations/20261018010000_phase3_github_revision_approval.sql');
 const preview=read('app/api/admin/projects/github-revision-preview/route.ts');
 assert.ok(endpoint.includes("user.app_metadata?.role!=='admin'"));
 assert.match(endpoint,/METTELO_PHASE3_GITHUB_REVISION_APPROVAL_ENABLED/);
 assert.match(endpoint,/APPROVE_GITHUB_REVISION/);
 assert.match(endpoint,/expected_blob_sha/);
 assert.match(endpoint,/phase3_approve_github_revision/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/Stale GitHub manifest revision/);
 assert.match(sql,/Only private drafts/);
 assert.match(sql,/REVOKE ALL ON FUNCTION[^;]*FROM PUBLIC, anon, authenticated;/);
 assert.match(sql,/GRANT EXECUTE/);
 assert.match(preview,/current_revision:current.revision/);
});
