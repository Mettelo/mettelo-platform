import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDiscoveryProjection} from '../scripts/build-phase2-discovery-projection.mjs';
const masters=()=>Array.from({length:50},(_,i)=>({id:'MTL-DA-'+String(i+1).padStart(3,'0'),name:'Master '+i,brief:'A meaningful brief',problem:'A problem',sector:'Banking',track:'Data Analytics',roles:['Analyst'],capabilities:['SQL'],repository:'https://github.com/Mettelo/example-'+i,status:'Available'}));
test('no unapproved public cutover',()=>{const r=buildDiscoveryProjection(masters(),[{id:'legacy'}]);assert.equal(r.ok,false);assert.equal(r.discovery.length,0)});
test('approved projection has exactly 50 and preserves historical identifiers',()=>{
 const old=Array.from({length:305},(_,i)=>({id:'legacy-'+i}));
 const result=buildDiscoveryProjection(masters(),old,{approved:true});
 assert.equal(result.ok,true);
 assert.equal(result.discoveryCount,50);
 assert.equal(result.historicalCount,305);
 assert.equal(result.legacyDeletes,0);
 assert.equal(result.legacyUpdates,0);
 assert.equal(result.discovery.some(p=>p.id.startsWith('legacy-')),false);
 assert.equal(result.historicalIndex[304].id,'legacy-304');
});
test('invalid source and duplicate historical identity fail closed',()=>{
 assert.equal(buildDiscoveryProjection(masters().slice(1),[],{approved:true}).ok,false);
 assert.equal(buildDiscoveryProjection(masters(),[{id:'x'},{id:'x'}],{approved:true}).ok,false);
});
