import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateCatalogue} from '../scripts/validate-github-first-catalogue.mjs';
import {previewCatalogueImport} from '../scripts/preview-github-catalogue-import.mjs';
import {buildDiscoveryProjection} from '../scripts/build-phase2-discovery-projection.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const rows=JSON.parse(read('data/github-master-projects.json'));
const sha='65dc740ac1c6c8f88868863a6772150c1a5a12f7';
test('pinned source has precisely 50 valid unique GitHub master projects',()=>{
 const v=validateCatalogue(rows);
 assert.equal(v.ok,true,v.errors.join('\n'));
 assert.equal(rows.length,50);
 assert.equal(previewCatalogueImport(rows,sha).ok,true);
});
test('approved public projection retains historical identity outside discovery',()=>{
 const history=Array.from({length:305},(_,i)=>({id:'historic-'+i}));
 const p=buildDiscoveryProjection(rows,history,{approved:true});
 assert.equal(p.ok,true,p.errors?.join('\n'));
 assert.equal(p.discoveryCount,50);
 assert.equal(p.historicalCount,305);
 assert.equal(p.legacyDeletes,0);
 assert.equal(p.legacyUpdates,0);
});
test('public and member discovery use same explicit opt-in and retain legacy code paths',()=>{
 const pub=read('app/projects/page.tsx'),member=read('app/member/discover/page.tsx');
 for(const source of [pub,member]){
  assert.match(source,/isGithubMasterDiscoveryEnabled\(\)/);
  assert.match(source,/GithubMasterCatalogue/);
  assert.match(source,/getGithubMasterProjects\(\)/);
 }
 assert.match(pub,/loadPublicProjectCatalogue/);
 assert.match(member,/loadMemberDiscoverProjects/);
 assert.ok(member.indexOf("if(!user)redirect(")<member.indexOf("if(isGithubMasterDiscoveryEnabled())"));
});
test('master detail does not replace legacy details or claim application availability',()=>{
 const master=read('app/projects/master/[id]/page.tsx');
 assert.match(master,/if\(!isGithubMasterDiscoveryEnabled\(\)\)notFound\(\)/);
 assert.match(master,/Applications for this catalogue are not enabled yet/);
 assert.match(read('app/projects/[id]/page.tsx'),/getPublicProject/);
 assert.match(read('app/member/discover/[id]/page.tsx'),/getProjectDetailContent/);
});
