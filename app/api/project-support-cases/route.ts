import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {notifyAdmins} from '@/lib/notifications';

const CATEGORIES=new Set([
 'technical_access','resource_data','project_scope','project_lead_support',
 'team_collaboration','workload','conduct','accessibility_adjustment','other'
]);
function clean(value:unknown,max=6000){return String(value??'').trim().slice(0,max)}

export async function GET(){
 try{
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const {data:cases,error}=await db.from('project_support_cases')
   .select('id,project_id,project_run_id,category,description,status,resolution,recovery_plan,created_at,updated_at,resolved_at,closed_at')
   .eq('reporter_user_id',user.id).order('created_at',{ascending:false});
  if(error)throw error;
  const ids=(cases??[]).map(item=>item.id);
  let updates:unknown[]=[];
  if(ids.length){
   const result=await db.from('project_support_case_updates')
    .select('id,case_id,action,body,created_at')
    .in('case_id',ids).eq('member_visible',true).order('created_at',{ascending:true});
   if(result.error)throw result.error;
   updates=result.data??[];
  }
  return NextResponse.json({cases:cases??[],updates},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project support case read error',error instanceof Error?error.message:'support read failed');
  return NextResponse.json({error:'Unable to load your support cases right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}

export async function POST(request:Request){
 try{
  const body=await request.json();
  const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);
  const category=clean(body.category,64),description=clean(body.description,6000);
  if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
  if(!CATEGORIES.has(category))return NextResponse.json({error:'Choose a valid support category.'},{status:422});
  if(description.length<20)return NextResponse.json({error:'Add enough detail for the support team to understand what needs attention.'},{status:422});

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const [{data:membership},{data:run}]=await Promise.all([
   db.from('project_members').select('id,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
   db.from('project_runs').select('id').eq('id',runId).eq('project_id',projectId).maybeSingle()
  ]);
  if(!run)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(!membership||membership.membership_status!=='active')return NextResponse.json({error:'Only an active member of this exact project run can create a support case.'},{status:403});

  const {data:created,error}=await db.from('project_support_cases').insert({
   project_id:projectId,project_run_id:runId,reporter_user_id:user.id,category,description,status:'open'
  }).select('id,project_id,project_run_id,category,description,status,created_at,updated_at').single();
  if(error)throw error;
  const {error:updateError}=await db.from('project_support_case_updates').insert({
   case_id:created.id,actor_user_id:user.id,action:'created',member_visible:true,
   body:'Your private support case was submitted. An authorized Mettelo administrator will review it.'
  });
  if(updateError)throw updateError;

  // Deliberately generic. Category, description and any future safeguarding detail
  // remain in the authenticated support surface and never enter email/outbox copy.
  try{
   await notifyAdmins(db,{
    projectId,type:'project_support_case',eventKey:'project_support_case',
    title:'A private project support case needs review',
    body:'A project member submitted a private support case. Open Mettelo Admin to review it securely.',
    actionUrl:`/admin/project-support?case=${encodeURIComponent(created.id)}`,
    dedupeKey:`phase17:support:${created.id}:created`
   });
  }catch(notificationError){
   console.error('project support notification error',notificationError instanceof Error?notificationError.message:'notification failed');
  }

  return NextResponse.json({ok:true,case:created},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project support case create error',error instanceof Error?error.message:'support create failed');
  return NextResponse.json({error:'Unable to create your private support case right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}

export async function PATCH(request:Request){
 try{
  const body=await request.json();
  const caseId=clean(body.case_id,80),responseText=clean(body.response,6000);
  if(!caseId)return NextResponse.json({error:'Support case is required.'},{status:400});
  if(responseText.length<2)return NextResponse.json({error:'Add your response before sending it.'},{status:422});

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const {data:current,error:loadError}=await db.from('project_support_cases')
   .select('id,project_id,project_run_id,reporter_user_id,status,updated_at')
   .eq('id',caseId).eq('reporter_user_id',user.id).maybeSingle();
  if(loadError)throw loadError;
  if(!current)return NextResponse.json({error:'Support case not found.'},{status:404});
  if(current.status==='resolved'||current.status==='closed')return NextResponse.json({error:'Resolved or closed support cases are read-only.'},{status:409});
  if(current.status!=='awaiting_member')return NextResponse.json({error:'A response can be sent when the support team has requested more information.'},{status:409});

  // Optimistic status guard prevents a member response from overwriting a concurrent
  // Admin transition. The service role is used only after reporter ownership is checked.
  const {data:updated,error:updateError}=await db.from('project_support_cases')
   .update({status:'under_review'})
   .eq('id',caseId).eq('reporter_user_id',user.id).eq('status','awaiting_member').eq('updated_at',current.updated_at)
   .select('id,status,updated_at').maybeSingle();
  if(updateError)throw updateError;
  if(!updated)return NextResponse.json({error:'This support case changed before your response was saved. Refresh and review the latest update.'},{status:409});

  const {error:eventError}=await db.from('project_support_case_updates').insert({
   case_id:caseId,actor_user_id:user.id,action:'member_update',body:responseText,member_visible:true,
   metadata:{from_status:'awaiting_member',to_status:'under_review',reporter_response:true}
  });
  if(eventError)throw eventError;
  const {error:auditError}=await db.from('project_activity_log').insert({
   project_id:current.project_id,project_run_id:current.project_run_id,event_type:'support_case_member_update',
   actor_type:'user',actor_user_id:user.id,from_status:'awaiting_member',to_status:'under_review',
   metadata:{support_case_id:caseId,member_response_received:true}
  });
  if(auditError)throw auditError;

  try{
   await notifyAdmins(db,{
    projectId:current.project_id,type:'project_support_case_update',eventKey:'project_support_case',
    title:'A private support case has a member response',
    body:'A member responded to a secure support information request. Open Mettelo Admin to review it.',
    actionUrl:`/admin/project-support?case=${encodeURIComponent(caseId)}`,
    dedupeKey:`phase17:support:${caseId}:member-response:${updated.updated_at}`
   });
  }catch(notificationError){
   console.error('project support response notification error',notificationError instanceof Error?notificationError.message:'notification failed');
  }

  return NextResponse.json({ok:true,case:updated},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project support case response error',error instanceof Error?error.message:'support response failed');
  return NextResponse.json({error:'Unable to send your secure support response right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
