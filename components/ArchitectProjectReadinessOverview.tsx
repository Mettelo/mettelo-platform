import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import styles from './ArchitectProjectReadinessOverview.module.css';

type Readiness={project_id:string;critical_missing:string[]|null;quality_gaps:string[]|null;verification_required:string[]|null;red_resource_blockers:string[]|null;publication_ready:boolean;application_ready:boolean;resource_governance_ready:boolean;lab_ready:boolean};
type Project={id:string;title:string;governance_status:string;visibility:string;status:string;updated_at:string};
type Assignment={project_id:string;assignment_role:string;projects:Project|Project[]|null};
function one<T>(value:T|T[]|null){return Array.isArray(value)?value[0]||null:value}
function count(value:string[]|null|undefined){return Array.isArray(value)?value.length:0}
function label(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}

export default async function ArchitectProjectReadinessOverview(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return null;
  const {data:identity}=await auth.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();
  if(identity?.account_type!=='project_architect'&&user.app_metadata?.role!=='admin')return null;
  const db=serviceDb();if(!db)return null;
  const {data:assignmentRows}=await db.from('project_architect_assignments').select('project_id,assignment_role,projects(id,title,governance_status,visibility,status,updated_at)').eq('user_id',user.id).eq('assignment_status','active').order('assigned_at',{ascending:false});
  const assignments=(assignmentRows||[]) as unknown as Assignment[];
  const projectIds=[...new Set(assignments.map(item=>item.project_id))];
  if(!projectIds.length)return null;
  const {data:readinessRows}=await db.from('project_experience_readiness').select('project_id,critical_missing,quality_gaps,verification_required,red_resource_blockers,publication_ready,application_ready,resource_governance_ready,lab_ready').in('project_id',projectIds);
  const readiness=new Map(((readinessRows||[]) as Readiness[]).map(item=>[item.project_id,item]));

  return <section className={styles.overview} aria-labelledby="architect-readiness-title">
    <header><div><span>PROJECT EXPERIENCE V2 · READINESS</span><h2 id="architect-readiness-title">Canonical project completeness</h2><p>See whether the project definition is ready for application, resource governance, publication and Lab before you submit or activate it.</p></div><strong>{projectIds.length} project{projectIds.length===1?'':'s'}</strong></header>
    <div className={styles.grid}>{assignments.map(assignment=>{const project=one(assignment.projects);if(!project)return null;const item=readiness.get(project.id);const critical=count(item?.critical_missing),quality=count(item?.quality_gaps),verification=count(item?.verification_required)+count(item?.red_resource_blockers);return <article className={styles.card} key={`${assignment.assignment_role}:${project.id}`}><div className={styles.cardTop}><span>{label(assignment.assignment_role)}</span><b>{label(project.governance_status)}</b></div><h3>{project.title}</h3><div className={styles.states}><State label="Application" ready={Boolean(item?.application_ready)}/><State label="Resources" ready={Boolean(item?.resource_governance_ready)}/><State label="Publication" ready={Boolean(item?.publication_ready)}/><State label="Lab" ready={Boolean(item?.lab_ready)}/></div><dl><div><dt>Critical missing</dt><dd>{critical}</dd></div><div><dt>Quality gaps</dt><dd>{quality}</dd></div><div><dt>Resource reviews</dt><dd>{verification}</dd></div><div><dt>Last updated</dt><dd>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(project.updated_at))}</dd></div></dl>{critical+quality+verification>0?<div className={styles.gaps}>{item?.critical_missing?.slice(0,3).map(gap=><span key={gap}>{label(gap)}</span>)}{item?.quality_gaps?.slice(0,2).map(gap=><span key={gap}>{label(gap)}</span>)}{verification>0&&<span>Resource governance</span>}</div>:<p className={styles.ready}>Canonical content checks are clear. Lifecycle/governance approval is still required.</p>}</article>})}</div>
  </section>;
}
function State({label:stateLabel,ready}:{label:string;ready:boolean}){return <div data-ready={ready?'true':'false'}><span aria-hidden="true">{ready?'✓':'!'}</span><strong>{stateLabel}</strong><small>{ready?'Ready':'Needs attention'}</small></div>}
