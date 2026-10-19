import type {GithubMasterProject} from '@/lib/github-master-projects';
import {parseMetteloGithubRepository,validateGithubProjectManifest} from '@/lib/admin-github-project-import';
type PublishedRow={id:string;canonical_project_key:string|null;github_url:string|null;title:string;summary:string;problem_statement:string|null;status:string;visibility:string;applications_open:boolean|null};
type AuditRow={project_id:string;event_type?:string;metadata:unknown;created_at:string};
const PUBLIC_STATUSES=new Set(['open','forming','active','pilot','recruiting','review']);
export function buildExpandableCatalogue(base:GithubMasterProject[],rows:PublishedRow[],audits:AuditRow[]){
 const known=new Set(base.map(p=>p.id));
 const history=new Map<string,AuditRow>();
 const approved=new Map<string,AuditRow>();
 for(const audit of audits){
  const meta=audit.metadata&&typeof audit.metadata==='object'&&!Array.isArray(audit.metadata)?(audit.metadata as Record<string,unknown>).github_import:null;
  const info=meta&&typeof meta==='object'&&!Array.isArray(meta)?(meta as Record<string,unknown>):null;
  if(audit.event_type==='github_manifest_revision_approved'){
   if(!info||!Number.isSafeInteger(info.revision)||Number(info.revision)<2)continue;
   const previous=approved.get(audit.project_id);
   const previousMeta=previous?.metadata as Record<string,unknown>|undefined;
   const previousInfo=previousMeta?.github_import as Record<string,unknown>|undefined;
   if(!previous||Number(info.revision)>Number(previousInfo?.revision||0))approved.set(audit.project_id,audit);
  }else if(audit.event_type==='project_created'||!audit.event_type){
   if(!history.has(audit.project_id))history.set(audit.project_id,audit);
  }
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
  let p=verified.manifest;
  const revision=approved.get(row.id);
  const revisionMeta=revision?.metadata as Record<string,unknown>|undefined;
  const revisionInfo=revisionMeta?.github_import as Record<string,unknown>|undefined;
  if(revisionInfo&&Number(revisionInfo.revision)>Number(record.revision||1)
   &&revisionInfo.external_id===row.canonical_project_key&&revisionInfo.repository===repo.url){
   const next=validateGithubProjectManifest(revisionInfo.manifest_snapshot,repo.url);
   if(next.ok&&next.manifest&&next.manifest.id===row.canonical_project_key)p=next.manifest;
  }
  additions.push({...p,name:row.title,brief:row.summary,problem:row.problem_statement||p.problem,operationalId:row.id,applicationsOpen:row.applications_open===true});
  known.add(p.id);
 }
 return [...base,...additions.sort((a,b)=>a.id.localeCompare(b.id))];
}
