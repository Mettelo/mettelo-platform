import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import styles from './AdminProjectPulseHealth.module.css';

type Health={active_members:number;submissions:number;blocked:number;heavy:number;unsustainable:number;some_friction:number;significant_concern:number;support_maybe:number;support_yes:number};
type Row={runId:string;projectId:string;projectTitle:string;runNumber:number|null;health:Health};

function mondayUtc(value=new Date()){
 const date=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));
 const day=date.getUTCDay()||7;
 date.setUTCDate(date.getUTCDate()-day+1);
 return date.toISOString().slice(0,10);
}

export default async function AdminProjectPulseHealth(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user||user.app_metadata?.role!=='admin')return null;
 const db=serviceDb();
 if(!db)return <section className={styles.panel}><p role="alert">Project pulse health is unavailable because the Admin data service is not configured.</p></section>;
 const periodStart=mondayUtc();
 const {data:runs,error}=await db.from('project_runs').select('id,project_id,run_number').eq('status','active').order('run_number',{ascending:true});
 if(error)return <section className={styles.panel}><p role="alert">Unable to load active project runs for weekly pulse health.</p></section>;
 const projectIds=[...new Set((runs||[]).map(run=>run.project_id))];
 const {data:projects}=projectIds.length?await db.from('projects').select('id,title').in('id',projectIds):{data:[] as {id:string;title:string}[]};
 const names=new Map((projects||[]).map(project=>[project.id,project.title]));
 const rows:Row[]=[];
 for(const run of runs||[]){
  const {data,error:healthError}=await auth.rpc('project_weekly_pulse_health',{target_project:run.project_id,target_run:run.id,target_period:periodStart});
  if(healthError)continue;
  const health=(Array.isArray(data)?data[0]:data) as Health|null;
  if(health)rows.push({runId:run.id,projectId:run.project_id,projectTitle:names.get(run.project_id)||'Mettelo project',runNumber:run.run_number,health});
 }
 const periodLabel=new Date(`${periodStart}T00:00:00Z`).toLocaleDateString('en-GB',{dateStyle:'medium',timeZone:'UTC'});
 return <section className={styles.panel} aria-labelledby="admin-pulse-health-heading">
  <div className={styles.head}><div><span>WEEKLY PROJECT PULSE</span><h2 id="admin-pulse-health-heading">Team health signals</h2><p>Operational counts for active project runs. Individual responses, member identities and private notes are not shown here.</p></div><small>Week of {periodLabel}</small></div>
  {rows.length?<div className={styles.grid}>{rows.map(row=>{
   const missing=Math.max(0,Number(row.health.active_members)-Number(row.health.submissions));
   const workloadRisk=Number(row.health.heavy)+Number(row.health.unsustainable);
   const teamConcern=Number(row.health.some_friction)+Number(row.health.significant_concern);
   const support=Number(row.health.support_maybe)+Number(row.health.support_yes);
   return <article className={styles.card} key={row.runId}>
    <div className={styles.cardHead}><div><strong>{row.projectTitle}</strong><span>{row.runNumber?`Team ${row.runNumber}`:'Active run'}</span></div><a href={`/member/projects/${row.projectId}?run=${row.runId}#mettelo-lab`}>Open project →</a></div>
    <dl><Metric label="Submitted" value={`${row.health.submissions}/${row.health.active_members}`}/><Metric label="Missing" value={missing}/><Metric label="Blocked" value={row.health.blocked}/><Metric label="Heavy / unsustainable" value={workloadRisk}/><Metric label="Team friction / concern" value={teamConcern}/><Metric label="Support maybe / yes" value={support}/></dl>
   </article>
  })}</div>:<p>No active project runs are available for this week’s pulse health view.</p>}
 </section>;
}

function Metric({label,value}:{label:string;value:string|number}){return <div><dt>{label}</dt><dd>{value}</dd></div>}
