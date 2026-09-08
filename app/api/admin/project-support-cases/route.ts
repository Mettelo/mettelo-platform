import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {notifyUser} from '@/lib/notifications';

function clean(value:unknown,max=12000){return String(value??'').trim().slice(0,max)}
const ACTIONS=new Set(['review','assign_self','request_information','record_recovery_plan','escalate_safeguarding','resolve','close','reopen']);

async function adminContext(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return {error:NextResponse.json({error:'Authentication required.'},{status:401})};
 if(!hasAdminCapability(user,'projects.support.manage'))return {error:NextResponse.json({error:'Private project support access requires explicit support-case capability.'},{status:403})};
 const db=serviceDb();
 if(!db)return {error:NextResponse.json({error:'Project service is not configured.'},{status:503})};
 return {user,db,canSafeguard:hasAdminCapability(user,'projects.safeguarding.manage')};
}

export async function GET(request:Request){
 try{
  const context=await adminContext();
  if('error'in context)return context.error;
  const {db,canSafeguard}=context;
  const url=new URL(request.url),caseId=clean(url.searchParams.get('case'),80);
  let query=db.from('project_support_cases').select('*').order('updated_at',{ascending:false}).limit(100);
  if(!canSafeguard)query=query.is('safeguarding_escalated_at',null);
  if(caseId)query=query.eq('id',caseId);
  const {data:cases,error}=await query;
  if(error)throw error;
  const ids=(cases??[]).map(item=>item.id);
  let updates:unknown[]=[];
  if(ids.length){
   const result=await db.from('project_support_case_updates').select('*').in('case_id',ids).order('created_at',{ascending:true});
   if(result.error)throw result.error;
   updates=result.data??[];
  }
  return NextResponse.json({cases:cases??[],updates},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('admin support case read error',error instanceof Error?error.message:'admin support read failed');
  return NextResponse.json({error:'Unable to load private support cases right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}

export async function POST(request:Request){
 try{
  const context=await adminContext();
  if('error'in context)return context.error;
  const {user,db,canSafeguard}=context;
  const body=await request.json();
  const caseId=clean(body.case_id,80),action=clean(body.action,64),note=clean(body.note,12000);
  if(!caseId||!ACTIONS.has(action))return NextResponse.json({error:'Support case and valid action are required.'},{status:400});
  if(['request_information','record_recovery_plan','resolve'].includes(action)&&!note)return NextResponse.json({error:'Add the required case update before continuing.'},{status:422});

  const {data:current,error:loadError}=await db.from('project_support_cases').select('*').eq('id',caseId).maybeSingle();
  if(loadError)throw loadError;
  if(!current)return NextResponse.json({error:'Support case not found.'},{status:404});
  if(current.safeguarding_escalated_at&&!canSafeguard)return NextResponse.json({error:'This safeguarding case requires explicit safeguarding capability.'},{status:403});
  if(action==='escalate_safeguarding'&&!canSafeguard)return NextResponse.json({error:'Safeguarding escalation requires explicit safeguarding capability.'},{status:403});
  if(current.status==='closed'&&action!=='reopen')return NextResponse.json({error:'Reopen the case before applying another action.'},{status:409});
  if(current.status==='resolved'&&!['close','reopen'].includes(action))return NextResponse.json({error:'Resolved cases can only be closed or reopened.'},{status:409});
  if(action==='review'&&current.status!=='open')return NextResponse.json({error:'Only an open case can enter review directly.'},{status:409});
  if(action==='assign_self'&&current.assigned_admin_user_id&&current.assigned_admin_user_id!==user.id)return NextResponse.json({error:'This case is already assigned to another authorized handler. Refresh before reassigning it.'},{status:409});

  const patch:Record<string,unknown>={};
  let auditAction='reviewed',memberVisible=false,memberBody:string|null=null;
  if(action==='review'){patch.status='under_review';auditAction='reviewed';}
  if(action==='assign_self'){patch.assigned_admin_user_id=user.id;if(current.status==='open')patch.status='under_review';auditAction='assigned';}
  if(action==='request_information'){
   patch.status='awaiting_member';auditAction='information_requested';memberVisible=true;
   memberBody=note.slice(0,6000);
  }
  if(action==='record_recovery_plan'){
   patch.recovery_plan=note.slice(0,6000);patch.status='recovery_in_progress';auditAction='recovery_plan_recorded';
   memberVisible=true;memberBody='A recovery plan has been recorded for your support case. Open the case in Mettelo to review the secure update.';
  }
  if(action==='escalate_safeguarding'){
   patch.status='escalated';patch.safeguarding_escalated_at=current.safeguarding_escalated_at||new Date().toISOString();auditAction='safeguarding_escalated';
   if(note)patch.internal_notes=[current.internal_notes,note].filter(Boolean).join('\n\n').slice(0,12000);
  }
  if(action==='resolve'){
   patch.status='resolved';patch.resolution=note.slice(0,6000);patch.resolved_at=new Date().toISOString();auditAction='resolved';
   memberVisible=true;memberBody='Your private support case has been marked resolved. Open Mettelo to review the secure resolution.';
  }
  if(action==='close'){
   if(current.status!=='resolved')return NextResponse.json({error:'Resolve the case before closing it.'},{status:409});
   patch.status='closed';patch.closed_at=new Date().toISOString();auditAction='closed';memberVisible=true;
   memberBody='Your private support case has been closed. Its secure history remains available in Mettelo.';
  }
  if(action==='reopen'){
   if(!['resolved','closed'].includes(current.status))return NextResponse.json({error:'Only a resolved or closed case can be reopened.'},{status:409});
   patch.status=current.safeguarding_escalated_at?'escalated':'under_review';patch.resolved_at=null;patch.closed_at=null;auditAction='reopened';memberVisible=true;
   memberBody='Your private support case has been reopened for further review.';
  }

  // Optimistic concurrency guard: a second Admin acting on a stale copy receives
  // a conflict instead of silently overwriting the canonical assignment/status.
  const {data:updated,error:updateError}=await db.from('project_support_cases').update(patch)
   .eq('id',caseId).eq('updated_at',current.updated_at).select('*').maybeSingle();
  if(updateError)throw updateError;
  if(!updated)return NextResponse.json({error:'This support case changed before your action was saved. Refresh and review the latest state.'},{status:409});

  const {error:eventError}=await db.from('project_support_case_updates').insert({
   case_id:caseId,actor_user_id:user.id,action:auditAction,body:memberVisible?memberBody:(note||null),member_visible:memberVisible,
   metadata:{from_status:current.status,to_status:updated.status,admin_action:true}
  });
  if(eventError)throw eventError;

  // Global project audit intentionally contains only non-sensitive operational metadata.
  const {error:auditError}=await db.from('project_activity_log').insert({
   project_id:current.project_id,project_run_id:current.project_run_id,event_type:`support_case_${auditAction}`,
   actor_type:'admin',actor_user_id:user.id,from_status:current.status,to_status:updated.status,
   metadata:{support_case_id:caseId,action:auditAction,member_visible:memberVisible}
  });
  if(auditError)throw auditError;

  if(memberVisible){
   try{
    const {data:reporter}=await db.auth.admin.getUserById(current.reporter_user_id);
    await notifyUser(db,{
     userId:current.reporter_user_id,email:reporter.user?.email||null,projectId:current.project_id,
     type:'project_support_case_update',eventKey:'project_support_case',title:'Your private support case has an update',
     body:'A secure update is available on your private project support case in Mettelo.',
     actionUrl:`/member/projects/${current.project_id}?run=${encodeURIComponent(current.project_run_id)}&view=support`,
     dedupeKey:`phase17:support:${caseId}:${auditAction}:${updated.updated_at}`
    });
   }catch(notificationError){
    console.error('admin support notification error',notificationError instanceof Error?notificationError.message:'notification failed');
   }
  }
  return NextResponse.json({ok:true,case:updated},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('admin support case action error',error instanceof Error?error.message:'admin support action failed');
  return NextResponse.json({error:'Unable to update this private support case right now.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
