import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {notifyAdmins,notifyUser} from '@/lib/notifications';

const REASONS=new Set(['availability_changed','workload','personal_circumstances','role_fit','technical_access','other']);
function clean(value:unknown,max=4000){return String(value??'').trim().slice(0,max)}
function optional(value:unknown,max=4000){const result=clean(value,max);return result||null}
function rpcMessage(error:unknown){return typeof error==='object'&&error&&'message'in error?String((error as{message?:unknown}).message||''):''}

export async function POST(request:Request){
 try{
  const body=await request.json();
  const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80),action=clean(body.action,24);
  const reasonCategory=clean(body.reason_category,64);
  const fields={
   optionalContext:optional(body.optional_context,1000),
   completedWork:optional(body.completed_work,4000),
   openWork:optional(body.open_work,4000),
   fileReferences:optional(body.file_references,4000),
   decisions:optional(body.decisions,4000),
   risks:optional(body.risks,4000),
   recommendations:optional(body.recommendations,4000),
   openResponsibilities:optional(body.open_responsibilities,4000),
   handoverAvailability:optional(body.handover_availability,500)
  };
  if(!projectId||!runId||!['request','complete'].includes(action))return NextResponse.json({error:'Project, project run and departure action are required.'},{status:400});
  if(action==='request'){
   if(!REASONS.has(reasonCategory))return NextResponse.json({error:'Choose a high-level reason for leaving. You do not need to provide sensitive personal details.'},{status:422});
   if(!Object.values(fields).some(Boolean))return NextResponse.json({error:'Add at least one useful handover item, such as completed work, open work, a decision, risk, file reference, responsibility or recommendation.'},{status:422});
  }

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const [{data:membership},{data:run}]=await Promise.all([
   db.from('project_members').select('id,membership_status,departure_state,team_role,left_at').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
   db.from('project_runs').select('id,status,has_started,run_number').eq('id',runId).eq('project_id',projectId).maybeSingle()
  ]);
  if(!run)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(!membership)return NextResponse.json({error:'Only a member of this exact project run can use the departure flow.'},{status:403});

  // Completing departure is an idempotent command. A browser retry after the
  // canonical transition has committed must not fail or emit notifications a
  // second time. New requests remain restricted to active exact-run members.
  if(action==='complete'&&membership.membership_status==='left'&&membership.departure_state==='left'){
   return NextResponse.json({ok:true,state:'left',already_completed:true,left_at:membership.left_at??null},{headers:{'Cache-Control':'private, no-store'}});
  }

  if(membership.membership_status!=='active')return NextResponse.json({error:'Only an active member of this exact project run can use the departure flow.'},{status:403});
  if(run.status!=='active'||run.has_started!==true)return NextResponse.json({error:'Member departure is available only after the project run has started.'},{status:409});
  if(action==='complete'&&membership.departure_state!=='leaving')return NextResponse.json({error:'Record the handover before completing departure.'},{status:409});

  const {data:result,error}=await db.rpc('phase16_transition_member_departure',{
   p_project_id:projectId,p_run_id:runId,p_user_id:user.id,p_action:action,p_handover_note:null,
   p_reason_category:action==='request'?reasonCategory:null,p_optional_context:action==='request'?fields.optionalContext:null,
   p_completed_work:action==='request'?fields.completedWork:null,p_open_work:action==='request'?fields.openWork:null,
   p_file_references:action==='request'?fields.fileReferences:null,p_decisions:action==='request'?fields.decisions:null,
   p_risks:action==='request'?fields.risks:null,p_recommendations:action==='request'?fields.recommendations:null,
   p_open_responsibilities:action==='request'?fields.openResponsibilities:null,
   p_handover_availability:action==='request'?fields.handoverAvailability:null,p_departure_source:'member_initiated'
  });
  if(error){
   const message=rpcMessage(error);
   if(message.includes('EXIT_REASON_REQUIRED'))return NextResponse.json({error:'Choose a high-level reason for leaving.'},{status:422});
   if(message.includes('HANDOVER_CONTENT_REQUIRED'))return NextResponse.json({error:'Add at least one useful handover item.'},{status:422});
   if(message.includes('DEPARTURE_REQUEST_REQUIRED'))return NextResponse.json({error:'Record the handover before completing departure.'},{status:409});
   if(message.includes('ACTIVE_MEMBERSHIP_REQUIRED')||message.includes('ACTIVE_STARTED_RUN_REQUIRED'))return NextResponse.json({error:'Your project membership changed before departure could be recorded.'},{status:409});
   throw error;
  }

  const {data:lead}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('team_role','project_lead').eq('membership_status','active').neq('user_id',user.id).limit(1).maybeSingle();
  const state=action==='request'?'leaving':'left';
  const title=action==='request'?'A project member is preparing to leave':'A project member has left the run';
  const copy=action==='request'?'A member recorded an operational handover. Review delivery ownership and replacement readiness in Mettelo Lab.':'A member has left. Their history is retained, private active-member access is revoked, and eligible replacement capacity has been recalculated.';
  const actionUrl=`/member/projects/${projectId}?run=${encodeURIComponent(runId)}&view=team`;
  const dedupe=`phase16:${runId}:${user.id}:${state}`;

  try{
   if(lead?.user_id){
    const {data:leadAuth}=await db.auth.admin.getUserById(lead.user_id);
    await notifyUser(db,{userId:lead.user_id,email:leadAuth.user?.email||null,projectId,type:'project_member_exit',eventKey:'project_member_exit',title,body:copy,actionUrl,dedupeKey:`${dedupe}:lead`});
   }
   await notifyAdmins(db,{projectId,type:'project_member_exit',eventKey:'project_member_exit',title,body:copy,actionUrl,dedupeKey:`${dedupe}:admin`});
   if(action==='complete'&&user.email){
    await notifyUser(db,{userId:user.id,email:user.email,projectId,type:'project_member_exit_confirmation',eventKey:'project_member_exit',title:'Your project departure is complete',body:'Your active access to this project run has ended. Your historical contribution and eligible verified Proof remain on record.',actionUrl:'/member/projects',dedupeKey:`${dedupe}:member`});
   }
  }catch(notificationError){
   console.error('project member departure notification error',notificationError instanceof Error?notificationError.message:'notification failed');
  }

  return NextResponse.json({ok:true,state,result},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project member departure error',error instanceof Error?error.message:'departure failed');
  return NextResponse.json({error:'Unable to update your project departure right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
