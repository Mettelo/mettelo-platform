import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import ProjectTeamRecoveryControls from './ProjectTeamRecoveryControls';
import styles from './ProjectTeamRecoverySection.module.css';

type Handover={id:string;reason_category:string;completed_work:string|null;open_work:string|null;file_references:string|null;decisions:string|null;risks:string|null;recommendations:string|null;open_responsibilities:string|null;handover_availability:string|null;created_at:string;departing_user_id:string};
const reasonLabel=(value:string)=>({availability_changed:'Availability changed',workload:'Workload',personal_circumstances:'Personal circumstances',role_fit:'Role or fit',technical_access:'Technical or access issue',other:'Other'}[value]||'Project availability changed');

export default async function ProjectTeamRecoverySection({projectId,projectRunId,currentUserId,runStatus}:{projectId:string;projectRunId:string;currentUserId:string;runStatus:string}){
 if(runStatus!=='active')return null;
 const db=serviceDb();if(!db)return null;
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 const [{data:run},{data:membership}]=await Promise.all([
  db.from('project_runs').select('replacement_needed,lead_replacement_needed,replacement_requested_at,recruitment_open').eq('id',projectRunId).eq('project_id',projectId).maybeSingle(),
  db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',projectRunId).eq('user_id',currentUserId).maybeSingle()
 ]);
 if(!run)return null;
 const isSelf=user?.id===currentUserId;
 const isAdmin=isSelf&&hasAdminCapability(user,'projects.manage');
 const isActive=isSelf&&membership?.membership_status==='active';
 if(!isAdmin&&!isActive)return null;
 const {data:handovers}=await db.from('project_member_handovers').select('id,reason_category,completed_work,open_work,file_references,decisions,risks,recommendations,open_responsibilities,handover_availability,created_at,departing_user_id').eq('project_id',projectId).eq('project_run_id',projectRunId).order('created_at',{ascending:false}).limit(5);
 const canRecover=isAdmin||(isActive&&membership?.team_role==='project_lead');
 const rows=(handovers||[]) as Handover[];
 if(!run.replacement_needed&&!run.lead_replacement_needed&&!rows.length)return null;
 return <section className={styles.panel} aria-labelledby="team-recovery-title">
  <div className={styles.heading}><span>TEAM RECOVERY</span><h3 id="team-recovery-title">Delivery continuity</h3><p>Member departure does not reset this project. Existing Tasks, Milestones, Chat, meetings, resources, contribution and start history stay attached to this run.</p></div>
  <div className={styles.statuses} aria-label="Recovery status">{run.replacement_needed&&<span>REPLACEMENT NEEDED</span>}{run.lead_replacement_needed&&<span>PROJECT LEAD NEEDED</span>}{run.recruitment_open&&<span>RECRUITMENT OPEN</span>}{run.replacement_requested_at&&<span>REPLACEMENT REQUESTED</span>}</div>
  {canRecover&&run.replacement_needed?<ProjectTeamRecoveryControls projectId={projectId} projectRunId={projectRunId} recruitmentOpen={run.recruitment_open===true}/>:null}
  {rows.length?<div className={styles.handovers}><h4>Operational handover</h4><p className={styles.privacy}>Visible only to authorized people in this project run. Personal optional context is deliberately not repeated here.</p>{rows.map(item=><article key={item.id} className={styles.handover}><div className={styles.handoverHead}><strong>{reasonLabel(item.reason_category)}</strong><time dateTime={item.created_at}>{new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(item.created_at))}</time></div><dl>{item.completed_work&&<Entry term="Completed work" value={item.completed_work}/>} {item.open_work&&<Entry term="Open work" value={item.open_work}/>} {item.file_references&&<Entry term="Files / resources" value={item.file_references}/>} {item.decisions&&<Entry term="Decisions" value={item.decisions}/>} {item.risks&&<Entry term="Risks" value={item.risks}/>} {item.recommendations&&<Entry term="Recommendations" value={item.recommendations}/>} {item.open_responsibilities&&<Entry term="Open responsibilities" value={item.open_responsibilities}/>} {item.handover_availability&&<Entry term="Handover availability" value={item.handover_availability}/>}</dl></article>)}</div>:null}
 </section>;
}
function Entry({term,value}:{term:string;value:string}){return <div><dt>{term}</dt><dd>{value}</dd></div>}
