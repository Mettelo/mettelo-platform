import {serviceDb} from '@/lib/project-flow';
import {getGithubMasterProjects,type GithubMasterProject} from '@/lib/github-master-projects';
import {parseMetteloGithubRepository,validateGithubProjectManifest} from '@/lib/admin-github-project-import';

type PublishedRow={id:string;canonical_project_key:string|null;github_url:string|null;title:string;summary:string;problem_statement:string|null;status:string;visibility:string;applications_open:boolean|null};
type AuditRow={project_id:string;metadata:unknown;created_at:string};
const PUBLIC_STATUSES=new Set(['open','forming','active','pilot','recruiting','review']);
export function isExpandableCatalogueEnabled(){
 return process.env.METTELO_PHASE3_EXPANDABLE_CATALOGUE_ENABLED==='true';
}
export function buildExpandableCatalogue(base:GithubMasterProject[],rows:PublishedRow[],audits:AuditRow[]){
 const known=new Set(base.map(p=>p.id));
 const history=new Map<string,AuditRow>();
 for(const audit of audits){
  if(!history.has(audit.project_id))history.set(audit.project_id,audit);
 }
 const additions:GithubMasterProject[]=[];
 for(const row of rows){
  if(row.visibility!=='public'||!PUBLIC_STATUSES.has(row.status)||!row.canonical_project_key||known.has(row.canonical_project_key))continue;
  const repo=parseMetteloGithubRepository(row.github_url);
  if(!repo)continue;
  const meta=history.get(row.id)?.metadata;
  const snapshot=meta&&typeof meta==='object'&&!Array.isArray(meta)?(meta as Record<string,unknown>).github_import:null;
  const record=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?(snapshot as Record<string,unknown>):null;
  if(!record||record.external_id!==row.canonical_project_key||record.repository!==repo.url)continue;
  const verified=validateGithubProjectManifest(record.manifest_snapshot,repo.url);
  if(!verified.ok||!verified.manifest||verified.manifest.id!==row.canonical_project_key)continue;
  const p=verified.manifest;
  additions.push({...p,name:row.title,brief:row.summary,problem:row.problem_statement||p.problem,operationalId:row.id,applicationsOpen:row.applications_open===true});
  known.add(p.id);
 }
 return [...base,...additions.sort((a,b)=>a.id.localeCompare(b.id))];
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
