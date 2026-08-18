import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyAdmins,notifyUser,serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}

export async function POST(request:Request){
 try{
  const body=await request.json();const action=clean(body.action,50),projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
  const [{data:run},{data:project},{data:membership},{data:architect}]=await Promise.all([
   db.from('project_runs').select('id,status,run_number').eq('id',runId).eq('project_id',projectId).maybeSingle(),
   db.from('projects').select('id,title,project_type,team_size_threshold').eq('id',projectId).maybeSingle(),
   db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).maybeSingle(),
   db.from('project_architect_assignments').select('id').eq('project_id',projectId).eq('user_id',user.id).eq('assignment_status','active').limit(1).maybeSingle()
  ]);
  if(!run||!project)return NextResponse.json({error:'Project run not found.'},{status:404});const isAdmin=user.app_metadata?.role==='admin';const canReview=isAdmin||Boolean(architect);

  if(action==='request'){
   if(project.project_type==='open')return NextResponse.json({error:'Open project cohorts do not use completion review. They auto-complete after an authorised final Proof submission satisfies every configured condition.'},{status:409});
   return NextResponse.json({error:'Partner completion review begins automatically when authorised final Proof is submitted. Use the final Proof action instead.'},{status:409});
  }

  if(action==='review'){
   if(project.project_type!=='partner')return NextResponse.json({error:'Only Partner projects use reviewer-gated completion.'},{status:409});
   if(!canReview)return NextResponse.json({error:'Admin or the assigned Project Architect is required to review Partner completion. The Project Leader cannot approve their own team completion.'},{status:403});const requestId=clean(body.request_id,80),decision=clean(body.decision,40),notes=clean(body.review_notes,2500);if(!requestId||!['approved','changes_requested'].includes(decision))return NextResponse.json({error:'Choose a completion request and decision.'},{status:400});if(decision==='changes_requested'&&!notes)return NextResponse.json({error:'Explain what must change before the Partner project can be resubmitted.'},{status:400});
   const {data:completion}=await db.from('project_completion_requests').select('*').eq('id',requestId).eq('project_id',projectId).eq('project_run_id',runId).eq('status','pending').maybeSingle();if(!completion)return NextResponse.json({error:'Pending Partner completion request not found.'},{status:404});const now=new Date().toISOString();
   const {data:item,error}=await db.from('project_completion_requests').update({status:decision,review_notes:notes||null,reviewed_by_user_id:user.id,reviewed_at:now}).eq('id',requestId).select('*').single();if(error)throw error;
   const {data:leads}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('team_role','project_lead').in('membership_status',['active','completed']);
   if(decision==='changes_requested'){
    await db.from('project_runs').update({status:'active',completion_requested_at:null,updated_at:now}).eq('id',runId);await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'partner_completion_changes_requested',actor_type:'user',actor_user_id:user.id,from_status:'review',to_status:'active',metadata:{request_id:requestId,review_notes:notes}});
    for(const lead of leads||[])await notifyUser(db,{userId:lead.user_id,email:await emailFor(db,lead.user_id),projectId,type:'project_completion_review',eventKey:'contribution_review',title:'Partner completion needs changes',body:`Completion review for ${project.title} needs changes: ${notes}`,actionUrl:`/member/projects/${projectId}?run=${runId}#completion`,subject:`Completion changes: ${project.title}`,dedupeKey:`completion:${requestId}:changes`});
    return NextResponse.json({ok:true,item,message:'Changes requested. The Partner project is active again.'});
   }
   await db.from('project_runs').update({status:'completed',completed_at:now,updated_at:now}).eq('id',runId);await db.from('project_members').update({membership_status:'completed',completed_at:now}).eq('project_run_id',runId).eq('membership_status','active');await db.from('projects').update({status:'completed',updated_at:now}).eq('id',projectId);await db.from('project_activity_log').insert({project_id:projectId,project_run_id:runId,event_type:'partner_completion_approved',actor_type:'user',actor_user_id:user.id,from_status:'review',to_status:'completed',metadata:{request_id:requestId}});
   const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','completed');for(const member of members||[])await notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_completed',eventKey:'project_kickoff',title:'Partner project completed',body:`Team ${run.run_number} for ${project.title} has passed completion review. Your approved contributions remain available in the project workspace and Proof.`,actionUrl:`/member/projects/${projectId}?run=${runId}#proof`,subject:`Project completed: ${project.title}`,dedupeKey:`project-run:${runId}:completed`});
   return NextResponse.json({ok:true,item,message:'Partner project completion approved.'});
  }
  return NextResponse.json({error:'Unknown completion action.'},{status:400});
 }catch(error){console.error('project completion error',error);return NextResponse.json({error:'Unable to update project completion.'},{status:500})}
}
