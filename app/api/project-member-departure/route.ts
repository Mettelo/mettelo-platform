import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {notifyAdmins,notifyUser} from '@/lib/notifications';

function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
function rpcMessage(error:unknown){return typeof error==='object'&&error&&'message'in error?String((error as{message?:unknown}).message||''):''}

export async function POST(request:Request){
 try{
  const body=await request.json();
  const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80),action=clean(body.action,24);
  const handover=clean(body.handover_note,2000);
  if(!projectId||!runId||!['request','complete'].includes(action))return NextResponse.json({error:'Project, project run and departure action are required.'},{status:400});
  if(action==='request'&&(handover.length<20||handover.length>2000))return NextResponse.json({error:'Add a handover of 20 to 2,000 characters covering current work, blockers and useful next steps. Do not include passwords, credentials or sensitive personal information.'},{status:422});

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const [{data:membership},{data:run}]=await Promise.all([
   db.from('project_members').select('id,membership_status,departure_state,team_role').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
   db.from('project_runs').select('id,status,has_started,run_number').eq('id',runId).eq('project_id',projectId).maybeSingle()
  ]);
  if(!run)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(!membership||membership.membership_status!=='active')return NextResponse.json({error:'Only an active member of this exact project run can use the departure flow.'},{status:403});
  if(run.status!=='active'||run.has_started!==true)return NextResponse.json({error:'Member departure is available only after the project run has started.'},{status:409});
  if(action==='complete'&&membership.departure_state!=='leaving')return NextResponse.json({error:'Record the handover before completing departure.'},{status:409});

  const {data:result,error}=await db.rpc('phase16_transition_member_departure',{
   p_project_id:projectId,p_run_id:runId,p_user_id:user.id,p_action:action,p_handover_note:action==='request'?handover:null
  });
  if(error){
   const message=rpcMessage(error);
   if(message.includes('HANDOVER_LENGTH_INVALID'))return NextResponse.json({error:'The handover must be between 20 and 2,000 characters.'},{status:422});
   if(message.includes('DEPARTURE_REQUEST_REQUIRED'))return NextResponse.json({error:'Record the handover before completing departure.'},{status:409});
   if(message.includes('ACTIVE_MEMBERSHIP_REQUIRED')||message.includes('ACTIVE_STARTED_RUN_REQUIRED'))return NextResponse.json({error:'Your project membership changed before departure could be recorded.'},{status:409});
   throw error;
  }

  const {data:lead}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('team_role','project_lead').eq('membership_status','active').neq('user_id',user.id).limit(1).maybeSingle();
  const state=action==='request'?'leaving':'left';
  const title=action==='request'?'A project member is preparing to leave':'A project member has left the run';
  const copy=action==='request'?'A member recorded a handover. Review delivery ownership and replacement readiness in Mettelo Lab.':'A member has left. Their history is retained, private active-member access is revoked, and eligible replacement capacity has been recalculated.';
  const actionUrl=`/member/projects/${projectId}?run=${encodeURIComponent(runId)}&view=team`;
  const dedupe=`phase16:${runId}:${user.id}:${state}`;

  try{
   if(lead?.user_id){
    const {data:leadAuth}=await db.auth.admin.getUserById(lead.user_id);
    await notifyUser(db,{userId:lead.user_id,email:leadAuth.user?.email||null,projectId,type:'project_member_exit',eventKey:'project_member_exit',title,body:copy,actionUrl,dedupeKey:`${dedupe}:lead`});
   }
   await notifyAdmins(db,{projectId,type:'project_member_exit',eventKey:'project_member_exit',title,body:copy,actionUrl,dedupeKey:`${dedupe}:admin`});
  }catch(notificationError){
   console.error('project member departure notification error',notificationError instanceof Error?notificationError.message:'notification failed');
  }

  return NextResponse.json({ok:true,state,result},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project member departure error',error instanceof Error?error.message:'departure failed');
  return NextResponse.json({error:'Unable to update your project departure right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
