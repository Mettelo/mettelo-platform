import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

const milestoneStatuses=new Set(['planned','in_progress','completed','blocked']);
const taskStatuses=new Set(['todo','in_progress','review','done','blocked']);

async function accessContext(projectId:string,projectRunId?:string|null){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return{supabase,user:null,membership:null,canLead:false,isAdmin:false};
  const isAdmin=user.app_metadata?.role==='admin';
  let query=supabase.from('project_members').select('team_role,membership_status,project_run_id').eq('project_id',projectId).eq('user_id',user.id).order('joined_at',{ascending:false}).limit(1);if(projectRunId)query=query.eq('project_run_id',projectRunId);const {data:membership}=await query.maybeSingle();
  return{supabase,user,membership,canLead:Boolean(membership&&membership.membership_status==='active'&&membership.team_role==='project_lead'),isAdmin};
}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const projectRunId=String(body.project_run_id||'')||null;
    const resource=String(body.resource||'');
    if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});

    const access=await accessContext(projectId,projectRunId);
    if(!access.user)return NextResponse.json({error:'Authentication required.'},{status:401});
    if(!access.canLead)return NextResponse.json({error:'Only the active Project Lead can create milestones or allocate tasks.'},{status:403});

    const runId=access.membership?.project_run_id||null;
    if(!runId)return NextResponse.json({error:'An active project run is required.'},{status:409});
    const title=String(body.title||'').trim().slice(0,180);
    const description=String(body.description||'').trim().slice(0,1500);
    const isRequired=body.is_required!==false&&body.is_required!=='false';
    const workstreamId=String(body.workstream_id||'')||null;
    if(!title)return NextResponse.json({error:'Title is required.'},{status:400});
    if(workstreamId){const {data}=await access.supabase.from('project_workstreams').select('id').eq('id',workstreamId).eq('project_run_id',runId).maybeSingle();if(!data)return NextResponse.json({error:'Choose a workstream from this project team.'},{status:400});}

    if(resource==='milestone'){
      const status=String(body.status||'planned');
      if(!milestoneStatuses.has(status))return NextResponse.json({error:'Invalid milestone status.'},{status:400});
      const {data,error}=await access.supabase.from('project_milestones').insert({project_id:projectId,project_run_id:runId,workstream_id:workstreamId,title,description:description||null,due_at:body.due_at||null,status,sort_order:Number(body.sort_order)||0,is_required:isRequired}).select('*').single();
      if(error)throw error;
      return NextResponse.json({ok:true,item:data});
    }

    if(resource==='task'){
      const status=String(body.status||'todo');
      if(!taskStatuses.has(status))return NextResponse.json({error:'Invalid task status.'},{status:400});
      const milestoneId=String(body.milestone_id||'')||null;
      const assignee=String(body.assignee_user_id||'')||null;

      if(assignee){
        let query=access.supabase.from('project_members').select('id').eq('project_id',projectId).eq('user_id',assignee).eq('membership_status','active');
        if(runId)query=query.eq('project_run_id',runId);
        const {data:member}=await query.maybeSingle();
        if(!member)return NextResponse.json({error:'Task assignee must be an active member of this team.'},{status:400});
      }

      const {data,error}=await access.supabase.from('project_tasks').insert({project_id:projectId,project_run_id:runId,workstream_id:workstreamId,milestone_id:milestoneId,title,description:description||null,due_at:body.due_at||null,status,assignee_user_id:assignee,is_required:isRequired}).select('*').single();
      if(error)throw error;

      if(assignee){
        const db=serviceDb();
        if(db){
          const [{data:recipient},{data:project}]=await Promise.all([
            db.auth.admin.getUserById(assignee),
            db.from('projects').select('title').eq('id',projectId).maybeSingle()
          ]);
          await notifyUser(db,{userId:assignee,email:recipient.user?.email||null,projectId,type:'task_assigned',eventKey:'task_assigned',title:'New project task',body:`You have been assigned “${title}” on ${project?.title||'a Mettelo project'}.`,actionUrl:`/member/projects/${projectId}?run=${runId}`,subject:`Task assigned: ${project?.title||'Mettelo'}`,dedupeKey:`task:${data.id}:assigned`});
        }
      }
      return NextResponse.json({ok:true,item:data});
    }

    return NextResponse.json({error:'Unknown delivery resource.'},{status:400});
  }catch(error){
    console.error('project delivery error',error);
    return NextResponse.json({error:'Unable to save this project item.'},{status:500});
  }
}

export async function PATCH(request:Request){
  try{
    const body=await request.json();
    const taskId=String(body.task_id||'');
    const status=String(body.status||'');
    if(!taskId||!taskStatuses.has(status))return NextResponse.json({error:'Choose a valid task and status.'},{status:400});

    const supabase=await createServerSupabaseClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});

    const {data:task}=await supabase.from('project_tasks').select('id,project_id,project_run_id,assignee_user_id,title').eq('id',taskId).maybeSingle();
    if(!task)return NextResponse.json({error:'Task not found or inaccessible.'},{status:404});

    const access=await accessContext(task.project_id,task.project_run_id);
    if(access.isAdmin&&!access.membership)return NextResponse.json({error:'Admin access is read-only for task delivery.'},{status:403});
    if(!(access.canLead||task.assignee_user_id===user.id))return NextResponse.json({error:'Only the assignee or Project Lead can update this task.'},{status:403});

    const evidence=String(body.evidence_url||'').trim().slice(0,500)||null;
    if(evidence){
      try{new URL(evidence);}catch{return NextResponse.json({error:'Provide a valid evidence URL.'},{status:400});}
    }

    const {data,error}=await supabase.from('project_tasks').update({status,evidence_url:evidence,updated_at:new Date().toISOString()}).eq('id',taskId).select('id,status').single();
    if(error)throw error;

    if(status==='review'){
      const db=serviceDb();
      if(db){
        let leadQuery=db.from('project_members').select('user_id').eq('project_id',task.project_id).eq('team_role','project_lead').eq('membership_status','active');
        if(task.project_run_id)leadQuery=leadQuery.eq('project_run_id',task.project_run_id);
        const [{data:leads},{data:project}]=await Promise.all([
          leadQuery,
          db.from('projects').select('title').eq('id',task.project_id).maybeSingle()
        ]);
        for(const lead of leads||[]){
          const {data:recipient}=await db.auth.admin.getUserById(lead.user_id);
          await notifyUser(db,{userId:lead.user_id,email:recipient.user?.email||null,projectId:task.project_id,type:'contribution_review',eventKey:'contribution_review',title:'Task ready for review',body:`“${task.title}” on ${project?.title||'a Mettelo project'} is ready for review.`,actionUrl:`/member/projects/${task.project_id}${task.project_run_id?`?run=${task.project_run_id}`:''}`,subject:`Review requested: ${project?.title||'Mettelo'}`,dedupeKey:`task:${taskId}:review`});
        }
      }
    }

    return NextResponse.json({ok:true,item:data});
  }catch(error){
    console.error('task update error',error);
    return NextResponse.json({error:'Unable to update this task.'},{status:500});
  }
}
