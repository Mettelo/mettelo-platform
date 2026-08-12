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
    const evidenceLinks:{type:string;id:string}[]=Array.isArray(body.evidence_links)?body.evidence_links.map((item:unknown)=>item as {type?:unknown;id?:unknown}).map((item:{type?:unknown;id?:unknown})=>({type:String(item.type||''),id:String(item.id||'')})).filter((item:{type:string;id:string})=>['task','data_source','deliverable','review'].includes(item.type)&&Boolean(item.id)).slice(0,20):[];
    const isPublic=Boolean(body.is_public);
    if(!projectId||!types.has(contributionType)||title.length<6||description.length<30||(!evidenceUrl&&!taskId&&!evidenceLinks.length)){return NextResponse.json({error:'Choose a project and contribution type, describe your ownership, then select Contribution Ledger evidence or add an evidence URL.'},{status:400});}
    if(evidenceUrl){try{const parsed=new URL(evidenceUrl);if(parsed.protocol!=='https:')throw new Error();}catch{return NextResponse.json({error:'Provide a valid HTTPS evidence URL.'},{status:400});}}
    let membershipQuery=supabase.from('project_members').select('id,team_role,project_run_id').eq('project_id',projectId).eq('user_id',user.id).order('joined_at',{ascending:false}).limit(1);if(projectRunId)membershipQuery=membershipQuery.eq('project_run_id',projectRunId);const {data:membership}=await membershipQuery.maybeSingle();
    if(!membership?.project_run_id) return NextResponse.json({error:'Contribution evidence requires membership in a specific project run.'},{status:403});
    if(taskId){
      const {data:task}=await supabase.from('project_tasks').select('id,project_id,project_run_id,assignee_user_id').eq('id',taskId).maybeSingle();
      if(!task||task.project_id!==projectId||task.project_run_id!==membership.project_run_id) return NextResponse.json({error:'Choose a task from this project team.'},{status:400});
      const privileged=user.app_metadata?.role==='admin'||['project_lead','reviewer'].includes(membership.team_role);
      if(task.assignee_user_id&&task.assignee_user_id!==user.id&&!privileged) return NextResponse.json({error:'You can only submit evidence against work assigned to you.'},{status:403});
    }
    for(const link of evidenceLinks){
      if(link.type==='task'){const {data}=await supabase.from('project_tasks').select('id,assignee_user_id').eq('id',link.id).eq('project_run_id',membership.project_run_id).maybeSingle();if(!data||data.assignee_user_id!==user.id)return NextResponse.json({error:'A selected task is not assigned to you in this team.'},{status:400})}
      if(link.type==='data_source'){const {data}=await supabase.from('project_data_sources').select('id,owner_user_id,added_by').eq('id',link.id).eq('project_run_id',membership.project_run_id).maybeSingle();if(!data||(data.owner_user_id!==user.id&&data.added_by!==user.id))return NextResponse.json({error:'A selected data source is not owned or managed by you.'},{status:400})}
      if(link.type==='deliverable'){const {data}=await supabase.from('project_deliverables').select('id,owner_user_id').eq('id',link.id).eq('project_run_id',membership.project_run_id).maybeSingle();if(!data||data.owner_user_id!==user.id)return NextResponse.json({error:'A selected deliverable is not owned by you.'},{status:400})}
      if(link.type==='review'){const {data}=await supabase.from('project_deliverables').select('id,reviewer_user_id,status').eq('id',link.id).eq('project_run_id',membership.project_run_id).maybeSingle();if(!data||data.reviewer_user_id!==user.id||!['approved','changes_requested'].includes(data.status))return NextResponse.json({error:'A selected review is not a completed review by you.'},{status:400})}
    }
    const {data,error}=await supabase.from('contributions').insert({user_id:user.id,project_id:projectId,project_run_id:membership.project_run_id,task_id:taskId,contribution_type:contributionType,title,description,evidence_url:evidenceUrl,verification_status:'pending',is_public:isPublic}).select('id,verification_status').single();
    if(error) throw error;
    const uniqueLinks=[...new Map(evidenceLinks.map(item=>[`${item.type}:${item.id}`,item])).values()];if(taskId&&!uniqueLinks.some(item=>item.type==='task'&&item.id===taskId))uniqueLinks.push({type:'task',id:taskId});if(uniqueLinks.length){const {error:linkError}=await supabase.from('contribution_evidence_links').insert(uniqueLinks.map(item=>({contribution_id:data.id,project_run_id:membership.project_run_id,evidence_type:item.type,evidence_id:item.id})));if(linkError)throw linkError;}
    if(taskId) await supabase.from('project_tasks').update({status:'review',evidence_url:evidenceUrl,updated_at:new Date().toISOString()}).eq('id',taskId);
    return NextResponse.json({ok:true,contribution:data});
  }catch(error){console.error('contribution submission error',error);return NextResponse.json({error:'We could not submit this contribution for review.'},{status:500});}
}
