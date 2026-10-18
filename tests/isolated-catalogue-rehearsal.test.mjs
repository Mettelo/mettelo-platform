import test from 'node:test';
import assert from 'node:assert/strict';
import {buildIsolatedCatalogueSql} from '../scripts/generate-isolated-catalogue-rehearsal.mjs';
const sha='a'.repeat(40);
const rows=()=>Array.from({length:50},(_,i)=>({
 id:'MTL-DA-'+String(i+1).padStart(3,'0'),name:"Test ' "+i,brief:'A meaningful brief',
 problem:'Problem',sector:'Banking',track:'Data Analytics',roles:['Analyst'],
 capabilities:['SQL'],repository:'https://github.com/Mettelo/example-'+i,status:'Available',
 use_case:'',data_source:''
}));
test('50 rows produce deterministic rollback-only rehearsal SQL',()=>{
 const a=buildIsolatedCatalogueSql(rows(),sha);
 const b=buildIsolatedCatalogueSql(rows().reverse(),sha);
 assert.equal(a.ok,true);
 assert.equal(a.recordCount,50);
 assert.equal(a.transactionMode,'rollback');
 assert.equal(a.sql,b.sql);
 assert.match(a.sql,/BEGIN;/);
 assert.match(a.sql,/ROLLBACK;\s*$/);
 assert.doesNotMatch(a.sql,/\nCOMMIT;/);
 assert.match(a.sql,/jsonb_to_recordset/);
 assert.match(a.sql,/count\(\*\)/);
 assert.match(a.sql,/Test '' 0/);
 assert.doesNotMatch(a.sql,/DELETE FROM public\.projects|UPDATE public\.projects|DROP TABLE/i);
});
test('commit requires two explicit acknowledgements',()=>{
 assert.equal(buildIsolatedCatalogueSql(rows(),sha,{commit:true}).ok,false);
 const r=buildIsolatedCatalogueSql(rows(),sha,{commit:true,isolatedTarget:true});
 assert.equal(r.ok,true);
 assert.equal(r.transactionMode,'commit');
 assert.match(r.sql,/COMMIT;\s*$/);
});
test('bad source and incomplete catalogue produce no SQL',()=>{
 const a=buildIsolatedCatalogueSql(rows(),'main');
 assert.equal(a.ok,false);
 assert.equal(a.sql,undefined);
 const b=buildIsolatedCatalogueSql(rows().slice(1),sha);
 assert.equal(b.ok,false);
 assert.equal(b.sql,undefined);
});
test('SQL content is a literal, never executable source SQL',()=>{
 const r=rows();
 r[0].name="Name'); DROP TABLE public.projects; --";
 const result=buildIsolatedCatalogueSql(r,sha);
 assert.equal(result.ok,true);
 assert.match(result.sql,/Name''\); DROP TABLE public\.projects; --/);
 assert.match(result.sql,/ROLLBACK;\s*$/);
});
