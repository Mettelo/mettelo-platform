import {notifyUser,serviceDb} from '@/lib/project-flow';
import {assessProjectTeamReadiness} from '@/lib/project-team-readiness';
import {effectiveProjectAdmissionMode} from '@/lib/project-admission';

type Db=NonNullable<ReturnType<typeof serviceDb>>;
type StartSource='auto_scheduler'|'manual'|'admin_retry';
type StartResult={started:boolean;alreadyStarted?:boolean;paused?:boolean;blocked?:boolean;notReady?:boolean;blockers?:string[];projectId:string;runId:string;runNumber:number;filled:number;requiredTeamSize:number};

async function memberEmail(db:Db,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}

export async function startProjectRun({db,projectId,runId,source,actorUserId=null}:{db:Db;projectId:string;runId:string;source:StartSource;actorUserId?:string|null}):Promise<StartResult>{
 const [{data:project,error:projectError},{data:run,error:runError},{data:applications}]=await Promise.all([
  db.from('projects').select('id,title,status,project_type,admission_mode,auto_start_paused_at,applications_open,max_team_size,target_team_size,team_size_threshold').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,run_number,status,required_team_size,has_started,scheduled_start_at,auto_start_paused_at,auto_start_blocked_at').eq('id',runId).eq('project_id',projectId).maybeSingle(),
  db.from('project_applications').select('participation_preference,admission_decision').eq('project_run_id',runId)
 ]);
 if(projectError||!project||runError||!run)throw new Error('PROJECT_RUN_NOT_FOUND');
 const required=Math.max(1,Number(run.required_team_size||1));
 if(run.has_started||run.status==='active'){
  const {count}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',runId).in('membership_status',['waiting','active']);
  return{started:false,alreadyStarted:true,projectId,runId,runNumber:run.run_number,filled:count||0,requiredTeamSize:required};
 }

 const effectiveMode=effectiveProjectAdmissionMode(project.project_type,project.admission_mode);
 if(source==='auto_scheduler'&&effectiveMode!=='auto'){
  return{started:false,notReady:true,blockers:['admission_mode'],projectId,runId,runNumber:run.run_number,filled:0,requiredTeamSize:required};
 }
 if(['cancelled','completed','archived'].includes(String(project.status||''))){
  return{started:false,notReady:true,blockers:['project_lifecycle'],projectId,runId,runNumber:run.run_number,filled:0,requiredTeamSize:required};
 }
 if(run.auto_start_blocked_at){
  return{started:false,blocked:true,blockers:['auto_start_blocked'],projectId,runId,runNumber:run.run_number,filled:0,requiredTeamSize:required};
 }
 if(source==='auto_scheduler'&&(project.auto_start_paused_at||run.auto_start_paused_at)){
  return{started:false,paused:true,projectId,runId,runNumber:run.run_number,filled:0,requiredTeamSize:required};
 }

 const preferences=(applications||[]).filter(row=>row.admission_decision==='auto_qualified').map(row=>row.participation_preference);
 const soloLike=required===1&&preferences.some(value=>value==='solo'||value==='either');
 const readiness=await assessProjectTeamReadiness({db,projectId,runId,requiredTeamSize:required,assignLead:!soloLike,requireResponsibilityCoverage:!soloLike,requireLead:!soloLike});
 if(!readiness.ready)return{started:false,notReady:true,blockers:readiness.blockers,projectId,runId,runNumber:run.run_number,filled:readiness.filled,requiredTeamSize:required};

 const maximum=Math.max(required,Number(project.max_team_size||project.target_team_size||project.team_size_threshold||required));
 if(readiness.filled>maximum){
  return{started:false,notReady:true,blockers:['capacity'],projectId,runId,runNumber:run.run_number,filled:readiness.filled,requiredTeamSize:required};
 }

 const now=new Date().toISOString();
 const {data:started,error:startError}=await db.from('project_runs').update({
  status:'active',
  has_started:true,
  started_at:now,
  kickoff_at:now,
  scheduled_start_at:null,
  start_scheduled_at:null,
  start_ready_at:null,
  auto_start_failure:null,
  auto_start_paused_at:null,
  auto_start_pause_reason:null,
  auto_start_paused_by_user_id:null,
  updated_at:now
 }).eq('id',runId).eq('status','forming').eq('has_started',false).is('auto_start_blocked_at',null).select('id').maybeSingle();
 if(startError)throw startError;
 if(!started)return{started:false,alreadyStarted:true,projectId,runId,runNumber:run.run_number,filled:readiness.filled,requiredTeamSize:required};

 await db.from('project_members').update({membership_status:'active',activated_at:now}).eq('project_run_id',runId).eq('membership_status','waiting');
 await db.from('project_applications').update({status:'team_complete',updated_at:now}).eq('project_run_id',runId).in('status',['approved','waiting_for_team','accepted']);
 if(project.project_type==='partner'){
  await db.from('projects').update({status:'active',applications_open:false,kickoff_at:now,starts_at:now,updated_at:now}).eq('id',projectId);
 }else{
  await db.from('projects').update({updated_at:now}).eq('id',projectId);
 }

 const eventType=source==='auto_scheduler'?'project_auto_started':source==='admin_retry'?'project_auto_start_retry_started':'project_manual_started';
 await db.from('project_activity_log').insert({
  project_id:projectId,
  project_run_id:runId,
  event_type:eventType,
  actor_type:source==='auto_scheduler'?'system':'user',
  actor_user_id:actorUserId,
  from_status:'forming',
  to_status:'active',
  metadata:{run_number:run.run_number,filled:readiness.filled,required_team_size:required,maximum_team_size:maximum,lead_user_id:readiness.leadUserId,responsibility_coverage_ready:readiness.responsibilityCoverageReady,lab_ready:readiness.labReady,admission_mode:effectiveMode}
 });

 const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','active');
 await Promise.allSettled((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await memberEmail(db,member.user_id),projectId,type:'project_kickoff',title:'Your project is starting',body:`${project.title} is ready. Open the workspace to begin.`,actionUrl:`/member/projects/${projectId}?run=${runId}`,subject:`Your project is starting: ${project.title}`,templateKey:'project_kickoff',payload:{project_title:project.title,team_number:run.run_number}})));
 return{started:true,projectId,runId,runNumber:run.run_number,filled:readiness.filled,requiredTeamSize:required};
}
