// Phase 2 discovery projection contract; pure function, no DB access.
// The public discovery collection is 50 approved master projects.
// Historical project IDs remain addressable by existing authorised routes,
// never merged into the public discovery list or deleted.
import {validateCatalogue} from './validate-github-first-catalogue.mjs';
export function buildDiscoveryProjection(masterRows,legacyRows,{approved=false}={}){
 const errors=[];
 const validation=validateCatalogue(masterRows);
 if(!validation.ok)errors.push(...validation.errors);
 if(!Array.isArray(legacyRows))errors.push('Historical project index must be an array.');
 const history=new Map();
 if(Array.isArray(legacyRows))for(const [i,p] of legacyRows.entries()){
   if(!p||typeof p.id!=='string'||!p.id.trim()||history.has(p.id)){
     errors.push('Invalid or duplicate historical project ID at '+i);continue;
   }
   history.set(p.id,{id:p.id,existingRecord:true});
 }
 if(!approved)errors.push('Discovery switch requires explicit approval.');
 if(errors.length)return {ok:false,errors,discovery:[],historicalIndex:[]};
 const discovery=masterRows.map(({id,name,brief,track,roles,capabilities,repository,sector,status})=>({id,name,brief,track,roles,capabilities,repository,sector,status}));
 return {ok:true,discovery,discoveryCount:discovery.length,historicalIndex:[...history.values()],historicalCount:history.size,legacyDeletes:0,legacyUpdates:0};
}
