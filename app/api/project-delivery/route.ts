import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

const milestoneStatuses=new Set(['planned','in_progress','completed','blocked']);
const taskStatuses=new Set(['todo','in_progress','blocked','ready_for_review','done']);
const allowedTransitions:Record<string,Set<string>>={
  todo:new Set(['in_progress','blocked']),
  in_progress:new Set(['blocked','ready_for_review']),
  blocked:new Set(['in_progress']),
  ready_for_review:new Set(['in_progress','done']),
  done:new Set()
};

async function accessContext(projectId:string,projectRunId?:string|null){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return{supabase,user:null,membership:null,canLead:false,isAdmin:false};
  const isAdmin=user.app_metadata?.role==='admin';
  let query=supabase.from('project_members').select('team_role,membership_status,project_run_id').eq('project_id',projectId).eq('user_id',user.id).order('joined_at',{ascending:false}).limit(1);if(projectRunId)query=query.eq('project_run_id',projectRunId);const {data:membership}=await query.maybeSingle();
  return{supabase,user,membership,canLead:Boolean(membership&&membership.membership_status==='active'&&membership.team_role==='project_lead'),isAdmin};
}

async function recordTaskEvent(input:{taskId:string;projectId:string;projectRunId:string|null;actorUserId:string;eventType:string;fromStatus?:string|null;toStatus?:string|null;comment?:string|null;evidenceUrl?:string|null}){
  const db=serviceDb();
  if(!db)return;
  const {error}=await db.from('project_task_events').insert({task_id:input.taskId,project_id:input.projectId,project_run_id:input.projectRunId,actor_user_id:input.actorUserId,event_type:input.eventType,from_status:input.fromStatus||null,to_status:input.toStatus||null,comment:input.comment||null,evidence_url:input.evidenceUrl||null});
  if(error)console.error('task event insert error',error);
}

async function notifyLeads(input:{projectId:string;projectRunId:string|null;taskId:string;taskTitle:string;title:string;body:string;eventKey:string;dedupeSuffix:string}){
  const db=serviceDb();
  if(!db)return;
  let leadQuery=db.from('project_members').select('user_id').eq('project_id',input.projectId).eq('team_role','project_lead').eq('membership_status','active');
  if(input.projectRunId)leadQuery=leadQuery.eq('project_run_id',input.projectRunId);
  const [{data:leads},{data:project}]=await Promise.all([leadQuery,db.from('projects').select('title').eq('id',input.projectId).maybeSingle()]);
  for(const lead of leads||[]){
    const {data:recipient}=await db.auth.admin.getUserById(lead.user_id);
    await notifyUser(db,{userId:lead.user_id,email:recipient.user?.email||null,projectId:input.projectId,type:input.eventKey,eventKey:input.eventKey,title:input.title,body:input.body,actionUrl:`/member/projects/${input.projectId}${input.projectRunId?`?run=${input.projectRunId}`:''}#delivery`,subject:`${input.title}: ${project?.title||'Mettelo'}`,dedupeKey:`task:${input.taskId}:${input.dedupeSuffix}:${lead.user_id}`});
  }
}

async function notifyAssignee(input:{userId:string|null;projectId:string;projectRunId:string|null;taskId:string;title:string;body:string;eventKey:string;dedupeSuffix:string}){
  if(!input.userId)return;
  const db=serviceDb();
  if(!db)return;
  const [{data:recipient},{data:project}]=await Promise.all([db.auth.admin.getUserById(input.userId),db.from('projects').select('title').eq('id',input.projectId).maybeSingle()]);
  await notifyUser(db,{userId:input.userId,email:recipient.user?.email||null,projectId:input.projectId,type:input.eventKey,eventKey:input.eventKey,title:input.title,body:input.body,actionUrl:`/member/projects/${input.projectId}${input.projectRunId?`?run=${input.projectRunId}`:''}#delivery`,subject:`${input.title}: ${project?.title||'Mettelo'}`,dedupeKey:`task:${input.taskId}:${input.dedupeSuffix}:${input.userId}`});
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
    if(workstreamId){const {data}=await access.supabase.from('project_workstreams').select('id').eq('id',workstreamId).eq('project_id',projectId).eq('project_run_id',runId).maybeSingle();if(!data)return NextResponse.json({error:'Choose a workstream from this project team.'},{status:400});}

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
      const acceptanceCriteria=String(body.acceptance_criteria||'').trim().slice(0,2500)||null;
      const priority=String(body.priority||'normal');
      if(!['low','normal','high','urgent'].includes(priority))return NextResponse.json({error:'Choose a valid task priority.'},{status:400});

      if(milestoneId){
        const {data:milestone}=await access.supabase.from('project_milestones').select('id').eq('id',milestoneId).eq('project_id',projectId).eq('project_run_id',runId).maybeSingle();
        if(!milestone)return NextResponse.json({error:'Task milestone must belong to this project team.'},{status:400});
      }

      if(assignee){
        let query=access.supabase.from('project_members').select('id').eq('project_id',projectId).eq('user_id',assignee).eq('membership_status','active');
        if(runId)query=query.eq('project_run_id',runId);
        const {data:member}=await query.maybeSingle();
        if(!member)return NextResponse.json({error:'Task assignee must be an active member of this team.'},{status:400});
      }

      const {data,error}=await access.supabase.from('project_tasks').insert({project_id:projectId,project_run_id:runId,workstream_id:workstreamId,milestone_id:milestoneId,title,description:description||null,due_at:body.due_at||null,status,assignee_user_id:assignee,is_required:isRequired,acceptance_criteria:acceptanceCriteria,priority,created_by_user_id:access.user.id}).select('*').single();
      if(error)throw error;
      await recordTaskEvent({taskId:data.id,projectId,projectRunId:runId,actorUserId:access.user.id,eventType:'created',toStatus:status});

      if(assignee){
        const db=serviceDb();
        if(db){
          const [{data:recipient},{data:project}]=await Promise.all([db.auth.admin.getUserById(assignee),db.from('projects').select('title').eq('id',projectId).maybeSingle()]);
          await notifyUser(db,{userId:assignee,email:recipient.user?.email||null,projectId,type:'task_assigned',eventKey:'task_assigned',title:'New project task',body:`You have been assigned “${title}” on ${project?.title||'a Mettelo project'}.`,actionUrl:`/member/projects/${projectId}?run=${runId}#delivery`,subject:`Task assigned: ${project?.title||'Mettelo'}`,dedupeKey:`task:${data.id}:assigned`});
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

    const {data:task}=await supabase.from('project_tasks').select('id,project_id,project_run_id,assignee_user_id,title,status,evidence_url').eq('id',taskId).maybeSingle();
    if(!task)return NextResponse.json({error:'Task not found or inaccessible.'},{status:404});

    const access=await accessContext(task.project_id,task.project_run_id);
    if(access.isAdmin&&!access.membership)return NextResponse.json({error:'Admin access is read-only for task delivery.'},{status:403});
    const isAssignee=task.assignee_user_id===user.id;
    if(!(access.canLead||isAssignee))return NextResponse.json({error:'Only the assignee or Project Lead can update this task.'},{status:403});
    if(task.status===status)return NextResponse.json({ok:true,item:{id:task.id,status:task.status}});
    if(!allowedTransitions[task.status]?.has(status))return NextResponse.json({error:`This task cannot move from ${task.status.replaceAll('_',' ')} to ${status.replaceAll('_',' ')}.`},{status:409});
    if(status==='done'&&!access.canLead)return NextResponse.json({error:'The Project Lead must approve work before it is marked done.'},{status:403});
    if(task.status==='ready_for_review'&&status==='in_progress'&&!access.canLead)return NextResponse.json({error:'Only the Project Lead can request changes after review.'},{status:403});

    const blockerReason=String(body.blocker_reason||'').trim().slice(0,1500);
    if(status==='blocked'&&!blockerReason)return NextResponse.json({error:'Explain why this task is blocked so the Project Lead can help.'},{status:400});
    const reviewComment=String(body.review_comment||'').trim().slice(0,1500);
    if(task.status==='ready_for_review'&&status==='in_progress'&&!reviewComment)return NextResponse.json({error:'Add review comments explaining what needs to change.'},{status:400});

    let evidence: string|null|undefined=undefined;
    if(Object.prototype.hasOwnProperty.call(body,'evidence_url')){
      evidence=String(body.evidence_url||'').trim().slice(0,500)||null;
      if(evidence){try{new URL(evidence);}catch{return NextResponse.json({error:'Provide a valid evidence URL.'},{status:400});}}
    }

    const now=new Date().toISOString();
    const update:Record<string,unknown>={status,updated_at:now};
    if(evidence!==undefined)update.evidence_url=evidence;
    if(status==='blocked'){
      update.blocker_reason=blockerReason;
      update.blocked_at=now;
      update.blocked_by_user_id=user.id;
    }else if(task.status==='blocked'){
      update.blocker_reason=null;
      update.blocked_at=null;
      update.blocked_by_user_id=null;
    }
    if(reviewComment)update.last_review_comment=reviewComment;

    const {data,error}=await supabase.from('project_tasks').update(update).eq('id',taskId).select('id,status,evidence_url').single();
    if(error)throw error;

    let eventType='status_changed';
    let comment:string|null=null;
    if(status==='blocked'){eventType='blocked';comment=blockerReason;}
    else if(task.status==='blocked'&&status==='in_progress'){eventType='unblocked';}
    else if(status==='ready_for_review'){eventType='review_requested';}
    else if(task.status==='ready_for_review'&&status==='in_progress'){eventType='changes_requested';comment=reviewComment;}
    else if(status==='done'){eventType='approved';comment=reviewComment||null;}
    await recordTaskEvent({taskId,projectId:task.project_id,projectRunId:task.project_run_id,actorUserId:user.id,eventType,fromStatus:task.status,toStatus:status,comment,evidenceUrl:data.evidence_url||null});

    if(status==='ready_for_review')await notifyLeads({projectId:task.project_id,projectRunId:task.project_run_id,taskId,taskTitle:task.title,title:'Task ready for review',body:`“${task.title}” is ready for review.`,eventKey:'contribution_review',dedupeSuffix:'review'});
    if(status==='blocked')await notifyLeads({projectId:task.project_id,projectRunId:task.project_run_id,taskId,taskTitle:task.title,title:'Task blocked',body:`“${task.title}” is blocked: ${blockerReason}`,eventKey:'task_blocked',dedupeSuffix:`blocked:${Date.now()}`});
    if(task.status==='ready_for_review'&&status==='in_progress')await notifyAssignee({userId:task.assignee_user_id,projectId:task.project_id,projectRunId:task.project_run_id,taskId,title:'Changes requested',body:`Changes were requested on “${task.title}”: ${reviewComment}`,eventKey:'task_changes_requested',dedupeSuffix:`changes:${Date.now()}`});
    if(status==='done')await notifyAssignee({userId:task.assignee_user_id,projectId:task.project_id,projectRunId:task.project_run_id,taskId,title:'Task approved',body:`“${task.title}” has been approved and marked done.`,eventKey:'task_approved',dedupeSuffix:'approved'});

    return NextResponse.json({ok:true,item:data});
  }catch(error){
    console.error('task update error',error);
    return NextResponse.json({error:'Unable to update this task.'},{status:500});
  }
}
