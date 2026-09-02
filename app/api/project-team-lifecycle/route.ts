import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

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
    if(project.project_type!=='partner')return NextResponse.json({error:'Open project cohorts start automatically when their own required team size is reached.'},{status:409});
    // Partner projects never auto-start: an Admin, assigned Project Architect, or
    // Project Leader in the forming team must perform this explicit, audited action.
    const projectLead=Boolean(membership&&['waiting','active'].includes(membership.membership_status)&&membership.team_role==='project_lead');const authorised=user.app_metadata?.role==='admin'||Boolean(architect)||projectLead;if(!authorised)return NextResponse.json({error:'Admin, the assigned Project Architect, or the Project Leader is required to start a Partner project.'},{status:403});
    if(run.has_started||run.status==='active')return NextResponse.json({ok:true,already_started:true});
    const {count}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',runId).in('membership_status',['waiting','active']);const filled=count||0;const threshold=Math.max(1,Number(run.required_team_size||1));if(filled<threshold)return NextResponse.json({error:`This Partner team has ${filled}/${threshold} members. Reach the required team size before starting.`},{status:409});
    const now=new Date().toISOString();await db.from('project_runs').update({status:'active',has_started:true,started_at:now,kickoff_at:now,updated_at:now}).eq('id',runId);await db.from('project_members').update({membership_status:'active',activated_at:now}).eq('project_run_id',runId).eq('membership_status','waiting');await db.from('projects').update({status:'active',applications_open:false,kickoff_at:now,starts_at:now,updated_at:now}).eq('id',projectId);await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'partner_manual_start',actor_type:'user',actor_user_id:user.id,from_status:run.status,to_status:'active',metadata:{run_number:run.run_number,filled,required_team_size:threshold,applications_open:false}});
    const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','active');await Promise.all((members||[]).map(member=>notifyUser(db,{userId:member.user_id,email:undefined,projectId,type:'project_kickoff',title:'Your Partner project is starting',body:`${project.title} has been started by an authorised project lead. Open the workspace to begin.`,actionUrl:`/member/projects/${projectId}?run=${runId}`,subject:`Your project is starting: ${project.title}`,templateKey:'project_kickoff',payload:{project_title:project.title,team_number:run.run_number}})));
    return NextResponse.json({ok:true,status:'active'});
  }catch(error){console.error('project team lifecycle error',error);return NextResponse.json({error:'Unable to start this project team.'},{status:500})}
}
