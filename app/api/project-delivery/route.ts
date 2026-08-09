import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const milestoneStatuses=new Set(['planned','in_progress','completed','blocked']);
const taskStatuses=new Set(['todo','in_progress','review','done','blocked']);

async function canLead(projectId:string){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return {supabase,user:null,allowed:false};
  if(user.app_metadata?.role==='admin') return {supabase,user,allowed:true};
  const {data}=await supabase.from('project_members').select('team_role').eq('project_id',projectId).eq('user_id',user.id).maybeSingle();
  return {supabase,user,allowed:Boolean(data&&['project_lead','reviewer'].includes(data.team_role))};
}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const resource=String(body.resource||'');
    if(!projectId) return NextResponse.json({error:'Project is required.'},{status:400});
    const access=await canLead(projectId);
    if(!access.user) return NextResponse.json({error:'Authentication required.'},{status:401});
    if(!access.allowed) return NextResponse.json({error:'Project Lead or Reviewer access is required.'},{status:403});
    const title=String(body.title||'').trim().slice(0,180);
    const description=String(body.description||'').trim().slice(0,1500);
    if(!title) return NextResponse.json({error:'Title is required.'},{status:400});
    if(resource==='milestone'){
      const status=String(body.status||'planned');
      if(!milestoneStatuses.has(status)) return NextResponse.json({error:'Invalid milestone status.'},{status:400});
      const {data,error}=await access.supabase.from('project_milestones').insert({project_id:projectId,title,description:description||null,due_at:body.due_at||null,status,sort_order:Number(body.sort_order)||0}).select('*').single();
      if(error) throw error;return NextResponse.json({ok:true,item:data});
    }
    if(resource==='task'){
      const status=String(body.status||'todo');
      if(!taskStatuses.has(status)) return NextResponse.json({error:'Invalid task status.'},{status:400});
      const milestoneId=String(body.milestone_id||'')||null;
      const {data,error}=await access.supabase.from('project_tasks').insert({project_id:projectId,milestone_id:milestoneId,title,description:description||null,due_at:body.due_at||null,status}).select('*').single();
      if(error) throw error;return NextResponse.json({ok:true,item:data});
    }
    return NextResponse.json({error:'Unknown delivery resource.'},{status:400});
  }catch(error){console.error('project delivery error',error);return NextResponse.json({error:'Unable to save project delivery item.'},{status:500});}
}
