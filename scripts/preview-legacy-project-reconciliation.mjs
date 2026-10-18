// Read-only Phase 2D categorisation for an exported, deliberately minimised dataset.
// Input: JSON array of {id, canonical_project_key, dependent_counts:{...}}.
// Never opens a network connection or contains write SQL.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const protectedKeys=['project_applications','project_runs','project_members','project_offers','project_tasks','project_discussions','notifications','project_activity_log'];
export function classifyLegacyProjects(rows) {
 const errors=[],items=[],ids=new Set();
 if(!Array.isArray(rows))return {ok:false,errors:['Expected an array.'],items:[]};
 for(const [i,p] of rows.entries()){
  if(!p||typeof p.id!=='string'||!p.id.trim()||ids.has(p.id)){errors.push('Invalid or duplicate project identifier at index '+i);continue}
  ids.add(p.id);
  if(!p.dependent_counts||typeof p.dependent_counts!=='object'){errors.push('Missing dependency evidence for '+p.id);continue}
  const entries=Object.entries(p.dependent_counts);
  if(entries.length===0||entries.some(([k,v])=>!k||!Number.isSafeInteger(v)||v<0)){errors.push('Incomplete or invalid counts for '+p.id);continue}
  const missing=protectedKeys.filter(k=>!Object.hasOwn(p.dependent_counts,k));
  if(missing.length){errors.push('Missing protected families for '+p.id+': '+missing.join(', '));continue}
  const active=entries.some(([,v])=>v>0);
  items.push({id:p.id,canonicalKey:p.canonical_project_key??null,hasDependencies:active,proposedDisposition:active?'retain_historical_access':'manual_dependency_review',safeToDelete:false});
 }
 return {ok:errors.length===0,errors,total:rows.length,classified:items.length,withDependencies:items.filter(x=>x.hasDependencies).length,needsFullReview:items.filter(x=>!x.hasDependencies).length,items};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const file=process.argv[2];if(!file)throw Error('Usage: node scripts/preview-legacy-project-reconciliation.mjs <minimised-export.json>');
 const out=classifyLegacyProjects(JSON.parse(readFileSync(resolve(file),'utf8')));console.log(JSON.stringify(out,null,2));if(!out.ok)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1}
}
