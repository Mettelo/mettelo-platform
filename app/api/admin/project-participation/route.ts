import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {parseProjectParticipation,validateProjectParticipation} from '@/lib/project-participation';

async function adminContext(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{db,user};
}

const projectFields='id,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold,late_joining_enabled,late_joining_cutoff_at,status';

export async function GET(request:Request){
  try{
    const ctx=await adminContext();if('error'in ctx)return ctx.error;
    const projectId=new URL(request.url).searchParams.get('project_id')?.trim()||'';
    if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
    const [{data:project,error},{data:run,error:runError}]=await Promise.all([
      ctx.db.from('projects').select(projectFields).eq('id',projectId).maybeSingle(),
      ctx.db.from('project_runs').select('id,status,has_started,recruitment_open,recruitment_closed_at,required_team_size').eq('project_id',projectId).not('status','in','("completed","cancelled")').order('run_number',{ascending:false}).limit(1).maybeSingle()
    ]);
    if(error||!project)return NextResponse.json({error:'Project not found.'},{status:404});
    if(runError)throw runError;
    return NextResponse.json({item:project,run:run||null});
  }catch(error){
    console.error('project participation policy read error',error);
    return NextResponse.json({error:'Unable to load project participation policy.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    const ctx=await adminContext();if('error'in ctx)return ctx.error;
    const {db,user}=ctx;
    const body=await request.json();
    const projectId=String(body.project_id||'').trim();
    if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});

    const {data:project,error:projectError}=await db.from('projects').select(projectFields).eq('id',projectId).maybeSingle();
    if(projectError||!project)return NextResponse.json({error:'Project not found.'},{status:404});

    if(String(body.action||'')==='set_recruitment'){
      const runId=String(body.project_run_id||'').trim();
      if(!runId)return NextResponse.json({error:'Project run is required.'},{status:400});
      const requestedOpen=body.recruitment_open===true;
      const {data:run,error:runError}=await db.from('project_runs').select('id,status,has_started,recruitment_open').eq('id',runId).eq('project_id',projectId).maybeSingle();
      if(runError||!run)return NextResponse.json({error:'Project run not found.'},{status:404});
      if(!run.has_started||run.status!=='active')return NextResponse.json({error:'Recruitment close/reopen is available for the active project run.'},{status:409});

      if(requestedOpen){
        if(project.late_joining_enabled===false)return NextResponse.json({error:'Enable late joining before reopening recruitment.'},{status:409});
        if(project.late_joining_cutoff_at&&new Date(project.late_joining_cutoff_at).getTime()<=Date.now())return NextResponse.json({error:'The late-joining window has closed.'},{status:409});
        const {data:capacity,error:capacityError}=await db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:runId});
        if(capacityError)throw capacityError;
        if(capacity?.capacity_available!==true)return NextResponse.json({error:'Recruitment cannot reopen because the project is at maximum capacity.'},{status:409});
      }

      const now=new Date().toISOString();
      const {data:updated,error}=await db.from('project_runs').update({
        recruitment_open:requestedOpen,
        recruitment_closed_at:requestedOpen?null:now,
        updated_at:now
      }).eq('id',runId).eq('project_id',projectId).select('id,recruitment_open,recruitment_closed_at').single();
      if(error)throw error;
      await db.from('project_activity_log').insert({
        project_id:projectId,project_run_id:runId,
        event_type:requestedOpen?'project_recruitment_reopened':'project_recruitment_closed',
        actor_type:'user',actor_user_id:user.id,
        from_status:run.status,to_status:run.status,
        metadata:{previous_recruitment_open:run.recruitment_open,recruitment_open:requestedOpen,source:'phase9_admin'}
      });
      return NextResponse.json({ok:true,run:updated});
    }

    let parsed;
    try{
      parsed=parseProjectParticipation({
        participation_mode:body.participation_mode,
        min_team_size:body.min_team_size,
        target_team_size:body.target_team_size,
        max_team_size:body.max_team_size,
        team_size_threshold:body.min_team_size
      });
    }catch(error){
      if(error instanceof Error&&error.message==='INVALID_PARTICIPATION_MODE')return NextResponse.json({error:'Choose Team, Solo or Flexible participation.'},{status:400});
      throw error;
    }
    const validation=validateProjectParticipation(parsed);
    if(validation)return NextResponse.json({error:validation},{status:400});

    const now=new Date().toISOString();
    const {data,error}=await db.from('projects').update({
      participation_mode:parsed.participation_mode,
      min_team_size:parsed.min_team_size,
      target_team_size:parsed.target_team_size,
      max_team_size:parsed.max_team_size,
      team_size_threshold:parsed.min_team_size,
      updated_at:now,
      updated_by_user_id:user.id
    }).eq('id',projectId).select(projectFields).single();
    if(error){
      const message=String(error.message||'');
      if(message.includes('MAXIMUM_BELOW_CURRENT_CAPACITY'))return NextResponse.json({error:'Maximum cannot be reduced below current occupied/reserved capacity.'},{status:409});
      return NextResponse.json({error:'Unable to update project participation policy.'},{status:409});
    }

    await db.from('project_activity_log').insert({
      project_id:projectId,event_type:'project_participation_policy_updated',actor_type:'user',actor_user_id:user.id,
      from_status:project.participation_mode,to_status:parsed.participation_mode,
      metadata:{
        previous:{mode:project.participation_mode,minimum:project.min_team_size,target:project.target_team_size,maximum:project.max_team_size},
        next:{mode:parsed.participation_mode,minimum:parsed.min_team_size,target:parsed.target_team_size,maximum:parsed.max_team_size}
      }
    });
    return NextResponse.json({ok:true,item:data});
  }catch(error){
    console.error('project participation policy update error',error);
    return NextResponse.json({error:'Unable to update project participation policy.'},{status:500});
  }
}
