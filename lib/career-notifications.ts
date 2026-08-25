import type {SupabaseClient} from '@supabase/supabase-js';
import {deliverOutboxItem,enqueueEmail} from '@/lib/notifications';
import {resolveCommunication} from '@/lib/communication-templates';

type CareerEmailInput={email:string;subject:string;body:string;templateKey:string;userId?:string|null;actionUrl?:string|null;name?:string|null;roleTitle?:string|null;payload?:Record<string,unknown>;idempotencyKey?:string|null};

export async function sendCareerEmail(db:SupabaseClient,input:CareerEmailInput){
  // Recruitment communications intentionally use the email outbox directly.
  // Do not create generic in-app notifications: My Mettelo is reserved for
  // member/project activity and must not expose the recruitment pipeline.
  // Explicit manual sends may supply an idempotency key so browser retries do
  // not duplicate delivery while a later interview/message can still be sent.
  const fallbackDedupe=`${input.templateKey}:${input.email}:${input.subject}`;
  const dedupeBasis=input.idempotencyKey?.trim()||fallbackDedupe;
  const dedupeKey=input.userId?`${input.userId}:${dedupeBasis}`:dedupeBasis;
  const payload={recipient_name:input.name||null,role_title:input.roleTitle||null,...(input.payload||{})};
  const actionUrl=input.actionUrl?.startsWith('/member')?'/careers/applications':(input.actionUrl||'/careers/applications');
  const outbox=await enqueueEmail(db,{userId:input.userId||null,to:input.email,templateKey:input.templateKey,eventKey:input.templateKey,subject:input.subject,body:input.body,actionUrl,dedupeKey,payload});
  if(!outbox){const {data}=await db.from('email_outbox').select('status,id').eq('dedupe_key',dedupeKey).maybeSingle();return {queued:true,sent:data?.status==='sent',outboxId:data?.id||null}}
  const result=await deliverOutboxItem(db,outbox);return {queued:true,sent:result.status==='sent',outboxId:outbox.id};
}

export function careerMessage(status:string,role:string,details?:{interviewAt?:string|null;interviewDetails?:string|null;offerDetails?:string|null}){
  if(status==='submitted')return {subject:`Application received: ${role} at Mettelo`,body:`Thank you for applying for ${role} at Mettelo. Your application has been received successfully. We will review the information and evidence you submitted and contact you when there is a meaningful update. You can also use the Careers application tracker to follow your progress.`};
  if(status==='in_review')return {subject:`Your ${role} application is under review`,body:`Your application for ${role} is now being reviewed by the Mettelo team. We are considering the experience, motivation and evidence you shared against what the role needs. There is nothing you need to do right now; we will contact you when the review produces a next step.`};
  if(status==='shortlisted')return {subject:`You have been shortlisted for ${role}`,body:`Good news — your application for ${role} has progressed beyond the initial review and you have been shortlisted. This means we would like to consider you further. We will contact you separately when the next step, such as an interview, is confirmed.`};
  if(status==='interview')return {subject:`Interview invitation: ${role} at Mettelo`,body:`We would like to invite you to interview for ${role}.${details?.interviewAt?` Your interview is scheduled for ${new Date(details.interviewAt).toLocaleString('en-GB')}.`:''}${details?.interviewDetails?` ${details.interviewDetails}`:''} Please review the date, time, timezone and joining details carefully. The conversation is an opportunity for us to understand your experience in more depth and for you to learn more about the role and Mettelo.`};
  if(status==='offer')return {subject:`Your formal offer for ${role} at Mettelo`,body:`We are pleased to send you the formal offer for ${role} at Mettelo.${details?.offerDetails?` ${details.offerDetails}`:''} Please review the offer details and any attached documents carefully, including the start date, terms and acceptance deadline. If anything is unclear, reply before accepting so we can address your questions.`};
  if(status==='hired')return {subject:`You have been successful: ${role} at Mettelo`,body:`Congratulations — you have been successful in your application for ${role}, and we would like you to join Mettelo. This message confirms the recruitment decision only. Your formal offer, including the relevant terms and documentation, will be sent to you separately for review.`};
  if(status==='rejected')return {subject:`Update on your application for ${role}`,body:`Thank you for the time and thought you put into your application for ${role}. After completing our review, we will not be progressing your application further on this occasion. We appreciate your interest in Mettelo, and you are welcome to apply for future roles that are a strong match for your experience and goals.`};
  if(status==='custom')return {subject:`Update on your ${role} application`,body:`We have an update about your application for ${role}. Please review the message carefully, and reply if the update asks you for information or if anything is unclear.`};
  return {subject:`Application update: ${role} at Mettelo`,body:`There has been an update to your application for ${role}. Open the Careers application tracker to review the latest status and any next step.`};
}

export async function careerMessageForDb(db:SupabaseClient,status:string,role:string,details?:{recipientName?:string|null;interviewAt?:string|null;interviewDetails?:string|null;offerDetails?:string|null;stageNote?:string|null;subjectOverride?:string|null;bodyOverride?:string|null}){const fallback=careerMessage(status,role,details);if(details?.subjectOverride||details?.bodyOverride)return{subject:details.subjectOverride?.trim()||fallback.subject,body:details.bodyOverride?.trim()||fallback.body,template:null};return resolveCommunication(db,`career_${status}`,{recipient_name:details?.recipientName||'there',role_title:role,interview_at:details?.interviewAt?new Date(details.interviewAt).toLocaleString('en-GB'):'',interview_details:details?.interviewDetails||'',offer_details:details?.offerDetails||'',stage_note:details?.stageNote||''},fallback);}
