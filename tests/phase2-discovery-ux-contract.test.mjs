import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('master discovery has search, six track facets, pagination and member portfolio navigation',()=>{
 const ui=read('components/GithubMasterCatalogue.tsx');
 assert.match(ui,/PAGE_SIZE=12/);
 assert.match(ui,/type="search"/);
 assert.match(ui,/aria-label="Filter master projects"/);
 assert.match(ui,/aria-live="polite"/);
 assert.match(ui,/value={track}/);
 assert.match(ui,/filtered\.slice/);
 assert.match(ui,/href="\/member\/projects"/);
 assert.match(ui,/Clear filters/);
 assert.match(ui,/role="status"/);
});
test('browser acceptance test explicitly requires the gated local or staging mode',()=>{
 const browser=read('tests/phase2-50-master-discovery-browser.spec.ts');
 assert.match(browser,/METTELO_PHASE2_CATALOGUE_MODE/);
 assert.match(browser,/toHaveCount\(12\)/);
 assert.match(browser,/Cybersecurity Framework Change Intelligence Assistant/);
});
