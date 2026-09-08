import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {notifyUser} from '@/lib/notifications';

const ACTIONS=new Set(['reassign_responsibility','change_lead','request_replacement','remove_member']);
function clean(value:unknown,max=200){return String(value??'').trim().slice(0,max)}
function message(error:unknown){return typeof error==='object'&&error&&'message'in error?String((error as{message?:unknown}).message||''):''}

export async function POST(request:Request){
 try{
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!hasAdminCapability(user,'projects.support.manage')||!hasAdminCapability(user,'projects.manage')){
   return NextResponse.json({error:'Consequential support recovery requires both private-support and project-management capability.'},{status:403});
  }
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const body=await request.json();
  const caseId=clean(body.case_id,80),action=clean(body.action,64),expectedUpdatedAt=clean(body.expected_updated_at,80);
  const targetMembershipId=clean(body.target_membership_id,80)||null;
  const replacementMembershipId=clean(body.replacement_membership_id,80)||null;
  const assignmentId=clean(body.assignment_id,80)||null;
  if(!caseId||!ACTIONS.has(action)||!expectedUpdatedAt)return NextResponse.json({error:'Support case, action and current case version are required.'},{status:400});
  if(body.confirmed!==true)return NextResponse.json({error:'Confirm this consequential project action before continuing.'},{status:422});

  const {data:current,error:caseError}=await db.from('project_support_cases')
   .select('id,project_id,project_run_id,reporter_user_id,status,updated_at,safeguarding_escalated_at')
   .eq('id',caseId).maybeSingle();
  if(caseError)throw caseError;
  if(!current)return NextResponse.json({error:'Support case not found.'},{status:404});
  if(current.safeguarding_escalated_at&&!hasAdminCapability(user,'projects.safeguarding.manage')){
   return NextResponse.json({error:'This safeguarding case requires explicit safeguarding capability.'},{status:403});
  }
  if(current.updated_at!==expectedUpdatedAt)return NextResponse.json({error:'This support case changed. Refresh before applying a consequential action.'},{status:409});
  if(['resolved','closed'].includes(current.status))return NextResponse.json({error:'Reopen the case before applying a recovery action.'},{status:409});

  const {data:result,error}=await db.rpc('phase17_execute_support_recovery',{
   p_case_id:caseId,p_action:action,p_actor_user_id:user.id,p_expected_updated_at:expectedUpdatedAt,
   p_target_membership_id:targetMembershipId,p_replacement_membership_id:replacementMembershipId,p_assignment_id:assignmentId
  });
  if(error){
   const detail=message(error);
   if(detail.includes('SUPPORT_CASE_STALE'))return NextResponse.json({error:'This support case changed. Refresh before applying a consequential action.'},{status:409});
   if(detail.includes('RESPONSIBILITY_REASSIGNMENT_CONTEXT_REQUIRED'))return NextResponse.json({error:'Choose the active responsibility and the member who should receive it.'},{status:422});
   if(detail.includes('LEAD_REPLACEMENT_MEMBERSHIP_REQUIRED'))return NextResponse.json({error:'Choose the active member who should become Project Lead.'},{status:422});
   if(detail.includes('REMOVAL_TARGET_REQUIRED'))return NextResponse.json({error:'Choose the active member to remove from this run.'},{status:422});
   if(detail.includes('REPLACEMENT_JOINING_NOT_ALLOWED'))return NextResponse.json({error:'Replacement is not allowed by the current capacity or joining-cutoff policy.'},{status:409});
   throw error;
  }

  const {data:updated}=await db.from('project_support_cases').select('id,status,updated_at').eq('id',caseId).single();
  try{
   const {data:reporter}=await db.auth.admin.getUserById(current.reporter_user_id);
   await notifyUser(db,{
    userId:current.reporter_user_id,email:reporter.user?.email||null,projectId:current.project_id,
    type:'project_support_case_update',eventKey:'project_support_case',title:'Your private support case has an update',
    body:'A recovery action has been recorded on your private project support case. Open Mettelo to review the secure case status.',
    actionUrl:`/member/projects/${current.project_id}?run=${encodeURIComponent(current.project_run_id)}&view=support`,
    dedupeKey:`phase17:support:${caseId}:recovery:${action}:${updated?.updated_at||expectedUpdatedAt}`
   });
  }catch(notificationError){
   console.error('support recovery notification error',notificationError instanceof Error?notificationError.message:'notification failed');
  }
  return NextResponse.json({ok:true,result,case:updated},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('support recovery action error',error instanceof Error?error.message:'recovery action failed');
  return NextResponse.json({error:'Unable to apply this support recovery action right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
