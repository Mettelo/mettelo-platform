import {serviceDb} from '@/lib/project-flow';
import {getGithubMasterProjects} from '@/lib/github-master-projects';
import {buildExpandableCatalogue} from '@/lib/github-catalogue-projection';
export {buildExpandableCatalogue} from '@/lib/github-catalogue-projection';
export function isExpandableCatalogueEnabled(){
 return process.env.METTELO_PHASE3_EXPANDABLE_CATALOGUE_ENABLED==='true';
}
export async function getExpandableGithubProjects(){
 const base=getGithubMasterProjects();
 if(!isExpandableCatalogueEnabled())return base;
 const db=serviceDb();
 if(!db)throw new Error('Expandable catalogue data service is not configured');
 const {data:rows,error}=await db.from('projects').select('id,canonical_project_key,github_url,title,summary,problem_statement,status,visibility,applications_open').eq('visibility','public').not('canonical_project_key','is',null).not('github_url','is',null).limit(5000);
 if(error)throw new Error('Unable to load approved operational projects');
 const ids=(rows||[]).filter(r=>r.canonical_project_key&&!base.some(p=>p.id===r.canonical_project_key)).map(r=>r.id);
 if(!ids.length)return base;
 const audits:AuditRow[]=[];
 for(let start=0;start<ids.length;start+=100){
  const {data,error:auditError}=await db.from('project_activity_log').select('project_id,metadata,created_at').in('project_id',ids.slice(start,start+100)).eq('event_type','project_created').order('created_at',{ascending:true}).limit(5000);
  if(auditError)throw new Error('Unable to validate GitHub project provenance');
  audits.push(...(data||[]));
 }
 return buildExpandableCatalogue(base,rows||[],audits);
}
export async function getExpandableGithubProject(id:string){
 return (await getExpandableGithubProjects()).find(p=>p.id===id)||null;
}
