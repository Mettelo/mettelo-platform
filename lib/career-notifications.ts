import type {SupabaseClient} from '@supabase/supabase-js';
import {deliverOutboxItem,enqueueEmail,notifyUser} from '@/lib/notifications';

type CareerEmailInput={email:string;subject:string;body:string;templateKey:string;userId?:string|null;actionUrl?:string|null;name?:string|null;roleTitle?:string|null;payload?:Record<string,unknown>};

export async function sendCareerEmail(db:SupabaseClient,input:CareerEmailInput){
  const dedupeKey=`${input.templateKey}:${input.email}:${input.subject}`;
  const payload={recipient_name:input.name||null,role_title:input.roleTitle||null,...(input.payload||{})};
  if(input.userId){
    await notifyUser(db,{userId:input.userId,email:input.email,type:input.templateKey,eventKey:input.templateKey,title:input.subject,subject:input.subject,body:input.body,actionUrl:input.actionUrl||null,dedupeKey,payload});
    const {data}=await db.from('email_outbox').select('status').eq('dedupe_key',`${input.userId}:${dedupeKey}`).maybeSingle();
    return {queued:true,sent:data?.status==='sent'};
  }
  const outbox=await enqueueEmail(db,{to:input.email,templateKey:input.templateKey,eventKey:input.templateKey,subject:input.subject,body:input.body,actionUrl:input.actionUrl||null,dedupeKey,payload});
  if(!outbox){const {data}=await db.from('email_outbox').select('status').eq('dedupe_key',dedupeKey).maybeSingle();return {queued:true,sent:data?.status==='sent'}}
  const result=await deliverOutboxItem(db,outbox);return {queued:true,sent:result.status==='sent'};
}

export function careerMessage(status:string,role:string,details?:{interviewAt?:string|null;interviewDetails?:string|null;offerDetails?:string|null}){
  if(status==='submitted')return {subject:`Application received: ${role} at Mettelo`,body:`We have received your application for ${role}. It is now in the recruitment queue. We will email you whenever the status changes, and signed-in applicants can also follow progress in My Mettelo.`};
  if(status==='in_review')return {subject:`Your ${role} application is now under review`,body:`Your application for ${role} is now being reviewed by the Mettelo team. No action is required from you at this stage. We will contact you when there is a decision or next step.`};
  if(status==='shortlisted')return {subject:`Congratulations: you have been shortlisted for ${role}`,body:`Your application for ${role} has been shortlisted. This means your application has progressed beyond the initial review and we would like to consider you for the next stage. We will share the next step as soon as it is confirmed.`};
  if(status==='interview')return {subject:`Congratulations: interview stage for ${role}`,body:`You have progressed to interview for ${role}.${details?.interviewAt?` Your interview is scheduled for ${new Date(details.interviewAt).toLocaleString('en-GB')}.`:''}${details?.interviewDetails?` ${details.interviewDetails}`:''} Please review the details carefully and contact us if anything is unclear.`};
  if(status==='offer')return {subject:`Congratulations: offer stage for ${role}`,body:`You have progressed to the offer stage for ${role}.${details?.offerDetails?` ${details.offerDetails}`:''} Please review the information carefully. We are happy to answer any questions before the next step is confirmed.`};
  if(status==='hired')return {subject:`Welcome to Mettelo: ${role}`,body:`Your application for ${role} is complete and you have been marked as hired. Congratulations and welcome to Mettelo. We are excited to see the capability, ideas and contribution you bring to the team. Your onboarding information will follow separately.`};
  if(status==='rejected')return {subject:`Application outcome: ${role} at Mettelo`,body:`Thank you for the time and effort you invested in applying for ${role}. We have completed the review and will not be progressing this application further on this occasion. Your Mettelo account remains available, and you are welcome to apply for future roles that match your experience.`};
  return {subject:`Application update: ${role} at Mettelo`,body:`There has been an update to your application for ${role}. Open My Mettelo to view the latest status.`};
}
