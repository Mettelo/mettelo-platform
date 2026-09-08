import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {notifyUser} from '@/lib/notifications';

function clean(value:unknown,max=12000){return String(value??'').trim().slice(0,max)}
function rawText(value:unknown){return String(value??'').trim()}
function safeErrorCode(error:unknown){if(error&&typeof error==='object'){const value=error as{code?:unknown;name?:unknown};if(typeof value.code==='string'&&value.code)return value.code;if(typeof value.name==='string'&&value.name)return value.name}return'UNCLASSIFIED'}
const ACTIONS=new Set(['review','assign_self','assign_admin','request_information','record_recovery_plan','escalate_safeguarding','resolve','close','reopen']);
const MEMBER_CONTENT_ACTIONS=new Set(['request_information','record_recovery_plan','resolve']);

async function adminContext(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return {error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'projects.support.manage'))return {error:NextResponse.json({error:'Private project support access requires explicit support-case capability.'},{status:403})};
 const db=serviceDb();
 if(!db)return {error:NextResponse.json({error:'Project service is not configured.'},{status:503})};
 return {user,db,canSafeguard:hasAdminCapability(user,'projects.safeguarding.manage'),canAssignHandlers:hasAdminCapability(user,'admin.access.manage')};
}

export async function GET(request:Request){
 try{
  const context=await adminContext();
  if('error'in context)return context.error;
  const {user,db,canSafeguard,canAssignHandlers}=context;
  const url=new URL(request.url),caseId=clean(url.searchParams.get('case'),80);
  let query=db.from('project_support_cases').select('*').order('updated_at',{ascending:false}).limit(100);
  if(!canSafeguard)query=query.is('safeguarding_escalated_at',null);
  if(caseId)query=query.eq('id',caseId);
  const {data:cases,error}=await query;
  if(error)throw error;
  const ids=(cases??[]).map(item=>item.id);
  let updates:unknown[]=[];
  if(ids.length){const result=await db.from('project_support_case_updates').select('*').in('case_id',ids).order('created_at',{ascending:true});if(result.error)throw result.error;updates=result.data??[];}
  let handlers:{id:string;email:string|null}[]=[];
  if(canAssignHandlers){
   const listed=await db.auth.admin.listUsers({page:1,perPage:1000});
   if(listed.error)throw listed.error;
   handlers=listed.data.users.filter(candidate=>candidate.id!==user.id&&hasAdminCapability(candidate,'projects.support.manage')).map(candidate=>({id:candidate.id,email:candidate.email||null}));
  }
  return NextResponse.json({cases:cases??[],updates,handlers,can_assign_handlers:canAssignHandlers},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('admin support case read error',{code:safeErrorCode(error)});
  return NextResponse.json({error:'Unable to load private support cases right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}

export async function POST(request:Request){
 try{
  const context=await adminContext();
  if('error'in context)return context.error;
  const {user,db,canSafeguard,canAssignHandlers}=context;
  const body=await request.json();
  const caseId=clean(body.case_id,80),action=clean(body.action,64),note=rawText(body.note),assignedAdminUserId=clean(body.assigned_admin_user_id,80);
  if(!caseId||!ACTIONS.has(action))return NextResponse.json({error:'Support case and valid action are required.'},{status:400});
  if(note.length>12000)return NextResponse.json({error:'Secure case notes cannot exceed 12,000 characters.'},{status:422});
  if(MEMBER_CONTENT_ACTIONS.has(action)&&note.length>6000)return NextResponse.json({error:'This member-visible case update cannot exceed 6,000 characters.'},{status:422});
  if(MEMBER_CONTENT_ACTIONS.has(action)&&!note)return NextResponse.json({error:'Add the required case update before continuing.'},{status:422});
  if(action==='escalate_safeguarding'&&body.confirmed!==true)return NextResponse.json({error:'Confirm safeguarding escalation before continuing.'},{status:422});
  if(action==='assign_admin'&&!canAssignHandlers)return NextResponse.json({error:'Reassigning private support ownership requires Admin-access management capability.'},{status:403});
  if(action==='assign_admin'&&!assignedAdminUserId)return NextResponse.json({error:'Choose an authorized support Admin.'},{status:422});

  const {data:current,error:loadError}=await db.from('project_support_cases').select('*').eq('id',caseId).maybeSingle();
  if(loadError)throw loadError;
  if(!current)return NextResponse.json({error:'Support case not found.'},{status:404});
  if(current.safeguarding_escalated_at&&!canSafeguard)return NextResponse.json({error:'This safeguarding case requires explicit safeguarding capability.'},{status:403});
  if(action==='escalate_safeguarding'&&!canSafeguard)return NextResponse.json({error:'Safeguarding escalation requires explicit safeguarding capability.'},{status:403});
  if(action==='escalate_safeguarding'&&note){const combined=[current.internal_notes,note].filter(Boolean).join('\n\n');if(combined.length>12000)return NextResponse.json({error:'This safeguarding note would exceed the 12,000-character secure-note limit. Shorten the new note before continuing.'},{status:422});}
  if(current.status==='closed'&&action!=='reopen')return NextResponse.json({error:'Reopen the case before applying another action.'},{status:409});
  if(current.status==='resolved'&&!['close','reopen'].includes(action))return NextResponse.json({error:'Resolved cases can only be closed or reopened.'},{status:409});
  if(action==='review'&&current.status!=='open')return NextResponse.json({error:'Only an open case can enter review directly.'},{status:409});
  if(action==='assign_self'&&current.assigned_admin_user_id&&current.assigned_admin_user_id!==user.id)return NextResponse.json({error:'This case is already assigned to another authorized handler. Use governed reassignment instead.'},{status:409});

  let assignedHandler:{id:string;email:string|null}|null=null;
  if(action==='assign_admin'){
   const target=await db.auth.admin.getUserById(assignedAdminUserId);
   if(target.error||!target.data.user||!hasAdminCapability(target.data.user,'projects.support.manage'))return NextResponse.json({error:'The selected account is not an authorized private-support Admin.'},{status:422});
   if(current.safeguarding_escalated_at&&!hasAdminCapability(target.data.user,'projects.safeguarding.manage'))return NextResponse.json({error:'A safeguarding case can only be assigned to an Admin with safeguarding capability.'},{status:422});
   assignedHandler={id:target.data.user.id,email:target.data.user.email||null};
  }

  const patch:Record<string,unknown>={};
  let auditAction='reviewed',memberVisible=false,memberBody:string|null=null;
  const auditMetadata:Record<string,unknown>={from_status:current.status,admin_action:true};
  if(action==='review'){patch.status='under_review';auditAction='reviewed';}
  if(action==='assign_self'){patch.assigned_admin_user_id=user.id;if(current.status==='open')patch.status='under_review';auditAction='assigned';auditMetadata.assigned_admin_user_id=user.id;}
  if(action==='assign_admin'&&assignedHandler){patch.assigned_admin_user_id=assignedHandler.id;if(current.status==='open')patch.status='under_review';auditAction='assigned';auditMetadata.assigned_admin_user_id=assignedHandler.id;auditMetadata.reassigned_by=user.id;}
  if(action==='request_information'){patch.status='awaiting_member';auditAction='information_requested';memberVisible=true;memberBody=note;}
  if(action==='record_recovery_plan'){patch.recovery_plan=note;patch.status='recovery_in_progress';auditAction='recovery_plan_recorded';memberVisible=true;memberBody='A recovery plan has been recorded for your support case. Open the case in Mettelo to review the secure update.';}
  if(action==='escalate_safeguarding'){patch.status='escalated';patch.safeguarding_escalated_at=current.safeguarding_escalated_at||new Date().toISOString();auditAction='safeguarding_escalated';if(note)patch.internal_notes=[current.internal_notes,note].filter(Boolean).join('\n\n');}
  if(action==='resolve'){patch.status='resolved';patch.resolution=note;patch.resolved_at=new Date().toISOString();auditAction='resolved';memberVisible=true;memberBody='Your private support case has been marked resolved. Open Mettelo to review the secure resolution.';}
  if(action==='close'){if(current.status!=='resolved')return NextResponse.json({error:'Resolve the case before closing it.'},{status:409});patch.status='closed';patch.closed_at=new Date().toISOString();auditAction='closed';memberVisible=true;memberBody='Your private support case has been closed. Its secure history remains available in Mettelo.';}
  if(action==='reopen'){if(!['resolved','closed'].includes(current.status))return NextResponse.json({error:'Only a resolved or closed case can be reopened.'},{status:409});patch.status=current.safeguarding_escalated_at?'escalated':'under_review';patch.resolved_at=null;patch.closed_at=null;auditAction='reopened';memberVisible=true;memberBody='Your private support case has been reopened for further review.';}

  const {data:updated,error:updateError}=await db.from('project_support_cases').update(patch).eq('id',caseId).eq('updated_at',current.updated_at).select('*').maybeSingle();
  if(updateError)throw updateError;
  if(!updated)return NextResponse.json({error:'This support case changed before your action was saved. Refresh and review the latest state.'},{status:409});
  auditMetadata.to_status=updated.status;auditMetadata.member_visible=memberVisible;
  const {error:eventError}=await db.from('project_support_case_updates').insert({case_id:caseId,actor_user_id:user.id,action:auditAction,body:memberVisible?memberBody:(note||null),member_visible:memberVisible,metadata:auditMetadata});
  if(eventError)throw eventError;
  const {error:auditError}=await db.from('project_activity_log').insert({project_id:current.project_id,project_run_id:current.project_run_id,event_type:`support_case_${auditAction}`,actor_type:'admin',actor_user_id:user.id,from_status:current.status,to_status:updated.status,metadata:{support_case_id:caseId,action:auditAction,member_visible:memberVisible,...(assignedHandler?{assigned_admin_user_id:assignedHandler.id}:{})}});
  if(auditError)throw auditError;

  if(assignedHandler){try{await notifyUser(db,{userId:assignedHandler.id,email:assignedHandler.email,projectId:current.project_id,type:'project_support_case_assignment',eventKey:'project_support_case',title:'A private project support case was assigned to you',body:'A private project support case requires your authorized review in Mettelo Admin.',actionUrl:`/admin/project-support?case=${encodeURIComponent(caseId)}`,dedupeKey:`phase17:support:${caseId}:assigned:${assignedHandler.id}:${updated.updated_at}`});}catch(notificationError){console.error('support assignment notification error',{code:safeErrorCode(notificationError)})}}
  if(memberVisible){try{const {data:reporter}=await db.auth.admin.getUserById(current.reporter_user_id);await notifyUser(db,{userId:current.reporter_user_id,email:reporter.user?.email||null,projectId:current.project_id,type:'project_support_case_update',eventKey:'project_support_case',title:'Your private support case has an update',body:'A secure update is available on your private project support case in Mettelo.',actionUrl:`/member/projects/${current.project_id}?run=${encodeURIComponent(current.project_run_id)}&view=support`,dedupeKey:`phase17:support:${caseId}:${auditAction}:${updated.updated_at}`});}catch(notificationError){console.error('admin support notification error',{code:safeErrorCode(notificationError)})}}
  return NextResponse.json({ok:true,case:updated},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('admin support case action error',{code:safeErrorCode(error)});
  return NextResponse.json({error:'Unable to update this private support case right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}