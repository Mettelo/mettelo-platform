import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
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

const policyFields='id,project_type,partner_name,admission_mode,auto_start_delay_minutes,auto_start_paused_at,late_joining_enabled,late_joining_cutoff_at,project_sharing_enabled,member_invites_enabled';
const runFields='id,run_number,status,has_started,required_team_size,scheduled_start_at,start_scheduled_at,start_ready_at,auto_start_paused_at,auto_start_pause_reason,auto_start_paused_by_user_id,auto_start_blocked_at,auto_start_block_reason,auto_start_blocked_by_user_id,auto_start_failure,recruitment_open';

function safeReason(value:unknown,max=500){return String(value||'').trim().slice(0,max)}

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
      item:{...data,effective_admission_mode:effectiveProjectAdmissionMode(data.project_type,data.admission_mode)},
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
        const delay=safeAutoStartDelayMinutes(project.auto_start_delay_minutes);
        const due=new Date(Date.now()+delay*60_000).toISOString();
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
        await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'project_auto_start_unblocked',actor_type:'user',actor_user_id:user.id,from_status:'forming',to_status:'forming',metadata:{reason:reason||null,scheduled_start_at:due,delay_minutes:delay}});
        return NextResponse.json({ok:true,action,status:'scheduled',scheduled_start_at:due});
      }

      if(action==='resume_run'){
        const delay=safeAutoStartDelayMinutes(project.auto_start_delay_minutes);
        const due=new Date(Date.now()+delay*60_000).toISOString();
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
        await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'project_auto_start_resumed',actor_type:'user',actor_user_id:user.id,from_status:'forming',to_status:'forming',metadata:{reason:reason||null,scheduled_start_at:due,delay_minutes:delay}});
        return NextResponse.json({ok:true,action,status:'scheduled',scheduled_start_at:due});
      }

      if(run.auto_start_blocked_at)return NextResponse.json({error:'This run is blocked. Unblock it before starting or retrying.'},{status:409});
      await db.from('project_runs').update({auto_start_paused_at:null,auto_start_pause_reason:null,auto_start_paused_by_user_id:null,auto_start_failure:null,updated_at:now}).eq('id',runId).eq('has_started',false);
      const result=await startProjectRun({db,projectId,runId,source:action==='start_run'?'manual':'admin_retry',actorUserId:user.id});
      if(result.notReady){
        await db.from('project_runs').update({auto_start_failure:`readiness:${(result.blockers||[]).join(',')}`,updated_at:now}).eq('id',runId).eq('has_started',false);
        return NextResponse.json({ok:false,status:'needs_attention',blockers:result.blockers||[]},{status:409});
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

    const delay=safeAutoStartDelayMinutes(body.auto_start_delay_minutes);
    const pause=body.auto_start_paused===true;
    const lateJoining=body.late_joining_enabled!==false;
    const sharing=body.project_sharing_enabled!==false;
    const invites=body.member_invites_enabled===true;
    const lateJoiningCutoff=cutoff(body.late_joining_cutoff_at);
    if(lateJoiningCutoff===undefined)return NextResponse.json({error:'Choose a valid late-joining cutoff date and time.'},{status:400});

    const patch={
      admission_mode:requestedMode,
      auto_start_delay_minutes:delay,
      auto_start_paused_at:requestedMode==='auto'&&pause?(project.auto_start_paused_at||now):null,
      late_joining_enabled:lateJoining,
      late_joining_cutoff_at:lateJoiningCutoff,
      project_sharing_enabled:sharing,
      member_invites_enabled:invites,
      updated_at:now,
      updated_by_user_id:user.id
    };
    const {data,error}=await db.from('projects').update(patch).eq('id',projectId).select(policyFields).single();
    if(error)throw error;
    await db.from('project_activity_log').insert({
      project_id:projectId,event_type:'project_admission_policy_updated',actor_type:'user',actor_user_id:user.id,
      from_status:effectiveMode,to_status:effectiveProjectAdmissionMode(project.project_type,requestedMode),
      metadata:{previous_delay_minutes:project.auto_start_delay_minutes,new_delay_minutes:delay,auto_start_paused:pause,late_joining_enabled:lateJoining,late_joining_cutoff_at:lateJoiningCutoff,project_sharing_enabled:sharing,member_invites_enabled:invites,project_type:project.project_type,partner_name:project.partner_name||null}
    });
    return NextResponse.json({ok:true,item:{...data,effective_admission_mode:effectiveProjectAdmissionMode(data.project_type,data.admission_mode)}});
  }catch(error){
    console.error('project admission configuration error',error);
    return NextResponse.json({error:'Unable to update project admission policy.'},{status:500});
  }
}
