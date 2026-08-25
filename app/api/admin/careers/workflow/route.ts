import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {careerMessageForDb,sendCareerEmail} from '@/lib/career-notifications';
import {MAX_EMAIL_ATTACHMENTS,MAX_EMAIL_ATTACHMENT_RAW_BYTES} from '@/lib/email-attachments';

const PRIMARY_STAGES=new Set(['submitted','in_review','shortlisted','interview']);
const FINAL_OUTCOMES=new Set(['pending','hired','rejected']);
const MANUAL_KINDS=new Set(['interview','hired','rejected','offer','custom']);

type ApplicationRow={
  id:string;user_id:string|null;email:string;full_name:string;status:string;final_outcome:string|null;role_id:string|null;
  career_roles:{title:string}|null;
};

function text(value:unknown,max=2000){return String(value||'').trim().slice(0,max)||null;}
function safeDate(value:unknown){if(!value)return null;const date=new Date(String(value));return Number.isNaN(date.getTime())?null:date.toISOString();}
function validHttps(value:string|null){if(!value)return true;try{return new URL(value).protocol==='https:';}catch{return false;}}
function normalisedStage(status:string){return ['offer','hired','rejected'].includes(status)?'interview':status;}
function stageLabel(status:string){if(status==='submitted')return'Application Received';if(status==='in_review')return'Under Review';if(status==='shortlisted')return'Shortlisted';if(status==='interview')return'Interview & Final Decision';return status.replaceAll('_',' ');}
function stageEventNote(status:string){if(status==='submitted')return'Application returned to Application Received.';if(status==='in_review')return'Application moved into recruitment review.';if(status==='shortlisted')return'Application shortlisted.';return'Application moved to Interview & Final Decision. Final actions are Admin-controlled.';}
function onboardingDefaults(applicationId:string){return [
  {application_id:applicationId,item_key:'welcome',title:'Welcome and team introduction',description:'Review your welcome information and who you will be working with.'},
  {application_id:applicationId,item_key:'documentation',title:'Complete employment documentation',description:'Complete or return any required employment and policy documentation.'},
  {application_id:applicationId,item_key:'access',title:'Account and access preparation',description:'Confirm the accounts, tools and access you need before starting.'},
  {application_id:applicationId,item_key:'first_day',title:'Review first-day information',description:'Review your start time, joining location or link, and first-day plan.'}
];}

async function loadApplication(db:ReturnType<typeof serviceDb>,id:string){
  if(!db)return null;
  const {data}=await db.from('career_applications').select('id,user_id,email,full_name,status,final_outcome,role_id,career_roles(title)').eq('id',id).maybeSingle();
  return data as unknown as ApplicationRow|null;
}

async function recordCommunication(db:NonNullable<ReturnType<typeof serviceDb>>,input:{application:ApplicationRow;actorId:string;kind:string;subject:string;body:string;sendMode:'automatic'|'manual';sent:{queued:boolean;sent:boolean;outboxId:string|null};attachmentIds?:string[];sendToken?:string|null}){
  if(input.sent.outboxId){
    const {data:existing}=await db.from('communication_records').select('id,status,sent_at').eq('related_type','career_application').eq('related_id',input.application.id).eq('outbox_id',input.sent.outboxId).maybeSingle();
    if(existing)return existing;
  }
  const now=new Date().toISOString();
  const {data}=await db.from('communication_records').insert({
    recipient_user_id:input.application.user_id||null,
    recipient_email:input.application.email,
    template_key:`career_${input.kind}`,
    journey:'Careers',related_type:'career_application',related_id:input.application.id,
    subject:input.subject,body:input.body,send_mode:input.sendMode,
    status:input.sent.sent?'sent':'queued',outbox_id:input.sent.outboxId,
    actor_user_id:input.actorId,sent_at:input.sent.sent?now:null
  }).select('id,status,sent_at').single();
  await db.from('communication_audit_log').insert({actor_user_id:input.actorId,action:input.sendMode==='automatic'?'career_automatic_stage_communication':'career_manual_communication',entity_type:'career_application',entity_id:input.application.id,metadata:{communication_kind:input.kind,recipient_email:input.application.email,attachment_ids:input.attachmentIds||[],send_token:input.sendToken||null,email_sent:input.sent.sent,email_queued:input.sent.queued}});
  return data;
}

async function sendAutomaticStageCommunication(db:NonNullable<ReturnType<typeof serviceDb>>,application:ApplicationRow,status:string,actorId:string){
  if(!['in_review','shortlisted'].includes(status))return{sent:false,queued:false,skipped:true};
  const templateKey=`career_${status}`;
  const {data:existing}=await db.from('communication_records').select('id').eq('related_type','career_application').eq('related_id',application.id).eq('template_key',templateKey).in('status',['queued','sent']).limit(1).maybeSingle();
  if(existing)return{sent:false,queued:false,skipped:true};
  const roleTitle=application.career_roles?.title||'Mettelo role';
  const message=await careerMessageForDb(db,status,roleTitle,{recipientName:application.full_name});
  const sent=await sendCareerEmail(db,{email:application.email,subject:message.subject,body:message.body,templateKey,userId:application.user_id||null,actionUrl:'/careers/applications',name:application.full_name,roleTitle,idempotencyKey:`career-stage:${application.id}:${status}`});
  await recordCommunication(db,{application,actorId,kind:status,subject:message.subject,body:message.body,sendMode:'automatic',sent});
  return{sent:sent.sent,queued:sent.queued,skipped:false};
}

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career service not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||'');const action=String(body.action||'');const note=text(body.note,3000);
    if(!id)return NextResponse.json({error:'Career application is required.'},{status:400});
    const application=await loadApplication(db,id);if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    const currentStage=normalisedStage(application.status);const currentOutcome=application.final_outcome||(['hired','rejected'].includes(application.status)?application.status:'pending');

    if(action==='stage'){
      const stage=String(body.stage||'');if(!PRIMARY_STAGES.has(stage))return NextResponse.json({error:'Choose one of the four recruitment stages.'},{status:400});
      const now=new Date().toISOString();const nextOutcome=stage==='interview'?(currentStage==='interview'?currentOutcome:'pending'):'pending';
      const patch:Record<string,unknown>={status:stage,admin_notes:note,updated_at:now};
      if(nextOutcome!==currentOutcome)Object.assign(patch,{final_outcome:nextOutcome,final_outcome_updated_at:now,final_outcome_updated_by:user.id});
      const {error}=await db.from('career_applications').update(patch).eq('id',id);if(error)throw error;
      await db.from('career_application_events').insert({application_id:id,from_status:currentStage,to_status:stage,note:stageEventNote(stage),actor_user_id:user.id});
      const communication=await sendAutomaticStageCommunication(db,{...application,status:stage,final_outcome:nextOutcome},stage,user.id);
      await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_stage_update',entity_type:'career_application',entity_id:id,metadata:{from_stage:currentStage,to_stage:stage,from_outcome:currentOutcome,to_outcome:nextOutcome,automatic_communication_sent:communication.sent,automatic_communication_queued:communication.queued,automatic_communication_skipped:communication.skipped}});
      return NextResponse.json({ok:true,status:stage,stage_label:stageLabel(stage),final_outcome:nextOutcome,email_sent:communication.sent,email_queued:communication.queued,email_skipped:communication.skipped});
    }

    if(action==='outcome'){
      const outcome=String(body.outcome||'');if(!FINAL_OUTCOMES.has(outcome))return NextResponse.json({error:'Choose Pending, Hired or Rejected.'},{status:400});
      if(currentStage!=='interview')return NextResponse.json({error:'Final outcome is available only in Interview & Final Decision.'},{status:409});
      const now=new Date().toISOString();
      const {error}=await db.from('career_applications').update({status:'interview',final_outcome:outcome,final_outcome_updated_at:now,final_outcome_updated_by:user.id,admin_notes:note,updated_at:now}).eq('id',id);if(error)throw error;
      await db.from('career_application_events').insert({application_id:id,from_status:'interview',to_status:'interview',note:`Final outcome changed from ${currentOutcome.replaceAll('_',' ')} to ${outcome.replaceAll('_',' ')}. No candidate communication was sent.`,actor_user_id:user.id});
      let onboardingItems:unknown[]=[];
      if(outcome==='hired'){
        await db.from('career_onboarding_items').upsert(onboardingDefaults(id),{onConflict:'application_id,item_key',ignoreDuplicates:true});
        const {data}=await db.from('career_onboarding_items').select('id,item_key,title,description,status,due_at,completed_at').eq('application_id',id).order('created_at',{ascending:true});onboardingItems=data||[];
      }
      await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_final_outcome_update',entity_type:'career_application',entity_id:id,metadata:{stage:'interview',from_outcome:currentOutcome,to_outcome:outcome,communication_sent:false}});
      return NextResponse.json({ok:true,status:'interview',final_outcome:outcome,onboarding_items:onboardingItems,email_sent:false});
    }

    if(action==='communicate'){
      const kind=String(body.kind||'');if(!MANUAL_KINDS.has(kind))return NextResponse.json({error:'Invalid recruitment communication.'},{status:400});
      if(body.confirm_send!==true)return NextResponse.json({error:'Review and confirm this candidate communication before sending.'},{status:409});
      if(currentStage!=='interview')return NextResponse.json({error:'Final-stage communications are available only in Interview & Final Decision.'},{status:409});
      if(kind==='hired'&&currentOutcome!=='hired')return NextResponse.json({error:'Mark the candidate Hired before sending the hired notification.'},{status:409});
      if(kind==='rejected'&&currentOutcome!=='rejected')return NextResponse.json({error:'Mark the candidate Rejected before sending the rejection message.'},{status:409});
      if(kind==='offer'&&currentOutcome!=='hired')return NextResponse.json({error:'A formal offer can be sent only after the candidate is marked Hired.'},{status:409});
      if(kind==='interview'&&currentOutcome!=='pending')return NextResponse.json({error:'Return the final outcome to Decision Pending before scheduling another interview.'},{status:409});

      const subjectOverride=text(body.subject,300);const bodyOverride=text(body.message,8000);if(!subjectOverride||!bodyOverride)return NextResponse.json({error:'Email subject and message are required.'},{status:400});
      const sendToken=text(body.send_token,160);if(!sendToken)return NextResponse.json({error:'Communication confirmation token is required.'},{status:400});
      const attachmentIds=Array.isArray(body.attachment_ids)?body.attachment_ids.map((x:unknown)=>String(x)).filter(Boolean):[];
      if(attachmentIds.length>MAX_EMAIL_ATTACHMENTS)return NextResponse.json({error:`Offer emails can contain at most ${MAX_EMAIL_ATTACHMENTS} documents.`},{status:400});
      if(kind!=='offer'&&attachmentIds.length)return NextResponse.json({error:'Attachments are available only for formal offer communications.'},{status:400});

      const interviewAt=kind==='interview'?safeDate(body.interview_at):null;const interviewTimezone=kind==='interview'?text(body.interview_timezone,100):null;const interviewFormat=kind==='interview'?text(body.interview_format,120):null;const interviewUrl=kind==='interview'?text(body.interview_url,1000):null;const interviewer=kind==='interview'?text(body.interviewer,200):null;const interviewInstructions=kind==='interview'?text(body.interview_instructions,4000):null;
      if(kind==='interview'&&(!interviewAt||!interviewTimezone||!interviewFormat))return NextResponse.json({error:'Interview date/time, timezone and format are required.'},{status:400});
      if(kind==='interview'&&!validHttps(interviewUrl))return NextResponse.json({error:'Interview URL must be a valid HTTPS link.'},{status:400});

      const offerSalary=kind==='offer'?text(body.offer_salary_rate,300):null;const offerStartDate=kind==='offer'?text(body.offer_start_date,20):null;const offerEmploymentType=kind==='offer'?text(body.offer_employment_type,120):null;const offerManager=kind==='offer'?text(body.offer_manager,200):null;const offerWorking=kind==='offer'?text(body.offer_working_arrangement,300):null;const offerConditions=kind==='offer'?text(body.offer_conditions,5000):null;const offerDeadline=kind==='offer'?safeDate(body.offer_acceptance_deadline):null;const offerPersonal=kind==='offer'?text(body.offer_personal_message,4000):null;
      if(kind==='offer'&&(!offerStartDate||!offerEmploymentType||!offerDeadline))return NextResponse.json({error:'Offer start date, employment type and acceptance deadline are required.'},{status:400});
      if(attachmentIds.length){const {data:docs}=await db.from('career_offer_documents').select('id,size_bytes').in('id',attachmentIds).eq('application_id',id).eq('active',true);if((docs||[]).length!==attachmentIds.length)return NextResponse.json({error:'One or more offer documents are unavailable.'},{status:400});const total=(docs||[]).reduce((sum,doc)=>sum+Number(doc.size_bytes||0),0);if(total>MAX_EMAIL_ATTACHMENT_RAW_BYTES)return NextResponse.json({error:'Offer documents are too large to attach to one email. Keep the combined files at or below 28MB.'},{status:400});}

      const now=new Date().toISOString();
      if(kind==='interview'){
        const {error}=await db.from('career_applications').update({interview_at:interviewAt,interview_timezone:interviewTimezone,interview_format:interviewFormat,interview_url:interviewUrl,interviewer,interview_instructions:interviewInstructions,interview_details:interviewInstructions,updated_at:now}).eq('id',id);if(error)throw error;
      }
      if(kind==='offer'){
        const {error}=await db.from('career_applications').update({offer_salary_rate:offerSalary,offer_start_date:offerStartDate,offer_employment_type:offerEmploymentType,offer_manager:offerManager,offer_working_arrangement:offerWorking,offer_conditions:offerConditions,offer_acceptance_deadline:offerDeadline,offer_personal_message:offerPersonal,offer_details:offerPersonal||offerConditions,offer_status:'ready',updated_at:now}).eq('id',id);if(error)throw error;
      }

      const roleTitle=application.career_roles?.title||'Mettelo role';
      const interviewSummary=kind==='interview'?[interviewAt?`Interview: ${new Date(interviewAt).toLocaleString('en-GB')}`:'',interviewTimezone?`Timezone: ${interviewTimezone}`:'',interviewFormat?`Format: ${interviewFormat}`:'',interviewer?`Interviewer: ${interviewer}`:'',interviewInstructions||'',interviewUrl?`Joining link: ${interviewUrl}`:''].filter(Boolean).join('\n'):null;
      const offerSummary=kind==='offer'?[offerSalary?`Salary / rate: ${offerSalary}`:'',offerStartDate?`Start date: ${offerStartDate}`:'',offerEmploymentType?`Employment type: ${offerEmploymentType}`:'',offerManager?`Manager: ${offerManager}`:'',offerWorking?`Working arrangement: ${offerWorking}`:'',offerConditions?`Conditions: ${offerConditions}`:'',offerDeadline?`Acceptance deadline: ${new Date(offerDeadline).toLocaleString('en-GB')}`:'',offerPersonal||''].filter(Boolean).join('\n'):null;
      const message=await careerMessageForDb(db,kind,roleTitle,{recipientName:application.full_name,interviewAt,interviewDetails:interviewSummary,offerDetails:offerSummary,subjectOverride,bodyOverride});
      let sent:{queued:boolean;sent:boolean;outboxId:string|null};
      try{
        sent=await sendCareerEmail(db,{email:application.email,subject:message.subject,body:message.body,templateKey:`career_${kind}`,userId:application.user_id||null,actionUrl:'/careers/applications',name:application.full_name,roleTitle,idempotencyKey:`career-manual:${id}:${kind}:${sendToken}`,payload:{career_application_id:id,communication_kind:kind,interview_at:interviewAt,interview_timezone:interviewTimezone,interview_format:interviewFormat,interview_url:interviewUrl,interviewer,offer_start_date:offerStartDate,offer_acceptance_deadline:offerDeadline,offer_document_ids:attachmentIds}});
      }catch(error){
        if(kind==='offer')await db.from('career_applications').update({offer_status:'send_failed',updated_at:new Date().toISOString()}).eq('id',id);
        await db.from('communication_records').insert({recipient_user_id:application.user_id||null,recipient_email:application.email,template_key:`career_${kind}`,journey:'Careers',related_type:'career_application',related_id:id,subject:message.subject,body:message.body,send_mode:'manual',status:'failed',actor_user_id:user.id});
        await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_manual_communication_failed',entity_type:'career_application',entity_id:id,metadata:{communication_kind:kind,send_token:sendToken,recipient_email:application.email,attachment_ids:attachmentIds}});
        console.error('career manual communication failed',error);return NextResponse.json({error:'The candidate communication could not be sent. The candidate state was not changed.'},{status:502});
      }
      const record=await recordCommunication(db,{application,actorId:user.id,kind,subject:message.subject,body:message.body,sendMode:'manual',sent,attachmentIds,sendToken});
      if(kind==='interview')await db.from('career_application_events').insert({application_id:id,from_status:'interview',to_status:'interview',note:'Interview scheduled or updated. Candidate communication was explicitly sent by Admin.',actor_user_id:user.id});
      if(kind==='offer')await db.from('career_applications').update({offer_status:sent.sent?'sent':'ready',offer_sent_at:sent.sent?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id);
      return NextResponse.json({ok:true,email_sent:sent.sent,email_queued:sent.queued,communication:record,offer_status:kind==='offer'?(sent.sent?'sent':'ready'):undefined});
    }

    return NextResponse.json({error:'Invalid recruitment workflow action.'},{status:400});
  }catch(error){console.error('career workflow error',error);return NextResponse.json({error:'Unable to update the recruitment workflow.'},{status:500});}
}
