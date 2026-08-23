import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser} from '@/lib/project-flow';

const statuses=new Set(['needs_changes','verified','rejected']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)return NextResponse.json({error:'Project review service is not configured.'},{status:503});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await request.json();const id=String(body.id||'');const status=String(body.status||'');const notes=String(body.review_notes||'').trim().slice(0,1800);
    if(!id||!statuses.has(status))return NextResponse.json({error:'Choose a valid review status.'},{status:400});
    if(['needs_changes','rejected'].includes(status)&&!notes)return NextResponse.json({error:'Add reviewer notes so the contributor understands the decision.'},{status:400});
    const {data:contribution}=await db.from('contributions').select('id,project_id,project_run_id,task_id,user_id,title').eq('id',id).maybeSingle();
    if(!contribution?.project_id||!contribution.project_run_id)return NextResponse.json({error:'Contribution is not attached to a project run.'},{status:409});
    if(contribution.user_id===user.id)return NextResponse.json({error:'You cannot review your own contribution.'},{status:403});
    let allowed=user.app_metadata?.role==='admin';
    if(!allowed){const {data:membership}=await db.from('project_members').select('team_role').eq('project_id',contribution.project_id).eq('project_run_id',contribution.project_run_id).eq('user_id',user.id).in('membership_status',['active','completed']).maybeSingle();allowed=Boolean(membership&&['project_lead','reviewer'].includes(membership.team_role));}
    if(!allowed)return NextResponse.json({error:'Project Lead or Reviewer access is required.'},{status:403});

    const now=new Date().toISOString();const verified=status==='verified';
    const {data,error}=await db.from('contributions').update({verification_status:status,review_notes:notes||null,verified_by:verified?user.id:null,verified_at:verified?now:null,updated_at:now}).eq('id',id).select('id,verification_status,review_notes,verified_at,updated_at').single();
    if(error)throw error;

    const reviewEvent=status==='verified'?'approved':status==='needs_changes'?'changes_requested':'rejected';
    const {error:eventError}=await db.from('contribution_review_events').insert({contribution_id:id,project_run_id:contribution.project_run_id,actor_user_id:user.id,event_type:reviewEvent,comment:notes||null});
    if(eventError)throw eventError;

    if(contribution.task_id){
      const {data:task}=await db.from('project_tasks').select('status').eq('id',contribution.task_id).eq('project_run_id',contribution.project_run_id).maybeSingle();
      const taskStatus=verified?'done':'in_progress';
      const {error:taskError}=await db.from('project_tasks').update({status:taskStatus,last_review_comment:notes||null,blocker_reason:null,blocked_at:null,blocked_by_user_id:null,updated_at:now}).eq('id',contribution.task_id).eq('project_run_id',contribution.project_run_id);if(taskError)throw taskError;
      const {error:taskEventError}=await db.from('project_task_events').insert({task_id:contribution.task_id,project_id:contribution.project_id,project_run_id:contribution.project_run_id,actor_user_id:user.id,event_type:verified?'approved':'changes_requested',from_status:task?.status||'ready_for_review',to_status:taskStatus,comment:notes||null});
      if(taskEventError)throw taskEventError;
    }

    const [{data:project},{data:recipient}]=await Promise.all([db.from('projects').select('title').eq('id',contribution.project_id).maybeSingle(),db.auth.admin.getUserById(contribution.user_id)]);
    const outcome=status==='verified'?{title:'Contribution verified',body:'has been verified'}:status==='needs_changes'?{title:'Changes requested',body:'needs changes before it can be verified'}:{title:'Contribution not verified',body:'was not verified'};
    await notifyUser(db,{userId:contribution.user_id,email:recipient.user?.email||null,projectId:contribution.project_id,type:'proof_status_changed',eventKey:'proof_status_changed',title:outcome.title,body:`Your contribution “${contribution.title}” on ${project?.title||'a Mettelo project'} ${outcome.body}.${notes?` Reviewer note: ${notes}`:''}`,actionUrl:`/member/projects/${contribution.project_id}?run=${contribution.project_run_id}#phase4-contributions`,subject:`Contribution review — ${project?.title||'Mettelo'}`,dedupeKey:`contribution:${id}:${status}:${now}`});
    return NextResponse.json({ok:true,contribution:data,task_updated:Boolean(contribution.task_id)});
  }catch(error){console.error('project contribution review error',error);return NextResponse.json({error:'Unable to review this contribution.'},{status:500});}
}
