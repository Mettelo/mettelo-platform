import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const types=new Set(['analysis','engineering','research','design','documentation','qa','leadership','mentoring','community','open_source','other']);

export async function POST(request:Request){
  try{
    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return NextResponse.json({error:'Sign in before submitting contribution evidence.'},{status:401});
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const projectRunId=String(body.project_run_id||'')||null;
    const taskId=String(body.task_id||'')||null;
    const contributionType=String(body.contribution_type||'');
    const title=String(body.title||'').trim().slice(0,180);
    const description=String(body.description||'').trim().slice(0,2000);
    const evidenceUrl=String(body.evidence_url||'').trim().slice(0,500);
    const isPublic=Boolean(body.is_public);
    if(!projectId||!types.has(contributionType)||title.length<6||description.length<30||!evidenceUrl){return NextResponse.json({error:'Choose a project and contribution type, add a clear title/description, and provide an evidence URL.'},{status:400});}
    try{new URL(evidenceUrl);}catch{return NextResponse.json({error:'Provide a valid evidence URL.'},{status:400});}
    let membershipQuery=supabase.from('project_members').select('id,team_role,project_run_id').eq('project_id',projectId).eq('user_id',user.id).order('joined_at',{ascending:false}).limit(1);if(projectRunId)membershipQuery=membershipQuery.eq('project_run_id',projectRunId);const {data:membership}=await membershipQuery.maybeSingle();
    if(!membership?.project_run_id) return NextResponse.json({error:'Contribution evidence requires membership in a specific project run.'},{status:403});
    if(taskId){
      const {data:task}=await supabase.from('project_tasks').select('id,project_id,project_run_id,assignee_user_id').eq('id',taskId).maybeSingle();
      if(!task||task.project_id!==projectId||task.project_run_id!==membership.project_run_id) return NextResponse.json({error:'Choose a task from this project team.'},{status:400});
      const privileged=user.app_metadata?.role==='admin'||['project_lead','reviewer'].includes(membership.team_role);
      if(task.assignee_user_id&&task.assignee_user_id!==user.id&&!privileged) return NextResponse.json({error:'You can only submit evidence against work assigned to you.'},{status:403});
    }
    const {data,error}=await supabase.from('contributions').insert({user_id:user.id,project_id:projectId,project_run_id:membership.project_run_id,task_id:taskId,contribution_type:contributionType,title,description,evidence_url:evidenceUrl,verification_status:'pending',is_public:isPublic}).select('id,verification_status').single();
    if(error) throw error;
    if(taskId) await supabase.from('project_tasks').update({status:'review',evidence_url:evidenceUrl,updated_at:new Date().toISOString()}).eq('id',taskId);
    return NextResponse.json({ok:true,contribution:data});
  }catch(error){console.error('contribution submission error',error);return NextResponse.json({error:'We could not submit this contribution for review.'},{status:500});}
}
