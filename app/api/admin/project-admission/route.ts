import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';
import {effectiveProjectAdmissionMode,safeAutoStartDelayMinutes} from '@/lib/project-admission';
import {startProjectRun} from '@/lib/project-start-service';

async function adminContext(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{auth,db,user};
}

function cutoff(value:unknown){
  if(value===null||value===''||value===undefined)return null;
  const parsed=new Date(String(value));
  return Number.isNaN(parsed.getTime())?undefined:parsed.toISOString();
}

function booleanOr(value:unknown,fallback:boolean){
  return value===undefined?fallback:value===true;
}

const policyFields='id,title,project_type,partner_name,admission_mode,auto_start_delay_minutes,auto_start_paused_at,late_joining_enabled,late_joining_cutoff_at,project_sharing_enabled,member_invites_enabled,collaboration_marketplace_enabled,project_lead_invites_enabled,team_member_invites_enabled,external_collaboration_invites_enabled,collaboration_social_sharing_enabled,offer_expiry_hours,offer_reminders_enabled,status';
const runFields='id,run_number,status,has_started,required_team_size,scheduled_start_at,start_scheduled_at,start_ready_at,auto_start_paused_at,auto_start_pause_reason,auto_start_paused_by_user_id,auto_start_blocked_at,auto_start_block_reason,auto_start_blocked_by_user_id,auto_start_failure,recruitment_open';

function safeReason(value:unknown,max=500){return String(value||'').trim().slice(0,max)}
async function memberEmail(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}
async function minimumReady(db:NonNullable<ReturnType<typeof serviceDb>>,runId:string,requiredInput:unknown){
  const required=Math.max(1,Number(requiredInput||1));
  const {count,error}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',runId).in('membership_status',['waiting','active']);
  if(error)throw error;
  const filled=count||0;
  return{ready:filled>=required,filled,required};
}

export async function GET(request:Request){
  try{
    const ctx=await adminContext();if('error'in ctx)return ctx.error;
    const projectId=new URL(request.url).searchParams.get('project_id')?.trim()||'';
    if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
    const [{data,error},{data:runs,error:runError}]=await Promise.all([
      ctx.db.from('projects').select(policyFields).eq('id',projectId).maybeSingle(),
      ctx.db.from('project_runs').select(runFields).eq('project_id',projectId).not('status','in','("completed","cancelled")').order('run_number',{ascending:false})
    ]);
    if(error||!data)return NextResponse.json({error:'Project not found.'},{status:404});
    if(runError)throw runError;
    return NextResponse.json({
      item:{...data,auto_start_delay_minutes:safeAutoStartDelayMinutes(data.auto_start_delay_minutes),effective_admission_mode:effectiveProjectAdmissionMode(data.project_type,data.admission_mode)},
      runs:runs||[]
    });
  }catch(error){
    console.error('project admission policy read error',error);
    return NextResponse.json({error:'Unable to load project admission policy.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    const ctx=await adminContext();if('error'in ctx)return ctx.error;
    const {auth,db,user}=ctx;
    const body=await request.json();
    const projectId=String(body.project_id||'').trim();
    if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
    const action=String(body.action||'').trim();
    const reason=safeReason(body.reason);
    const now=new Date().toISOString();

    const {data:project,error:projectError}=await db.from('projects').select(policyFields).eq('id',projectId).maybeSingle();
    if(projectError||!project)return NextResponse.json({error:'Project not found.'},{status:404});
    const effectiveMode=effectiveProjectAdmissionMode(project.project_type,project.admission_mode);
    const canonicalDelay=safeAutoStartDelayMinutes(project.auto_start_delay_minutes);

    if(action==='force_start_run'||action==='force_start_application'){
      if(!reason||reason.length<8)return NextResponse.json({error:'Record a clear reason for force-starting this project.'},{status:400});
      let runId=String(body.project_run_id||'').trim();

      if(action==='force_start_application'){
        const applicationId=String(body.application_id||'').trim();
        if(!applicationId)return NextResponse.json({error:'Project application is required.'},{status:400});
        const {data:application,error:applicationError}=await db.from('project_applications')
          .select('id,project_id,project_run_id,status')
          .eq('id',applicationId)
          .eq('project_id',projectId)
          .maybeSingle();
        if(applicationError||!application)return NextResponse.json({error:'Project application not found.'},{status:404});
        if(!['accepted','waiting_for_team','team_complete'].includes(String(application.status))){
          return NextResponse.json({error:'Force start is available only after the project place has been accepted.'},{status:409});
        }
        runId=String(application.project_run_id||'').trim();
        if(!runId&&application.status==='accepted'){
          const {data:formation,error:formationError}=await db.rpc('phase10_form_accepted_offer',{p_application_id:applicationId});
          if(formationError){
            const message=String(formationError.message||'');
            if(message.includes('PARTICIPATION_PREFERENCE_REQUIRED'))return NextResponse.json({error:'This accepted application needs a valid participation choice before it can be formed.'},{status:409});
            throw formationError;
          }
          runId=String((formation as {run_id?:unknown}|null)?.run_id||'').trim();
        }
      }

      if(!runId)return NextResponse.json({error:'No current project run is available to force start. Form the accepted place first or refresh the application.'},{status:409});
      const {data:run,error:runError}=await db.from('project_runs').select(runFields).eq('id',runId).eq('project_id',projectId).maybeSingle();
      if(runError){console.error('admin project run lookup failed',{project_id:projectId,run_id:runId,error:runError});return NextResponse.json({error:'Unable to load the current project run.'},{status:500})}
      if(!run)return NextResponse.json({error:'Project run not found.'},{status:404});
      if(run.has_started||run.status==='active')return NextResponse.json({ok:true,action,already_started:true,status:'active'});

      const {data:forced,error:forceError}=await db.rpc('admin_force_start_project_run',{
        p_project_id:projectId,
        p_run_id:runId,
        p_actor_user_id:user.id,
        p_reason:reason
      });
      if(forceError){
        const message=String(forceError.message||'');
        if(message.includes('FORCE_START_REQUIRES_MEMBER'))return NextResponse.json({error:'Force start requires at least one confirmed project member.'},{status:409});
        if(message.includes('FORCE_START_SYSTEM_NOT_READY')){
          const {data:readiness}=await db.rpc('phase11_project_start_readiness',{
            p_project_id:projectId,
            p_run_id:runId
          });
          const snapshot=(readiness||{}) as {system?:{blockers?:string[]};project?:{blockers?:string[]};team?:{blockers?:string[]}};
          const blockers=Array.from(new Set([
            ...(snapshot.system?.blockers||[]),
            ...(snapshot.project?.blockers||[])
          ]));
          const detail=blockers.length
            ? blockers.map(value=>value.replaceAll('_',' ')).join(', ')
            : 'Lab/system readiness';
          return NextResponse.json({
            error:`The project cannot be force-started yet. Resolve: ${detail}.`,
            blockers,
            readiness:snapshot
          },{status:409});
        }
        if(message.includes('FORCE_START_CAPACITY_INVALID'))return NextResponse.json({error:'Current membership exceeds the project maximum capacity. Resolve capacity before force start.'},{status:409});
        if(message.includes('PROJECT_NOT_JOINABLE')||message.includes('FORCE_START_RUN_LIFECYCLE_INVALID'))return NextResponse.json({error:'This project run cannot be force-started in its current lifecycle state.'},{status:409});
        if(message.includes('FORCE_START_REASON_REQUIRED'))return NextResponse.json({error:'Record a clear reason for force-starting this project.'},{status:400});
        throw forceError;
      }

      const result=(forced||{}) as {started?:boolean;already_started?:boolean;forced?:boolean;filled?:number;required_team_size?:number};
      if(result.started||result.already_started){
        const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','active');
        await Promise.allSettled((members||[]).map(async member=>notifyUser(db,{
          userId:member.user_id,
          email:await memberEmail(db,member.user_id),
          projectId,
          type:'project_kickoff',
          title:'Your project is starting',
          body:`${project.title||'Your project'} has been started by a Mettelo Admin. Open the workspace to begin.`,
          actionUrl:`/member/projects/${projectId}?run=${runId}`,
          subject:`Your project is starting: ${project.title||'Mettelo project'}`,
          templateKey:'project_kickoff',
          dedupeKey:`admin-force-start:${runId}:kickoff:${member.user_id}`,
          payload:{project_title:project.title||'Mettelo project',forced:true,reason}
        })));
      }
      return NextResponse.json({ok:true,action,status:'active',result});
    }

    if(action==='convert_to_review_required'){
      if(project.project_type==='partner')return NextResponse.json({error:'Partner Projects are already permanently REVIEW_REQUIRED.'},{status:409});
      if(effectiveMode!=='auto')return NextResponse.json({ok:true,already_review_required:true,item:{...project,admission_mode:'review_required'}});
      if(!reason)return NextResponse.json({error:'Record why this Open AUTO project is being moved to human review.'},{status:400});
      const {data,error}=await auth.rpc('phase7_convert_open_auto_to_review_required',{p_project_id:projectId,p_reason:reason});
      if(error){const message=String(error.message||'');if(message.includes('PROJECT_ALREADY_STARTED'))return NextResponse.json({error:'This project has already started and cannot be converted back to review.'},{status:409});throw error}
      return NextResponse.json({ok:true,action,item:data});
    }

    if(['pause_run','resume_run','block_run','unblock_run','retry_run','start_run'].includes(action)){
      if(effectiveMode!=='auto'||project.project_type==='partner'){
        return NextResponse.json({error:'Only Mettelo Open AUTO projects can use automatic-start intervention controls.'},{status:409});
      }
      const runId=String(body.project_run_id||'').trim();
      if(!runId)return NextResponse.json({error:'Project run is required.'},{status:400});
      const {data:run,error:runError}=await db.from('project_runs').select(runFields).eq('id',runId).eq('project_id',projectId).maybeSingle();
      if(runError||!run)return NextResponse.json({error:'Project run not found.'},{status:404});
      if(run.has_started||run.status==='active')return NextResponse.json({error:'This project run has already started.'},{status:409});

      if(action==='pause_run'){
        const {data:updated,error}=await db.from('project_runs').update({
          auto_start_paused_at:run.auto_start_paused_at||now,
          auto_start_pause_reason:reason||'Admin intervention',
          auto_start_paused_by_user_id:user.id,
          updated_at:now
        }).eq('id',runId).eq('has_started',false).select('id').maybeSingle();
        if(error)throw error;if(!updated)return NextResponse.json({error:'This run changed before it could be paused.'},{status:409});
        await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'project_auto_start_paused',actor_type:'user',actor_user_id:user.id,from_status:'forming',to_status:'forming',metadata:{scheduled_start_at:run.scheduled_start_at,reason:reason||null}});
        return NextResponse.json({ok:true,action,status:'paused'});
      }

      if(action==='block_run'){
        if(!reason)return NextResponse.json({error:'Record a reason before blocking an automatic start.'},{status:400});
        const {data:updated,error}=await db.from('project_runs').update({
          auto_start_blocked_at:run.auto_start_blocked_at||now,
          auto_start_block_reason:reason,
          auto_start_blocked_by_user_id:user.id,
          updated_at:now
        }).eq('id',runId).eq('has_started',false).select('id').maybeSingle();
        if(error)throw error;if(!updated)return NextResponse.json({error:'This run changed before it could be blocked.'},{status:409});
        await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'project_auto_start_blocked',actor_type:'user',actor_user_id:user.id,from_status:'forming',to_status:'forming',metadata:{reason,scheduled_start_at:run.scheduled_start_at}});
        return NextResponse.json({ok:true,action,status:'blocked'});
      }

      if(action==='unblock_run'){
        if(!run.auto_start_blocked_at)return NextResponse.json({ok:true,action,status:'scheduled',already_unblocked:true});
        const readiness=await minimumReady(db,runId,run.required_team_size);
        if(!readiness.ready)return NextResponse.json({ok:false,status:'team_forming',blockers:['team_size'],filled:readiness.filled,required_team_size:readiness.required,error:'This team is below its minimum. Keep the run blocked until the start condition is restored.'},{status:409});
        const due=new Date(Date.now()+canonicalDelay*60_000).toISOString();
        const {data:updated,error}=await db.from('project_runs').update({
          auto_start_blocked_at:null,
          auto_start_block_reason:null,
          auto_start_blocked_by_user_id:null,
          start_ready_at:now,
          start_scheduled_at:now,
          scheduled_start_at:due,
          auto_start_failure:null,
          updated_at:now
        }).eq('id',runId).eq('has_started',false).select('id').maybeSingle();
        if(error)throw error;if(!updated)return NextResponse.json({error:'This run changed before it could be unblocked.'},{status:409});
        await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'project_auto_start_unblocked',actor_type:'user',actor_user_id:user.id,from_status:'forming',to_status:'forming',metadata:{reason:reason||null,scheduled_start_at:due,delay_minutes:canonicalDelay,filled:readiness.filled,required_team_size:readiness.required}});
        return NextResponse.json({ok:true,action,status:'scheduled',scheduled_start_at:due});
      }

      if(action==='resume_run'){
        const readiness=await minimumReady(db,runId,run.required_team_size);
        if(!readiness.ready)return NextResponse.json({ok:false,status:'team_forming',blockers:['team_size'],filled:readiness.filled,required_team_size:readiness.required,error:'This team is below its minimum. Automatic start cannot resume until the start condition is restored.'},{status:409});
        const due=new Date(Date.now()+canonicalDelay*60_000).toISOString();
        const {data:updated,error}=await db.from('project_runs').update({
          auto_start_paused_at:null,
          auto_start_pause_reason:null,
          auto_start_paused_by_user_id:null,
          auto_start_failure:null,
          start_ready_at:now,
          start_scheduled_at:now,
          scheduled_start_at:due,
          updated_at:now
        }).eq('id',runId).eq('has_started',false).is('auto_start_blocked_at',null).select('id').maybeSingle();
        if(error)throw error;
        if(!updated)return NextResponse.json({error:'Unblock this run before resuming automatic start.'},{status:409});
        await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'project_auto_start_resumed',actor_type:'user',actor_user_id:user.id,from_status:'forming',to_status:'forming',metadata:{reason:reason||null,scheduled_start_at:due,delay_minutes:canonicalDelay,filled:readiness.filled,required_team_size:readiness.required}});
        return NextResponse.json({ok:true,action,status:'scheduled',scheduled_start_at:due});
      }

      if(run.auto_start_blocked_at)return NextResponse.json({error:'This run is blocked. Unblock it before starting or retrying.'},{status:409});
      await db.from('project_runs').update({auto_start_paused_at:null,auto_start_pause_reason:null,auto_start_paused_by_user_id:null,auto_start_failure:null,updated_at:now}).eq('id',runId).eq('has_started',false);
      const result=await startProjectRun({db,projectId,runId,source:action==='start_run'?'manual':'admin_retry',actorUserId:user.id});
      if(result.notReady){
        const blockers=result.blockers||[];
        if(blockers.includes('schedule_not_due')){
          return NextResponse.json({ok:false,status:'eligibility_window',blockers,error:'The six-hour AUTO eligibility window is not complete yet.'},{status:409});
        }
        if(blockers.includes('team_size')){
          return NextResponse.json({ok:false,status:'team_forming',blockers,filled:result.filled,required_team_size:result.requiredTeamSize,error:`Project cannot start yet. The team is now below its required minimum of ${result.requiredTeamSize} member${result.requiredTeamSize===1?'':'s'}.`},{status:409});
        }
        await db.from('project_runs').update({auto_start_failure:`readiness:${blockers.join(',')}`,updated_at:now}).eq('id',runId).eq('has_started',false);
        return NextResponse.json({ok:false,status:'needs_attention',blockers,error:'Project cannot start yet. Resolve the current readiness blockers and try again.'},{status:409});
      }
      return NextResponse.json({ok:true,action,status:result.started||result.alreadyStarted?'active':'scheduled',result});
    }

    const requestedMode=String(body.admission_mode||'review_required')==='auto'?'auto':'review_required';
    if(project.project_type==='partner'&&requestedMode==='auto'){
      return NextResponse.json({error:'Partner Projects always require human review. AUTO cannot be enabled.'},{status:409});
    }
    if(effectiveMode==='auto'&&requestedMode==='review_required'){
      return NextResponse.json({error:'Use the explicit “Convert to review required” action so waiting AUTO memberships and schedules are unwound safely and audited.'},{status:409});
    }

    const pause=body.auto_start_paused===true;
    const lateJoining=booleanOr(body.late_joining_enabled,project.late_joining_enabled!==false);
    const sharing=booleanOr(body.project_sharing_enabled,project.project_sharing_enabled!==false);
    const invites=booleanOr(body.member_invites_enabled,project.member_invites_enabled===true);
    const marketplace=booleanOr(body.collaboration_marketplace_enabled,project.collaboration_marketplace_enabled!==false);
    const leadInvites=booleanOr(body.project_lead_invites_enabled,project.project_lead_invites_enabled!==false);
    const teamInvites=booleanOr(body.team_member_invites_enabled,project.team_member_invites_enabled===true);
    const externalInvites=booleanOr(body.external_collaboration_invites_enabled,project.external_collaboration_invites_enabled===true);
    const socialSharing=booleanOr(body.collaboration_social_sharing_enabled,project.collaboration_social_sharing_enabled===true);
    const offerReminders=booleanOr(body.offer_reminders_enabled,project.offer_reminders_enabled!==false);
    const offerExpiryHours=Math.max(1,Math.min(720,Number(body.offer_expiry_hours??project.offer_expiry_hours??72)));
    const lateJoiningCutoff=cutoff(body.late_joining_cutoff_at);
    if(lateJoiningCutoff===undefined)return NextResponse.json({error:'Choose a valid late-joining cutoff date and time.'},{status:400});
    if(!marketplace&&(externalInvites||socialSharing))return NextResponse.json({error:'Enable the collaboration marketplace before enabling external invitations or social sharing.'},{status:400});
    if(!sharing&&socialSharing)return NextResponse.json({error:'Enable project sharing before enabling collaboration social sharing.'},{status:400});
    if(!invites&&(leadInvites||teamInvites))return NextResponse.json({error:'Enable member invitations before allowing Project Lead or team-member invitations.'},{status:400});

    const patch={
      admission_mode:requestedMode,
      auto_start_delay_minutes:canonicalDelay,
      auto_start_paused_at:requestedMode==='auto'&&pause?(project.auto_start_paused_at||now):null,
      late_joining_enabled:lateJoining,
      late_joining_cutoff_at:lateJoiningCutoff,
      project_sharing_enabled:sharing,
      member_invites_enabled:invites,
      collaboration_marketplace_enabled:marketplace,
      project_lead_invites_enabled:leadInvites,
      team_member_invites_enabled:teamInvites,
      external_collaboration_invites_enabled:externalInvites,
      collaboration_social_sharing_enabled:socialSharing,
      offer_expiry_hours:offerExpiryHours,
      offer_reminders_enabled:offerReminders,
      updated_at:now,
      updated_by_user_id:user.id
    };
    const {data,error}=await db.from('projects').update(patch).eq('id',projectId).select(policyFields).single();
    if(error)throw error;
    await db.from('project_activity_log').insert({
      project_id:projectId,event_type:'project_admission_policy_updated',actor_type:'user',actor_user_id:user.id,
      from_status:effectiveMode,to_status:effectiveProjectAdmissionMode(project.project_type,requestedMode),
      metadata:{
        previous_delay_minutes:project.auto_start_delay_minutes,new_delay_minutes:canonicalDelay,auto_start_paused:pause,
        late_joining_enabled:lateJoining,late_joining_cutoff_at:lateJoiningCutoff,project_sharing_enabled:sharing,member_invites_enabled:invites,
        collaboration_marketplace_enabled:marketplace,project_lead_invites_enabled:leadInvites,team_member_invites_enabled:teamInvites,
        external_collaboration_invites_enabled:externalInvites,collaboration_social_sharing_enabled:socialSharing,
        offer_expiry_hours:offerExpiryHours,offer_reminders_enabled:offerReminders,project_type:project.project_type,partner_name:project.partner_name||null
      }
    });
    return NextResponse.json({ok:true,item:{...data,auto_start_delay_minutes:safeAutoStartDelayMinutes(data.auto_start_delay_minutes),effective_admission_mode:effectiveProjectAdmissionMode(data.project_type,data.admission_mode)}});
  }catch(error){
    console.error('project admission configuration error',error);
    return NextResponse.json({error:'Unable to update project admission policy.'},{status:500});
  }
}