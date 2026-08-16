import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {deliverOutboxItem,enqueueEmail} from '@/lib/notifications';
import type {SupabaseClient,User} from '@supabase/supabase-js';

async function admin(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user?.app_metadata?.role==='admin'?user:null}
function text(value:unknown,max=1000){return String(value??'').trim().slice(0,max)}
function payloadObject(value:unknown){return(value&&typeof value==='object'&&!Array.isArray(value)?value:{}) as Record<string,unknown>}
async function findAuthUserByEmail(db:SupabaseClient,email:string):Promise<User|null>{for(let page=1;page<=50;page++){const result=await db.auth.admin.listUsers({page,perPage:200});if(result.error)throw result.error;const match=result.data.users.find(candidate=>candidate.email?.toLowerCase()===email);if(match)return match;if(result.data.users.length<200)break}return null}
async function history(db:SupabaseClient,submissionId:string,userId:string,action:string,detail:Record<string,unknown>={},fromStage:string|null=null,toStage:string|null=null){await db.from('form_submission_history').insert({submission_id:submissionId,actor_user_id:userId,action,detail,from_stage:fromStage,to_stage:toStage});}
async function sendIntakeEmail(db:SupabaseClient,{submissionId,email,subject,message,userId}:{submissionId:string;email:string;subject:string;message:string;userId:string}){const outbox=await enqueueEmail(db,{to:email,templateKey:'admin_intake_reply',eventKey:'admin_intake_reply',subject,body:message,actionUrl:'/',dedupeKey:`intake:${submissionId}:reply:${Date.now()}`});let delivery='queued';if(outbox){const sent=await deliverOutboxItem(db,outbox);delivery=sent.status;}await db.from('communication_audit_log').insert({actor_user_id:userId,action:'intake_reply_sent',entity_type:'form_submission',entity_id:submissionId,metadata:{recipient_email:email,subject,delivery}});return delivery;}

export async function PATCH(request:Request){
 try{
  const user=await admin();if(!user)return NextResponse.json({error:'Admin access required.'},{status:403});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Intake service not configured.'},{status:503});
  const body=await request.json();const ids=Array.isArray(body.ids)?body.ids.map(String).filter(Boolean).slice(0,100):[String(body.id||'')].filter(Boolean);const action=String(body.action||'');if(!ids.length)return NextResponse.json({error:'Choose at least one intake record.'},{status:400});const now=new Date().toISOString();

  if(action==='status'){
    const status=String(body.status||'');if(!['new','in_progress','resolved','duplicate'].includes(status))return NextResponse.json({error:'Invalid triage status.'},{status:400});
    const patch:Record<string,unknown>={status,updated_at:now};if(status==='in_progress')patch.reviewed_at=now;if(status==='resolved'||status==='duplicate')patch.resolved_at=now;
    const {data,error}=await db.from('form_submissions').update(patch).in('id',ids).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at');if(error)throw error;
    await Promise.all(ids.map(id=>history(db,id,user.id,'status_changed',{status})));
    return NextResponse.json({ok:true,items:data||[]});
  }

  if(action==='assign'){
    const assigned=text(body.assigned_to_user_id,80)||null;const {data,error}=await db.from('form_submissions').update({assigned_to_user_id:assigned,updated_at:now}).in('id',ids).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at');if(error)throw error;
    await Promise.all(ids.map(id=>history(db,id,user.id,'owner_assigned',{assigned_to_user_id:assigned})));
    return NextResponse.json({ok:true,items:data||[]});
  }

  if(action==='stage'){
    if(ids.length!==1)return NextResponse.json({error:'Update one partnership stage at a time.'},{status:400});
    const stage=String(body.workflow_stage||'');const allowed=['new','reviewing','qualified','discovery_call','proposal','active','closed'];if(!allowed.includes(stage))return NextResponse.json({error:'Invalid partnership stage.'},{status:400});
    const {data:current}=await db.from('form_submissions').select('id,form_type,workflow_stage').eq('id',ids[0]).maybeSingle();if(!current)return NextResponse.json({error:'Submission not found.'},{status:404});if(current.form_type!=='partnership')return NextResponse.json({error:'CRM stages apply to partnership intake only.'},{status:409});
    const status=stage==='new'?'new':stage==='closed'?'resolved':'in_progress';const patch:Record<string,unknown>={workflow_stage:stage,status,updated_at:now};if(stage!=='new')patch.reviewed_at=now;if(stage==='closed')patch.resolved_at=now;
    const {data,error}=await db.from('form_submissions').update(patch).eq('id',ids[0]).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at').single();if(error)throw error;
    await history(db,ids[0],user.id,'partnership_stage_changed',{},current.workflow_stage,stage);return NextResponse.json({ok:true,items:[data]});
  }

  if(action==='note'){
    if(ids.length!==1)return NextResponse.json({error:'Add a note to one submission at a time.'},{status:400});const note=text(body.note,4000);if(!note)return NextResponse.json({error:'Enter a private Admin note.'},{status:400});
    const {data,error}=await db.from('form_submission_notes').insert({submission_id:ids[0],author_user_id:user.id,note}).select('id,submission_id,author_user_id,note,created_at').single();if(error)throw error;await history(db,ids[0],user.id,'private_note_added');return NextResponse.json({ok:true,note:data});
  }

  if(action==='follow_up'){
    if(ids.length!==1)return NextResponse.json({error:'Schedule one follow-up at a time.'},{status:400});const raw=text(body.next_follow_up_at,80);const next=raw?new Date(raw):null;if(raw&&(!next||Number.isNaN(next.getTime())))return NextResponse.json({error:'Enter a valid follow-up date and time.'},{status:400});
    const value=next?.toISOString()||null;const {data,error}=await db.from('form_submissions').update({next_follow_up_at:value,updated_at:now}).eq('id',ids[0]).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at').single();if(error)throw error;await history(db,ids[0],user.id,value?'follow_up_scheduled':'follow_up_cleared',{next_follow_up_at:value});return NextResponse.json({ok:true,items:[data]});
  }

  if(action==='communicate'){
    if(ids.length!==1)return NextResponse.json({error:'Send one intake communication at a time.'},{status:400});const subject=text(body.subject,300),message=text(body.message,8000);if(!subject||!message)return NextResponse.json({error:'Complete the subject and message before sending.'},{status:400});
    const {data:submission}=await db.from('form_submissions').select('id,payload').eq('id',ids[0]).maybeSingle();if(!submission)return NextResponse.json({error:'Submission not found.'},{status:404});const email=text(payloadObject(submission.payload).email,320).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'This submission has no valid reply email.'},{status:409});
    const delivery=await sendIntakeEmail(db,{submissionId:ids[0],email,subject,message,userId:user.id});const {data,error}=await db.from('form_submissions').update({last_contacted_at:now,status:'in_progress',reviewed_at:now,updated_at:now}).eq('id',ids[0]).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at').single();if(error)throw error;await history(db,ids[0],user.id,'communication_sent',{subject,delivery});return NextResponse.json({ok:true,items:[data],delivery});
  }

  if(action==='resolve'){
    if(ids.length!==1)return NextResponse.json({error:'Resolve one submission at a time.'},{status:400});const summary=text(body.resolution_summary,3000);if(!summary)return NextResponse.json({error:'Add a resolution summary before closing this submission.'},{status:400});
    const {data:submission}=await db.from('form_submissions').select('id,form_type,payload').eq('id',ids[0]).maybeSingle();if(!submission)return NextResponse.json({error:'Submission not found.'},{status:404});let delivery:string|null=null;
    if(Boolean(body.notify_submitter)){const email=text(payloadObject(submission.payload).email,320).toLowerCase();if(/^\S+@\S+\.\S+$/.test(email)){delivery=await sendIntakeEmail(db,{submissionId:ids[0],email,subject:submission.form_type==='feedback'?'Update on your Mettelo feedback':'Update on your Mettelo enquiry',message:summary,userId:user.id});}}
    const {data,error}=await db.from('form_submissions').update({status:'resolved',workflow_stage:submission.form_type==='partnership'?'closed':undefined,resolution_summary:summary,resolved_at:now,updated_at:now}).eq('id',ids[0]).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at').single();if(error)throw error;await history(db,ids[0],user.id,'resolved',{resolution_summary:summary,submitter_notified:Boolean(delivery),delivery});return NextResponse.json({ok:true,items:[data],delivery});
  }

  if(action==='duplicate'){
    const duplicateOf=text(body.duplicate_of_id,80)||null;if(ids.length!==1)return NextResponse.json({error:'Choose one submission when linking a duplicate.'},{status:400});const {data,error}=await db.from('form_submissions').update({status:'duplicate',duplicate_of_id:duplicateOf,resolved_at:now,updated_at:now}).eq('id',ids[0]).select('id,status,workflow_stage,assigned_to_user_id,reviewed_at,resolved_at,duplicate_of_id,converted_application_id,next_follow_up_at,last_contacted_at,resolution_summary,updated_at').single();if(error)throw error;await history(db,ids[0],user.id,'marked_duplicate',{duplicate_of_id:duplicateOf});return NextResponse.json({ok:true,items:[data]});
  }

  if(action==='convert'){
    if(ids.length!==1)return NextResponse.json({error:'Convert one submission at a time.'},{status:400});
    const {data:submission}=await db.from('form_submissions').select('id,form_type,payload,status,converted_application_id').eq('id',ids[0]).maybeSingle();if(!submission)return NextResponse.json({error:'Submission not found.'},{status:404});if(submission.form_type!=='project_application')return NextResponse.json({error:'Only Project Application intake can be converted to the governed Project Applications queue.'},{status:409});if(submission.converted_application_id)return NextResponse.json({error:'This intake record has already been converted.'},{status:409});
    const payload=payloadObject(submission.payload);const email=text(payload.email,320).toLowerCase(),projectTitle=text(payload.project,240),contribution=text(payload.contribution,4000),requestedRole=text(payload.role,160),portfolio=text(payload.profile,800);if(!email||!projectTitle||!contribution)return NextResponse.json({error:'This legacy submission is missing email, project or contribution details required for conversion.'},{status:409});
    const {data:project}=await db.from('projects').select('id,title').ilike('title',projectTitle).limit(1).maybeSingle();if(!project)return NextResponse.json({error:'No governed project matches the submitted project name. Link/clean the intake record before conversion.'},{status:409});const account=await findAuthUserByEmail(db,email);if(!account)return NextResponse.json({error:'The submitter does not have a linked Mettelo account. Ask them to create/sign in to an account before conversion.'},{status:409});
    const {data:existingRows,error:existingError}=await db.from('project_applications').select('id').eq('project_id',project.id).eq('user_id',account.id).neq('status','withdrawn').limit(1);if(existingError)throw existingError;const existing=existingRows?.[0];if(existing){await db.from('form_submissions').update({status:'duplicate',converted_application_id:existing.id,resolved_at:now,updated_at:now}).eq('id',submission.id);await history(db,submission.id,user.id,'converted_duplicate',{application_id:existing.id});return NextResponse.json({ok:true,application_id:existing.id,duplicate:true});}
    const {data:application,error}=await db.from('project_applications').insert({project_id:project.id,user_id:account.id,portfolio_url:portfolio||null,contribution_statement:contribution,requested_role:requestedRole||null,status:'submitted',application_kind:'application'}).select('id').single();if(error)throw error;await db.from('project_application_events').insert({application_id:application.id,from_status:null,to_status:'submitted',note:'Converted by Admin from legacy intake submission.',actor_user_id:user.id});await db.from('form_submissions').update({status:'resolved',converted_application_id:application.id,reviewed_at:now,resolved_at:now,updated_at:now}).eq('id',submission.id);await history(db,submission.id,user.id,'converted_to_project_application',{application_id:application.id});return NextResponse.json({ok:true,application_id:application.id,duplicate:false});
  }
  return NextResponse.json({error:'Unknown intake action.'},{status:400});
 }catch(error){console.error('admin intake error',error);return NextResponse.json({error:'Unable to update intake.'},{status:500})}
}
