import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}

function rpcStatus(error:{message?:string;code?:string}){
 const message=error.message||'';
 if(error.code==='42501'||message.includes('NOT_AUTHORIZED')||message.includes('AUTHENTICATION_REQUIRED'))return 403;
 if(error.code==='P0002'||message.includes('NOT_FOUND'))return 404;
 if(error.code==='22023')return 400;
 return 409;
}

export async function POST(request:Request){
 try{
  const body=await request.json();const action=clean(body.action,50),projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const db=serviceDb();if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
  const [{data:run},{data:project}]=await Promise.all([
   db.from('project_runs').select('id,status,run_number,recruitment_open,completed_at,completion_state,completion_completed_at').eq('id',runId).eq('project_id',projectId).maybeSingle(),
   db.from('projects').select('id,title,project_type').eq('id',projectId).maybeSingle()
  ]);
  if(!run||!project)return NextResponse.json({error:'Project run not found.'},{status:404});

  if(action==='request'){
   if(project.project_type==='open')return NextResponse.json({error:'Open project cohorts do not use completion review. They auto-complete after an authorised final submission satisfies every configured condition.'},{status:409});
   return NextResponse.json({error:'Partner completion review begins automatically when an authorised final submission is submitted.'},{status:409});
  }

  if(action==='review'){
   if(project.project_type!=='partner')return NextResponse.json({error:'Only Partner projects use reviewer-gated completion.'},{status:409});
   const requestId=clean(body.request_id,80),decision=clean(body.decision,40),notes=clean(body.review_notes,2500);if(!requestId||!['approved','changes_requested'].includes(decision))return NextResponse.json({error:'Choose a completion request and decision.'},{status:400});if(decision==='changes_requested'&&!notes)return NextResponse.json({error:'Explain what must change before the Partner project can be resubmitted.'},{status:400});

   // The authenticated RPC owns authorization, exact project/run/request binding, the run-row lock,
   // readiness revalidation and every completion-state mutation in one database transaction.
   const {data:result,error}=await auth.rpc('phase19_review_partner_completion',{
    p_project_id:projectId,p_run_id:runId,p_request_id:requestId,p_decision:decision,p_review_notes:notes||null
   });
   if(error)return NextResponse.json({error:error.message||'Unable to decide completion review.'},{status:rpcStatus(error)});
   const outcome=(result||{}) as {idempotent?:boolean;decision?:string;completed_at?:string;recruitment_frozen?:boolean};

   if(decision==='changes_requested'&&!outcome.idempotent){
    const {data:leads}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('team_role','project_lead').in('membership_status',['active','completed']);
    for(const lead of leads||[])await notifyUser(db,{userId:lead.user_id,email:await emailFor(db,lead.user_id),projectId,type:'project_completion_review',eventKey:'contribution_review',title:'Partner completion needs changes',body:`A secure completion-review update is available in Mettelo for ${project.title}.`,actionUrl:`/member/projects/${projectId}?run=${runId}#completion`,subject:`Completion review update: ${project.title}`,dedupeKey:`completion:${requestId}:changes`});
    return NextResponse.json({...outcome,message:'Changes requested. Delivery work is active again, but recruitment remains closed during the completion cycle.'});
   }

   if(decision==='approved'){
    const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).eq('membership_status','completed');
    for(const member of members||[])await notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_completed',eventKey:'project_kickoff',title:'Partner project completed',body:`Team ${run.run_number} for ${project.title} has passed project-level completion review. Individual Verified Proof remains subject to contribution verification.`,actionUrl:`/member/projects/${projectId}?run=${runId}#proof`,subject:`Project completed: ${project.title}`,dedupeKey:`project-run:${runId}:completed`});
    return NextResponse.json({...outcome,message:outcome.idempotent?'Partner project is already completed.':'Partner project completion approved.'});
   }
  }
  return NextResponse.json({error:'Unknown completion action.'},{status:400});
 }catch(error){console.error('project completion error',error);return NextResponse.json({error:'Unable to update project completion.'},{status:500})}
}
