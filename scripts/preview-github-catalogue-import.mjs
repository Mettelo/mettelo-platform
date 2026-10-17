#!/usr/bin/env node
// Phase 2C: local-only catalogue import preview. Never connects to Supabase or writes files.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {validateCatalogue} from './validate-github-first-catalogue.mjs';
export function previewCatalogueImport(rows, sourceCommit) {
  const check=validateCatalogue(rows);
  if(!check.ok)return {ok:false,errors:check.errors,warnings:check.warnings};
  if(!/^[a-f0-9]{40}$/.test(sourceCommit))return {ok:false,errors:['Source commit must be a pinned 40-character Git SHA.'],warnings:check.warnings};
  const sorted=[...rows].sort((a,b)=>a.id.localeCompare(b.id));
  const digest=createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return {ok:true,sourceCommit,recordCount:sorted.length,contentSha256:digest,externalIds:sorted.map(row=>row.id),warnings:check.warnings,operations:{catalogueStageCandidates:sorted.length,legacyProjectUpdates:0,legacyProjectDeletes:0,projectRunUpdates:0,productionWrites:0}};
}
if(process.argv[1]===new URL(import.meta.url).pathname){
  const [file,sha]=process.argv.slice(2);
  if(!file||!sha){console.error('Usage: node scripts/preview-github-catalogue-import.mjs <projects.json> <pinned-commit-sha>');process.exitCode=2}
  else try{const r=previewCatalogueImport(JSON.parse(readFileSync(resolve(file),'utf8')),sha);console.log(JSON.stringify(r,null,2));if(!r.ok)process.exitCode=1}catch(e){console.error('Dry run failed:',e.message);process.exitCode=1}
}
