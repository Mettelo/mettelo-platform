import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';
import {projectCompletionReadiness,type CompletionReadiness} from '@/lib/project-completion-readiness';

function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}

export async function POST(request:Request){
 try{
  const body=await request.json();const action=clean(body.action,50),projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
  const [{data:run},{data:project},{data:architect}]=await Promise.all([
   db.from('project_runs').select('id,status,run_number,recruitment_open,completed_at').eq('id',runId).eq('project_id',projectId).maybeSingle(),
   db.from('projects').select('id,title,project_type,team_size_threshold').eq('id',projectId).maybeSingle(),
   db.from('project_architect_assignments').select('id').eq('project_id',projectId).eq('user_id',user.id).eq('assignment_status','active').limit(1).maybeSingle()
  ]);
  if(!run||!project)return NextResponse.json({error:'Project run not found.'},{status:404});const isAdmin=user.app_metadata?.role==='admin';const canReview=isAdmin||Boolean(architect);

  if(action==='request'){
   if(project.project_type==='open')return NextResponse.json({error:'Open project cohorts do not use completion review. They auto-complete after an authorised final submission satisfies every configured condition.'},{status:409});
   return NextResponse.json({error:'Partner completion review begins automatically when an authorised final submission is submitted.'},{status:409});
  }

  if(action==='review'){
   if(project.project_type!=='partner')return NextResponse.json({error:'Only Partner projects use reviewer-gated completion.'},{status:409});
   if(!canReview)return NextResponse.json({error:'Admin or the assigned Project Architect is required to review Partner completion. The Project Leader cannot approve their own team completion.'},{status:403});const requestId=clean(body.request_id,80),decision=clean(body.decision,40),notes=clean(body.review_notes,2500);if(!requestId||!['approved','changes_requested'].includes(decision))return NextResponse.json({error:'Choose a completion request and decision.'},{status:400});if(decision==='changes_requested'&&!notes)return NextResponse.json({error:'Explain what must change before the Partner project can be resubmitted.'},{status:400});
   if(run.status==='completed')return NextResponse.json({ok:true,idempotent:true,completed_at:run.completed_at,message:'Partner project is already completed.'});
   if(run.status!=='review')return NextResponse.json({error:'This project run is not currently in completion review.'},{status:409});
   const {data:completion}=await db.from('project_completion_requests').select('*').eq('id',requestId).eq('project_id',projectId).eq('project_run_id',runId).eq('status','pending').maybeSingle();if(!completion)return NextResponse.json({error:'Pending Partner completion request not found.'},{status:409});
   if(decision==='approved'){
    const {data:rawReadiness,error:readinessError}=await db.rpc('project_run_completion_readiness',{target_run:runId});if(readinessError)throw readinessError;const readiness=projectCompletionReadiness(rawReadiness as CompletionReadiness|null);if(!readiness.ready)return NextResponse.json({error:'Project completion requirements changed and are no longer satisfied.',blockers:readiness.blockers,readiness},{status:409});
   }
   const now=new Date().toISOString();const {data:item,error}=await db.from('project_completion_requests').update({status:decision,review_notes:notes||null,reviewed_by_user_id:user.id,reviewed_at:now}).eq('id',requestId).eq('project_id',projectId).eq('project_run_id',runId).eq('status','pending').select('*').maybeSingle();if(error)throw error;if(!item)return NextResponse.json({error:'This completion review was already decided by another reviewer.'},{status:409});
   const {data:leads}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('team_role','project_lead').in('membership_status',['active','completed']);
   if(decision==='changes_requested'){
    const {data:returnedRun}=await db.from('project_runs').update({status:'active',recruitment_open:false,completion_requested_at:null,updated_at:now}).eq('id',runId).eq('project_id',projectId).eq('status','review').select('id').maybeSingle();if(!returnedRun)return NextResponse.json({error:'Project completion state changed while review was being decided.'},{status:409});
    await db.from('project_collaboration_needs').update({status:'closed',closed_reason:'phase19_changes_required',closed_at:now,updated_at:now}).eq('project_id',projectId).eq('project_run_id',runId).eq('status','active');
    await db.from('project_member_collaboration_invitations').update({status:'revoked',revoked_at:now,updated_at:now}).eq('project_id',projectId).eq('project_run_id',runId).eq('status','pending');
    await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'partner_completion_changes_requested',actor_type:'user',actor_user_id:user.id,from_status:'review',to_status:'active',metadata:{request_id:requestId,recruitment_frozen:true}});
    for(const lead of leads||[])await notifyUser(db,{userId:lead.user_id,email:await emailFor(db,lead.user_id),projectId,type:'project_completion_review',eventKey:'contribution_review',title:'Partner completion needs changes',body:`A secure completion-review update is available in Mettelo for ${project.title}.`,actionUrl:`/member/projects/${projectId}?run=${runId}#completion`,subject:`Completion review update: ${project.title}`,dedupeKey:`completion:${requestId}:changes`});
    return NextResponse.json({ok:true,item,recruitment_frozen:true,message:'Changes requested. Delivery work is active again, but recruitment remains closed during the completion cycle.'});
   }
   const {data:completedRun}=await db.from('project_runs').update({status:'completed',recruitment_open:false,completed_at:now,updated_at:now}).eq('id',runId).eq('project_id',projectId).eq('status','review').is('completed_at',null).select('id,completed_at').maybeSingle();if(!completedRun)return NextResponse.json({error:'Project completion was already committed by another reviewer.'},{status:409});await db.from('project_members').update({membership_status:'completed',completed_at:now}).eq('project_run_id',runId).eq('membership_status','active');await db.from('projects').update({status:'completed',updated_at:now}).eq('id',projectId);await db.from('project_collaboration_needs').update({status:'closed',closed_reason:'phase19_completed',closed_at:now,updated_at:now}).eq('project_id',projectId).eq('project_run_id',runId).eq('status','active');await db.from('project_member_collaboration_invitations').update({status:'revoked',revoked_at:now,updated_at:now}).eq('project_id',projectId).eq('project_run_id',runId).eq('status','pending');await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'partner_completion_approved',actor_type:'user',actor_user_id:user.id,from_status:'review',to_status:'completed',metadata:{request_id:requestId,recruitment_frozen:true}});
   const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','completed');for(const member of members||[])await notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_completed',eventKey:'project_kickoff',title:'Partner project completed',body:`Team ${run.run_number} for ${project.title} has passed project-level completion review. Individual Verified Proof remains subject to contribution verification.`,actionUrl:`/member/projects/${projectId}?run=${runId}#proof`,subject:`Project completed: ${project.title}`,dedupeKey:`project-run:${runId}:completed`});
   return NextResponse.json({ok:true,item,completed_at:completedRun.completed_at,recruitment_frozen:true,message:'Partner project completion approved.'});
  }
  return NextResponse.json({error:'Unknown completion action.'},{status:400});
 }catch(error){console.error('project completion error',error);return NextResponse.json({error:'Unable to update project completion.'},{status:500})}
}