import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=80){return String(value??'').trim().slice(0,max)}
function message(error:unknown){return typeof error==='object'&&error&&'message'in error?String((error as{message?:unknown}).message||''):''}

export async function POST(request:Request){
 try{
  const body=await request.json();
  const projectId=clean(body.project_id),runId=clean(body.project_run_id);
  if(!projectId||!runId)return NextResponse.json({error:'Project and active project run are required.'},{status:400});

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const [{data:run},{data:membership}]=await Promise.all([
   db.from('project_runs').select('id,status,has_started,replacement_needed,lead_replacement_needed,recruitment_open').eq('id',runId).eq('project_id',projectId).maybeSingle(),
   db.from('project_members').select('id,team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle()
  ]);
  if(!run)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(run.status!=='active'||run.has_started!==true)return NextResponse.json({error:'Replacement recovery is only available for an active started run.'},{status:409});
  const isAdmin=user.app_metadata?.role==='admin';
  const isLead=membership?.membership_status==='active'&&membership.team_role==='project_lead';
  if(!isAdmin&&!isLead)return NextResponse.json({error:'Only the active Project Lead or an authorized Admin can request replacement recovery.'},{status:403});
  if(run.replacement_needed!==true)return NextResponse.json({ok:true,requested:false,already_recovered:true,recruitment_open:run.recruitment_open},{headers:{'Cache-Control':'private, no-store'}});

  const {data,error}=await db.rpc('phase16_request_replacement',{p_project_id:projectId,p_run_id:runId,p_actor_user_id:user.id});
  if(error){
   const detail=message(error);
   if(detail.includes('REPLACEMENT_JOINING_NOT_ALLOWED'))return NextResponse.json({error:'A replacement cannot be added through the normal joining path because the joining window, project mode or available capacity does not permit it.'},{status:409});
   if(detail.includes('ACTIVE_STARTED_RUN_REQUIRED'))return NextResponse.json({error:'The project run is no longer eligible for active replacement recovery.'},{status:409});
   throw error;
  }
  return NextResponse.json({ok:true,...(data&&typeof data==='object'?data:{})},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project replacement recovery error',error instanceof Error?error.message:'replacement recovery failed');
  return NextResponse.json({error:'Unable to request replacement recovery right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
