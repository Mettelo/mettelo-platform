import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const milestoneStatuses=new Set(['planned','in_progress','completed','blocked']);
const taskStatuses=new Set(['todo','in_progress','review','done','blocked']);

async function accessContext(projectId:string){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {supabase,user:null,membership:null,canLead:false};
  if(user.app_metadata?.role==='admin') return {supabase,user,membership:null,canLead:true};
  const {data:membership}=await supabase.from('project_members').select('team_role').eq('project_id',projectId).eq('user_id',user.id).maybeSingle();
  return {supabase,user,membership,canLead:Boolean(membership&&['project_lead','reviewer'].includes(membership.team_role))};
}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const resource=String(body.resource||'');
    if(!projectId) return NextResponse.json({error:'Project is required.'},{status:400});
    const access=await accessContext(projectId);
    if(!access.user) return NextResponse.json({error:'Authentication required.'},{status:401});
    if(!access.canLead) return NextResponse.json({error:'Project Lead or Reviewer access is required.'},{status:403});
    const title=String(body.title||'').trim().slice(0,180);
    const description=String(body.description||'').trim().slice(0,1500);
    const isRequired=body.is_required!==false&&body.is_required!=='false';
    if(!title) return NextResponse.json({error:'Title is required.'},{status:400});
    if(resource==='milestone'){
      const status=String(body.status||'planned');
      if(!milestoneStatuses.has(status)) return NextResponse.json({error:'Invalid milestone status.'},{status:400});
      const {data,error}=await access.supabase.from('project_milestones').insert({project_id:projectId,title,description:description||null,due_at:body.due_at||null,status,sort_order:Number(body.sort_order)||0,is_required:isRequired}).select('*').single();
      if(error) throw error;return NextResponse.json({ok:true,item:data});
    }
    if(resource==='task'){
      const status=String(body.status||'todo');
      if(!taskStatuses.has(status)) return NextResponse.json({error:'Invalid task status.'},{status:400});
      const milestoneId=String(body.milestone_id||'')||null;
      const assignee=String(body.assignee_user_id||'')||null;
      if(assignee){const {data:member}=await access.supabase.from('project_members').select('id').eq('project_id',projectId).eq('user_id',assignee).maybeSingle();if(!member)return NextResponse.json({error:'Task assignee must be an approved project member.'},{status:400});}
      const {data,error}=await access.supabase.from('project_tasks').insert({project_id:projectId,milestone_id:milestoneId,title,description:description||null,due_at:body.due_at||null,status,assignee_user_id:assignee,is_required:isRequired}).select('*').single();
      if(error) throw error;return NextResponse.json({ok:true,item:data});
    }
    return NextResponse.json({error:'Unknown delivery resource.'},{status:400});
  }catch(error){console.error('project delivery error',error);return NextResponse.json({error:'Unable to save project delivery item.'},{status:500});}
}

export async function PATCH(request:Request){
  try{
    const body=await request.json();
    const taskId=String(body.task_id||'');
    const status=String(body.status||'');
    if(!taskId||!taskStatuses.has(status)) return NextResponse.json({error:'Choose a valid task and status.'},{status:400});
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Authentication required.'},{status:401});
    const {data:task}=await supabase.from('project_tasks').select('id,project_id,assignee_user_id').eq('id',taskId).maybeSingle();
    if(!task) return NextResponse.json({error:'Task not found or inaccessible.'},{status:404});
    const access=await accessContext(task.project_id);
    const allowed=access.canLead||task.assignee_user_id===user.id;
    if(!allowed) return NextResponse.json({error:'Only the assignee or Project Lead can update this task.'},{status:403});
    const evidence=String(body.evidence_url||'').trim().slice(0,500)||null;
    if(evidence){try{new URL(evidence);}catch{return NextResponse.json({error:'Provide a valid evidence URL.'},{status:400});}}
    const {data,error}=await supabase.from('project_tasks').update({status,evidence_url:evidence,updated_at:new Date().toISOString()}).eq('id',taskId).select('id,status').single();
    if(error) throw error;
    return NextResponse.json({ok:true,item:data});
  }catch(error){console.error('task update error',error);return NextResponse.json({error:'Unable to update this task.'},{status:500});}
}
