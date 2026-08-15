import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {careerMessageForDb,sendCareerEmail} from '@/lib/career-notifications';

const STAGES=new Set(['in_review','shortlisted','interview','offer','hired','rejected']);
export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career service not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||''),status=String(body.status||''),note=String(body.note||'').trim().slice(0,2000),interviewAt=body.interview_at?new Date(String(body.interview_at)).toISOString():null;const subjectOverride=String(body.subject||'').trim().slice(0,300)||null;const bodyOverride=String(body.message||'').trim().slice(0,8000)||null;const attachmentIds=Array.isArray(body.attachment_ids)?body.attachment_ids.map((x:unknown)=>String(x)).filter(Boolean).slice(0,5):[];
    if(!id||!STAGES.has(status))return NextResponse.json({error:'Invalid recruitment stage.'},{status:400});
    if(status==='offer'&&!body.confirm_send)return NextResponse.json({error:'Review and confirm the offer communication before sending.'},{status:409});
    const {data:application}=await db.from('career_applications').select('id,user_id,email,full_name,status,role_id,career_roles(title)').eq('id',id).maybeSingle();if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    if(attachmentIds.length){const {data:docs}=await db.from('career_offer_documents').select('id,application_id').in('id',attachmentIds).eq('application_id',id).eq('active',true);if((docs||[]).length!==attachmentIds.length)return NextResponse.json({error:'One or more offer documents are unavailable.'},{status:400});}
    const roleTitle=(application.career_roles as unknown as {title:string}|null)?.title||'Mettelo role';
    const patch:Record<string,unknown>={status,updated_at:new Date().toISOString(),admin_notes:note||null};if(status==='interview')patch.interview_at=interviewAt;if(status==='interview')patch.interview_details=note||null;if(status==='offer')patch.offer_details=note||null;
    const {error}=await db.from('career_applications').update(patch).eq('id',id);if(error)throw error;
    await db.from('career_application_events').insert({application_id:id,from_status:application.status,to_status:status,note:note||null,actor_user_id:user.id});
    const message=await careerMessageForDb(db,status,roleTitle,{recipientName:application.full_name,interviewAt,interviewDetails:status==='interview'?note:null,offerDetails:status==='offer'?note:null,stageNote:note,subjectOverride,bodyOverride});
    const sent=await sendCareerEmail(db,{email:application.email,subject:message.subject,body:message.body,templateKey:`career_${status}`,userId:application.user_id||null,actionUrl:application.user_id?'/member/applications#careers':'/careers',name:application.full_name,roleTitle,payload:{career_application_id:id,interview_at:interviewAt?new Date(interviewAt).toLocaleString('en-GB'):null,stage_note:note||null,offer_document_ids:attachmentIds}});
    const sendMode=message.template?.send_mode||((status==='in_review')?'automatic':'admin_review');
    await db.from('communication_records').insert({recipient_user_id:application.user_id||null,recipient_email:application.email,template_key:`career_${status}`,journey:'Careers',related_type:'career_application',related_id:id,subject:message.subject,body:message.body,send_mode:sendMode,status:sent.sent?'sent':'queued',outbox_id:sent.outboxId,actor_user_id:user.id,sent_at:sent.sent?new Date().toISOString():null});
    await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'candidate_communication_sent',entity_type:'career_application',entity_id:id,metadata:{status,template_key:`career_${status}`,recipient_email:application.email,attachment_ids:attachmentIds,email_sent:sent.sent}});
    return NextResponse.json({ok:true,email_sent:sent.sent,email_queued:sent.queued});
  }catch(error){console.error('career stage update error',error);return NextResponse.json({error:'Unable to update candidate stage.'},{status:500});}
}
