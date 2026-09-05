import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {startProjectRun} from '@/lib/project-start-service';

function clean(value:unknown,max=100){return String(value??'').trim().slice(0,max)}

export async function POST(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json();const action=clean(body.action),projectId=clean(body.project_id),runId=clean(body.project_run_id);if(action!=='start'||!projectId||!runId)return NextResponse.json({error:'Project, team and start action are required.'},{status:400});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
    const [{data:project},{data:run},{data:membership},{data:architect}]=await Promise.all([
      db.from('projects').select('id,title,project_type,status').eq('id',projectId).maybeSingle(),
      db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('id',runId).eq('project_id',projectId).maybeSingle(),
      db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
      db.from('project_architect_assignments').select('id').eq('project_id',projectId).eq('user_id',user.id).eq('assignment_status','active').limit(1).maybeSingle()
    ]);
    if(!project||!run)return NextResponse.json({error:'Project team not found.'},{status:404});
    if(project.project_type!=='partner')return NextResponse.json({error:'Open project starts are governed by their configured admission and scheduling policy.'},{status:409});
    const projectLead=Boolean(membership&&['waiting','active'].includes(membership.membership_status)&&membership.team_role==='project_lead');const authorised=user.app_metadata?.role==='admin'||Boolean(architect)||projectLead;if(!authorised)return NextResponse.json({error:'Admin, the assigned Project Architect, or the Project Leader is required to start a Partner project.'},{status:403});
    const result=await startProjectRun({db,projectId,runId,source:'manual',actorUserId:user.id});
    if(result.alreadyStarted)return NextResponse.json({ok:true,already_started:true,status:'active'});
    if(result.notReady)return NextResponse.json({error:`This project is not ready to start. Resolve: ${(result.blockers||[]).join(', ')}.`,code:'START_NOT_READY',blockers:result.blockers||[]},{status:409});
    if(!result.started)return NextResponse.json({error:'This project could not be started.'},{status:409});
    return NextResponse.json({ok:true,status:'active'});
  }catch(error){console.error('project team lifecycle error',error);return NextResponse.json({error:'Unable to start this project team.'},{status:500})}
}
