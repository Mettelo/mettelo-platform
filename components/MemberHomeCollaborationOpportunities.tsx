import Link from 'next/link';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import styles from './MemberHomeCollaborationOpportunities.module.css';

type Need={id:string;project_id:string;project_run_id:string;target_role_catalogue_id:string|null;target_domain_id:string|null;weekly_commitment:string|null;responsibility:string|null;created_at:string};
type Capacity={available?:number;capacity_available?:boolean};
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
function norm(value:string){return value.trim().toLowerCase()}

export default async function MemberHomeCollaborationOpportunities(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return null;const db=serviceDb();if(!db)return null;
 const [{data:profile},{data:domains},{data:needs},{data:memberships},{data:applications}]=await Promise.all([
  auth.from('profiles').select('skills,preferred_roles').eq('id',user.id).maybeSingle(),
  auth.from('profile_domain_preferences').select('domain_id').eq('user_id',user.id),
  auth.from('project_collaboration_needs').select('id,project_id,project_run_id,target_role_catalogue_id,target_domain_id,weekly_commitment,responsibility,created_at').eq('status','active').order('created_at',{ascending:false}).limit(24),
  auth.from('project_members').select('project_id').eq('user_id',user.id).in('membership_status',['waiting','active','completed']),
  auth.from('project_applications').select('project_id,status').eq('user_id',user.id).not('status','in','(declined,withdrawn)')
 ]);
 const excluded=new Set([...(memberships||[]).map(item=>String(item.project_id)),...(applications||[]).map(item=>String(item.project_id))]);const domainIds=new Set((domains||[]).map(item=>String(item.domain_id)));const skillSet=new Set((Array.isArray(profile?.skills)?profile.skills:[]).map(item=>norm(String(item))));const rolePrefs=(Array.isArray(profile?.preferred_roles)?profile.preferred_roles:[]).map(item=>norm(String(item)));
 const candidates=[] as {id:string;projectId:string;title:string;summary:string|null;role:string;commitment:string|null;openPlaces:number;score:number;createdAt:string}[];
 for(const need of (needs||[]) as Need[]){
  if(excluded.has(need.project_id))continue;
  const [{data:project},{data:run},{data:role},{data:links},capacityResult]=await Promise.all([
   db.from('projects').select('id,title,summary,status,visibility,weekly_commitment,late_joining_enabled,late_joining_cutoff_at').eq('id',need.project_id).maybeSingle(),
   db.from('project_runs').select('id,status,recruitment_open').eq('id',need.project_run_id).eq('project_id',need.project_id).maybeSingle(),
   need.target_role_catalogue_id?db.from('project_role_catalogue').select('title').eq('id',need.target_role_catalogue_id).eq('active',true).maybeSingle():Promise.resolve({data:null}),
   db.from('project_collaboration_need_capabilities').select('capability_id,capabilities(name)').eq('collaboration_need_id',need.id),
   db.rpc('phase9_project_run_capacity',{p_project_id:need.project_id,p_run_id:need.project_run_id})
  ]);
  if(!project||!run||!['public','members'].includes(project.visibility)||['completed','cancelled','archived'].includes(project.status)||!['forming','active'].includes(run.status)||run.recruitment_open===false)continue;const cutoffClosed=Boolean(project.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());if(run.status==='active'&&(project.late_joining_enabled===false||cutoffClosed))continue;const capacity=one(capacityResult.data as Capacity|Capacity[]|null);if(!capacity||capacity.capacity_available!==true||Number(capacity.available||0)<1)continue;
  const roleLabel=role?.title||need.responsibility||'Project collaborator';let score=0;if(need.target_domain_id&&domainIds.has(need.target_domain_id))score+=3;if(rolePrefs.some(pref=>norm(roleLabel).includes(pref)||pref.includes(norm(roleLabel))))score+=2;for(const link of links||[]){const capability=one((link as {capabilities:{name:string}|{name:string}[]|null}).capabilities);if(capability&&skillSet.has(norm(capability.name))){score+=1;break}}if(run.status==='forming')score+=1;
  candidates.push({id:need.id,projectId:need.project_id,title:project.title,summary:project.summary,role:roleLabel,commitment:need.weekly_commitment||project.weekly_commitment||null,openPlaces:Number(capacity.available||0),score,createdAt:need.created_at});
 }
 const items=candidates.sort((a,b)=>b.score-a.score||new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,3);if(!items.length)return null;
 return <section className={styles.section} aria-labelledby="member-collaboration-opportunities-title"><div className={styles.head}><div><div className={styles.eyebrow}>COLLABORATOR NEEDED</div><h2 id="member-collaboration-opportunities-title">Projects looking for people like you</h2><p>A small selection of active collaboration needs, ranked from your profile context. Nothing here creates membership automatically.</p></div><Link href="/member/find-a-team">Find a team →</Link></div><div className={styles.grid}>{items.map(item=><article className={styles.card} key={item.id}><small>{item.role}</small><h3>{item.title}</h3>{item.summary&&<p>{item.summary}</p>}<div className={styles.meta}><span>{item.openPlaces} place{item.openPlaces===1?'':'s'} open</span>{item.commitment&&<span>{item.commitment}</span>}</div><Link href={`/member/discover/${item.projectId}?collaboration_need=${encodeURIComponent(item.id)}`}>View collaborator need →</Link></article>)}</div></section>;
}