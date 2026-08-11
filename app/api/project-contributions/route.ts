import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {notifyUser} from '@/lib/project-flow';

const statuses=new Set(['needs_changes','verified','rejected']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key) return NextResponse.json({error:'Project review service is not configured.'},{status:503});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await request.json();const id=String(body.id||'');const status=String(body.status||'');const notes=String(body.review_notes||'').trim().slice(0,1800);
    if(!id||!statuses.has(status)) return NextResponse.json({error:'Choose a valid review status.'},{status:400});
    if(status==='needs_changes'&&!notes) return NextResponse.json({error:'Explain the changes required.'},{status:400});
    const {data:contribution}=await db.from('contributions').select('id,project_id,task_id,user_id').eq('id',id).maybeSingle();
    if(!contribution?.project_id) return NextResponse.json({error:'Contribution not found.'},{status:404});
    let allowed=user.app_metadata?.role==='admin';
    if(!allowed){const {data:membership}=await db.from('project_members').select('team_role').eq('project_id',contribution.project_id).eq('user_id',user.id).maybeSingle();allowed=Boolean(membership&&['project_lead','reviewer'].includes(membership.team_role));}
    if(!allowed) return NextResponse.json({error:'Project Lead or Reviewer access is required.'},{status:403});
    const verified=status==='verified';
    const {data,error}=await db.from('contributions').update({verification_status:status,review_notes:notes||null,verified_by:verified?user.id:null,verified_at:verified?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).select('id,verification_status').single();
    if(error) throw error;
    if(contribution.task_id){const taskStatus=verified?'done':status==='needs_changes'?'in_progress':'blocked';const {error:taskError}=await db.from('project_tasks').update({status:taskStatus,updated_at:new Date().toISOString()}).eq('id',contribution.task_id);if(taskError)throw taskError;}
    const [{data:project},{data:recipient}]=await Promise.all([db.from('projects').select('title').eq('id',contribution.project_id).maybeSingle(),db.auth.admin.getUserById(contribution.user_id)]);
    const outcome=status==='verified'?'verified':status==='needs_changes'?'needs changes':'not verified';
    const action=status==='needs_changes'&&notes?` Review note: ${notes}`:'';
    await notifyUser(db,{userId:contribution.user_id,email:recipient.user?.email||null,projectId:contribution.project_id,type:'proof_status_changed',eventKey:'proof_status_changed',title:`Contribution ${outcome}`,body:`Your contribution on ${project?.title||'a Mettelo Labs project'} has been ${outcome}.${action}`,actionUrl:'/member/proof',subject:`Contribution review — ${project?.title||'Mettelo Labs'}`,dedupeKey:`contribution:${id}:${status}`});
    return NextResponse.json({ok:true,contribution:data});
  }catch(error){console.error('project contribution review error',error);return NextResponse.json({error:'Unable to review this contribution.'},{status:500});}
}
