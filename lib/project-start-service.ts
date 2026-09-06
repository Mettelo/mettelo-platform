import {notifyUser,serviceDb} from '@/lib/project-flow';
import {assessProjectTeamReadiness} from '@/lib/project-team-readiness';
import {canonicalParticipationMode,effectiveProjectAdmissionMode} from '@/lib/project-admission';

type Db=NonNullable<ReturnType<typeof serviceDb>>;
type StartSource='auto_scheduler'|'manual'|'admin_retry';
type StartResult={started:boolean;alreadyStarted?:boolean;paused?:boolean;blocked?:boolean;notReady?:boolean;blockers?:string[];projectId:string;runId:string;runNumber:number;filled:number;requiredTeamSize:number};
type ActivationRpcResult={started?:boolean;already_started?:boolean;paused?:boolean;blocked?:boolean;not_ready?:boolean;blockers?:string[];run_number?:number;filled?:number;required_team_size?:number;maximum_team_size?:number};
type Phase11ReadinessRpc={ready?:boolean;blockers?:string[];project?:{ready?:boolean;blockers?:string[]};team?:{ready?:boolean;blockers?:string[];filled?:number;required_team_size?:number};system?:{ready?:boolean;blockers?:string[]}};

async function memberEmail(db:Db,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}

export async function startProjectRun({db,projectId,runId,source,actorUserId=null}:{db:Db;projectId:string;runId:string;source:StartSource;actorUserId?:string|null}):Promise<StartResult>{
 const [{data:project,error:projectError},{data:run,error:runError}]=await Promise.all([
  db.from('projects').select('id,title,status,project_type,admission_mode,participation_mode,auto_start_paused_at,applications_open,min_team_size,max_team_size,target_team_size,team_size_threshold').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,run_number,status,required_team_size,has_started,scheduled_start_at,auto_start_paused_at,auto_start_blocked_at').eq('id',runId).eq('project_id',projectId).maybeSingle()
 ]);
 if(projectError||!project||runError||!run)throw new Error('PROJECT_RUN_NOT_FOUND');
 const participationMode=canonicalParticipationMode(project.participation_mode);
 const canonicalMinimum=participationMode==='solo'||participationMode==='flexible'
  ?1
  :Math.max(1,Number(project.min_team_size||project.team_size_threshold||1));
 const required=Math.max(canonicalMinimum,Number(run.required_team_size||canonicalMinimum));
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

 // Phase 11 owns the final pre-start policy projection. This is deliberately a
 // composition of existing project/team/system truth, not a second lifecycle.
 // The Phase 9 activation RPC remains the final transactional authority and
 // repeats mutable safety checks under the canonical project/run locks.
 const {data:phase11Data,error:phase11Error}=await db.rpc('phase11_project_start_readiness',{
  p_project_id:projectId,
  p_run_id:runId
 });
 if(phase11Error)throw phase11Error;
 const phase11=(phase11Data||{}) as Phase11ReadinessRpc;
 if(!phase11.ready){
  const blockers=Array.isArray(phase11.blockers)&&phase11.blockers.length?phase11.blockers:['project_readiness'];
  const filled=Number(phase11.team?.filled||0);
  const requiredTeamSize=Number(phase11.team?.required_team_size||required);
  return{started:false,notReady:true,blockers,projectId,runId,runNumber:run.run_number,filled,requiredTeamSize};
 }

 // Participation geometry is independent from admission mode. Solo and Flexible
 // one-person runs do not inherit Team-only lead/responsibility gates merely
 // because admission was REVIEW_REQUIRED. Multi-member runs still use the
 // existing deterministic lead/readiness preparation before atomic activation.
 const oneMemberParticipation=(participationMode==='solo'||participationMode==='flexible')&&required===1;
 const readiness=await assessProjectTeamReadiness({db,projectId,runId,requiredTeamSize:required,assignLead:!oneMemberParticipation,requireResponsibilityCoverage:!oneMemberParticipation,requireLead:!oneMemberParticipation});
 if(!readiness.ready)return{started:false,notReady:true,blockers:readiness.blockers,projectId,runId,runNumber:run.run_number,filled:readiness.filled,requiredTeamSize:required};

 // Solo controls start geometry, not permanent headcount. A Solo project may
 // intentionally allow later collaborators on the same run, so maximum always
 // comes from the canonical project capacity configuration.
 const maximum=Math.max(required,Number(project.max_team_size||project.target_team_size||project.team_size_threshold||required));
 if(readiness.filled>maximum){
  return{started:false,notReady:true,blockers:['capacity'],projectId,runId,runNumber:run.run_number,filled:readiness.filled,requiredTeamSize:required};
 }

 // The database transaction is the final authority. It rechecks mutable
 // membership/capacity/Lab/lead state under canonical project/run locks and
 // atomically activates the run, waiting memberships and linked applications.
 const {data:activation,error:activationError}=await db.rpc('phase9_activate_project_run',{
  p_project_id:projectId,
  p_run_id:runId,
  p_source:source,
  p_actor_user_id:actorUserId
 });
 if(activationError)throw activationError;
 const result=(activation||{}) as ActivationRpcResult;
 const runNumber=Number(result.run_number??run.run_number);
 const filled=Number(result.filled??readiness.filled);
 const requiredTeamSize=Number(result.required_team_size??required);
 if(!result.started){
  if(result.already_started)return{started:false,alreadyStarted:true,projectId,runId,runNumber,filled,requiredTeamSize};
  if(result.paused)return{started:false,paused:true,projectId,runId,runNumber,filled,requiredTeamSize};
  if(result.blocked)return{started:false,blocked:true,blockers:result.blockers||['auto_start_blocked'],projectId,runId,runNumber,filled,requiredTeamSize};
  return{started:false,notReady:true,blockers:result.blockers||['project_readiness'],projectId,runId,runNumber,filled,requiredTeamSize};
 }

 const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','active');
 await Promise.allSettled((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await memberEmail(db,member.user_id),projectId,type:'project_kickoff',title:'Your project is starting',body:`${project.title} is ready. Open the workspace to begin.`,actionUrl:`/member/projects/${projectId}?run=${runId}`,subject:`Your project is starting: ${project.title}`,templateKey:'project_kickoff',payload:{project_title:project.title,team_number:runNumber,participation_mode:participationMode}})));
 return{started:true,projectId,runId,runNumber,filled,requiredTeamSize};
}
