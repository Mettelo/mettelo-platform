import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {careerMessageForDb,sendCareerEmail} from '@/lib/career-notifications';
import {MAX_EMAIL_ATTACHMENTS,MAX_EMAIL_ATTACHMENT_RAW_BYTES} from '@/lib/email-attachments';

const STAGES=new Set(['in_review','shortlisted','interview','offer','hired','rejected']);
const TRANSITIONS:Record<string,Set<string>>={submitted:new Set(['in_review','rejected']),in_review:new Set(['shortlisted','rejected']),shortlisted:new Set(['interview','rejected']),interview:new Set(['interview','offer','rejected']),offer:new Set(['offer','hired','rejected']),hired:new Set(),rejected:new Set(),withdrawn:new Set()};
function text(value:unknown,max=2000){return String(value||'').trim().slice(0,max)||null;}
function validHttps(value:string|null){if(!value)return true;try{return new URL(value).protocol==='https:';}catch{return false;}}
function safeDate(value:unknown){if(!value)return null;const date=new Date(String(value));return Number.isNaN(date.getTime())?null:date.toISOString();}
function candidateEventNote(status:string){if(status==='in_review')return'Application moved into recruitment review.';if(status==='shortlisted')return'Application shortlisted for the next recruitment stage.';if(status==='interview')return'Interview details confirmed.';if(status==='offer')return'Offer prepared and sent.';if(status==='hired')return'Recruitment completed and onboarding started.';if(status==='rejected')return'Recruitment process closed with a final outcome.';return'Application status updated.';}
function onboardingDefaults(applicationId:string){return [
  {application_id:applicationId,item_key:'welcome',title:'Welcome and team introduction',description:'Review your welcome information and who you will be working with.'},
  {application_id:applicationId,item_key:'documentation',title:'Complete employment documentation',description:'Complete or return any required employment and policy documentation.'},
  {application_id:applicationId,item_key:'access',title:'Account and access preparation',description:'Confirm the accounts, tools and access you need before starting.'},
  {application_id:applicationId,item_key:'first_day',title:'Review first-day information',description:'Review your start time, joining location or link, and first-day plan.'}
];}

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career service not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||''),status=String(body.status||''),note=text(body.note,3000);const subjectOverride=text(body.subject,300);const bodyOverride=text(body.message,8000);const attachmentIds=Array.isArray(body.attachment_ids)?body.attachment_ids.map((x:unknown)=>String(x)).filter(Boolean):[];
    if(!id||!STAGES.has(status))return NextResponse.json({error:'Invalid recruitment stage.'},{status:400});
    if(attachmentIds.length>MAX_EMAIL_ATTACHMENTS)return NextResponse.json({error:`Offer emails can contain at most ${MAX_EMAIL_ATTACHMENTS} documents.`},{status:400});
    if(status!=='offer'&&attachmentIds.length)return NextResponse.json({error:'Document attachments are only available for communications that require them, currently career offers.'},{status:400});
    if(['interview','offer'].includes(status)&&!body.confirm_send)return NextResponse.json({error:`Review and confirm the ${status} communication before sending.`},{status:409});
    const interviewAt=safeDate(body.interview_at);const interviewTimezone=text(body.interview_timezone,100);const interviewFormat=text(body.interview_format,120);const interviewUrl=text(body.interview_url,1000);const interviewer=text(body.interviewer,200);const interviewInstructions=text(body.interview_instructions,4000);
    if(status==='interview'&&!interviewAt)return NextResponse.json({error:'A valid interview date and time are required.'},{status:400});if(status==='interview'&&!interviewTimezone)return NextResponse.json({error:'Interview timezone is required.'},{status:400});if(status==='interview'&&!interviewFormat)return NextResponse.json({error:'Interview format is required.'},{status:400});if(!validHttps(interviewUrl))return NextResponse.json({error:'Interview URL must be a valid HTTPS link.'},{status:400});
    const offerSalary=text(body.offer_salary_rate,300);const offerStartDate=text(body.offer_start_date,20);const offerEmploymentType=text(body.offer_employment_type,120);const offerManager=text(body.offer_manager,200);const offerWorking=text(body.offer_working_arrangement,300);const offerConditions=text(body.offer_conditions,5000);const offerDeadline=safeDate(body.offer_acceptance_deadline);const offerPersonal=text(body.offer_personal_message,4000);
    if(status==='offer'&&(!offerStartDate||!offerEmploymentType||!offerDeadline))return NextResponse.json({error:'Offer start date, employment type and a valid acceptance deadline are required.'},{status:400});
    const {data:application}=await db.from('career_applications').select('id,user_id,email,full_name,status,role_id,career_roles(title)').eq('id',id).maybeSingle();if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    if(!(TRANSITIONS[application.status]?.has(status)))return NextResponse.json({error:`Move this application through the recruitment stages in order. Current stage: ${application.status.replaceAll('_',' ')}.`},{status:409});
    if(attachmentIds.length){
      const {data:docs}=await db.from('career_offer_documents').select('id,application_id,size_bytes').in('id',attachmentIds).eq('application_id',id).eq('active',true);
      if((docs||[]).length!==attachmentIds.length)return NextResponse.json({error:'One or more offer documents are unavailable.'},{status:400});
      const totalBytes=(docs||[]).reduce((sum,document)=>sum+Number(document.size_bytes||0),0);
      if(totalBytes>MAX_EMAIL_ATTACHMENT_RAW_BYTES)return NextResponse.json({error:'Offer documents are too large to attach to one email. Keep the combined files at or below 28MB.'},{status:400});
    }
    const roleTitle=(application.career_roles as unknown as {title:string}|null)?.title||'Mettelo role';const now=new Date().toISOString();const patch:Record<string,unknown>={status,updated_at:now,admin_notes:note};
    if(status==='interview')Object.assign(patch,{interview_at:interviewAt,interview_timezone:interviewTimezone,interview_format:interviewFormat,interview_url:interviewUrl,interviewer,interview_instructions:interviewInstructions,interview_details:interviewInstructions});
    if(status==='offer')Object.assign(patch,{offer_salary_rate:offerSalary,offer_start_date:offerStartDate,offer_employment_type:offerEmploymentType,offer_manager:offerManager,offer_working_arrangement:offerWorking,offer_conditions:offerConditions,offer_acceptance_deadline:offerDeadline,offer_personal_message:offerPersonal,offer_details:offerPersonal||offerConditions});
    const {error}=await db.from('career_applications').update(patch).eq('id',id);if(error)throw error;
    await db.from('career_application_events').insert({application_id:id,from_status:application.status,to_status:status,note:candidateEventNote(status),actor_user_id:user.id});
    let onboardingItems:unknown[]=[];if(status==='hired'){await db.from('career_onboarding_items').upsert(onboardingDefaults(id),{onConflict:'application_id,item_key',ignoreDuplicates:true});const {data}=await db.from('career_onboarding_items').select('id,item_key,title,description,status,due_at,completed_at').eq('application_id',id).order('created_at',{ascending:true});onboardingItems=data||[];}
    const interviewSummary=status==='interview'?[interviewAt?`Interview: ${new Date(interviewAt).toLocaleString('en-GB')}`:'',interviewTimezone?`Timezone: ${interviewTimezone}`:'',interviewFormat?`Format: ${interviewFormat}`:'',interviewer?`Interviewer: ${interviewer}`:'',interviewInstructions||'',interviewUrl?`Joining link: ${interviewUrl}`:''].filter(Boolean).join('\n'):null;
    const offerSummary=status==='offer'?[offerSalary?`Salary / rate: ${offerSalary}`:'',offerStartDate?`Start date: ${offerStartDate}`:'',offerEmploymentType?`Employment type: ${offerEmploymentType}`:'',offerManager?`Manager: ${offerManager}`:'',offerWorking?`Working arrangement: ${offerWorking}`:'',offerConditions?`Conditions: ${offerConditions}`:'',offerDeadline?`Acceptance deadline: ${new Date(offerDeadline).toLocaleString('en-GB')}`:'',offerPersonal||''].filter(Boolean).join('\n'):null;
    const message=await careerMessageForDb(db,status,roleTitle,{recipientName:application.full_name,interviewAt,interviewDetails:interviewSummary,offerDetails:offerSummary,stageNote:null,subjectOverride,bodyOverride});
    const sent=await sendCareerEmail(db,{email:application.email,subject:message.subject,body:message.body,templateKey:`career_${status}`,userId:application.user_id||null,actionUrl:application.user_id?'/member/applications#careers':'/careers',name:application.full_name,roleTitle,payload:{career_application_id:id,interview_at:interviewAt,interview_timezone:interviewTimezone,interview_format:interviewFormat,interview_url:interviewUrl,interviewer,offer_start_date:offerStartDate,offer_acceptance_deadline:offerDeadline,offer_document_ids:attachmentIds}});
    const sendMode=message.template?.send_mode||((status==='in_review')?'automatic':'admin_review');
    await db.from('communication_records').insert({recipient_user_id:application.user_id||null,recipient_email:application.email,template_key:`career_${status}`,journey:'Careers',related_type:'career_application',related_id:id,subject:message.subject,body:message.body,send_mode:sendMode,status:sent.sent?'sent':'queued',outbox_id:sent.outboxId,actor_user_id:user.id,sent_at:sent.sent?now:null});
    await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_stage_transition',entity_type:'career_application',entity_id:id,metadata:{from_status:application.status,to_status:status,template_key:`career_${status}`,recipient_email:application.email,attachment_ids:attachmentIds,email_sent:sent.sent}});
    return NextResponse.json({ok:true,email_sent:sent.sent,email_queued:sent.queued,onboarding_items:onboardingItems});
  }catch(error){console.error('career stage update error',error);return NextResponse.json({error:'Unable to update candidate stage.'},{status:500});}
}
