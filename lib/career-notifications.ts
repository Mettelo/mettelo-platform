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
  if(status==='submitted')return {subject:`Application received: ${role} at Mettelo`,body:`We have received your application for ${role}. It is now in the recruitment queue. We will email you whenever the status changes, and signed-in applicants can also follow progress in the Careers application tracker.`};
  if(status==='in_review')return {subject:`Your ${role} application is now under review`,body:`Your application for ${role} is now being reviewed by the Mettelo team. No action is required from you at this stage. We will contact you when there is a decision or next step.`};
  if(status==='shortlisted')return {subject:`Congratulations: you have been shortlisted for ${role}`,body:`Your application for ${role} has been shortlisted. This means your application has progressed beyond the initial review and we would like to consider you for the next stage. We will share the next step as soon as it is confirmed.`};
  if(status==='interview')return {subject:`Interview details for ${role}`,body:`We would like to invite you to interview for ${role}.${details?.interviewAt?` Your interview is scheduled for ${new Date(details.interviewAt).toLocaleString('en-GB')}.`:''}${details?.interviewDetails?` ${details.interviewDetails}`:''} Please review the details carefully and contact us if anything is unclear.`};
  if(status==='offer')return {subject:`Your formal offer for ${role}`,body:`We are pleased to send your formal offer for ${role}.${details?.offerDetails?` ${details.offerDetails}`:''} Please review the information and attached documentation carefully. We are happy to answer any questions.`};
  if(status==='hired')return {subject:`Congratulations: ${role} at Mettelo`,body:`Congratulations — you have been successful in your application for ${role}. We are pleased to confirm that we would like you to join Mettelo. Your formal offer and relevant documentation will be sent to you separately shortly.`};
  if(status==='rejected')return {subject:`Application outcome: ${role} at Mettelo`,body:`Thank you for the time and effort you invested in applying for ${role}. We have completed the review and will not be progressing this application further on this occasion. Your Mettelo account remains available, and you are welcome to apply for future roles that match your experience.`};
  if(status==='custom')return {subject:`Update on your ${role} application`,body:`We have an update regarding your application for ${role}.`};
  return {subject:`Application update: ${role} at Mettelo`,body:`There has been an update to your application for ${role}. Open the Careers application tracker to view the latest status.`};
}

export async function careerMessageForDb(db:SupabaseClient,status:string,role:string,details?:{recipientName?:string|null;interviewAt?:string|null;interviewDetails?:string|null;offerDetails?:string|null;stageNote?:string|null;subjectOverride?:string|null;bodyOverride?:string|null}){const fallback=careerMessage(status,role,details);if(details?.subjectOverride||details?.bodyOverride)return{subject:details.subjectOverride?.trim()||fallback.subject,body:details.bodyOverride?.trim()||fallback.body,template:null};return resolveCommunication(db,`career_${status}`,{recipient_name:details?.recipientName||'there',role_title:role,interview_at:details?.interviewAt?new Date(details.interviewAt).toLocaleString('en-GB'):'',interview_details:details?.interviewDetails||'',offer_details:details?.offerDetails||'',stage_note:details?.stageNote||''},fallback);}
