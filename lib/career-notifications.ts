import type {SupabaseClient} from '@supabase/supabase-js';
import {deliverOutboxItem,enqueueEmail,notifyUser} from '@/lib/notifications';

export async function sendCareerEmail(db:SupabaseClient,input:{email:string;subject:string;body:string;templateKey:string;userId?:string|null;actionUrl?:string|null}){
  const dedupeKey=`${input.templateKey}:${input.email}:${input.subject}`;
  if(input.userId){
    await notifyUser(db,{userId:input.userId,email:input.email,type:input.templateKey,eventKey:input.templateKey,title:input.subject,subject:input.subject,body:input.body,actionUrl:input.actionUrl||null,dedupeKey});
    const {data}=await db.from('email_outbox').select('status').eq('dedupe_key',`${input.userId}:${dedupeKey}`).maybeSingle();
    return {queued:true,sent:data?.status==='sent'};
  }
  const outbox=await enqueueEmail(db,{to:input.email,templateKey:input.templateKey,eventKey:input.templateKey,subject:input.subject,body:input.body,actionUrl:input.actionUrl||null,dedupeKey});
  if(!outbox){const {data}=await db.from('email_outbox').select('status').eq('dedupe_key',dedupeKey).maybeSingle();return {queued:true,sent:data?.status==='sent'}}
  const result=await deliverOutboxItem(db,outbox);return {queued:true,sent:result.status==='sent'};
}

export function careerMessage(status:string,role:string,details?:{interviewAt?:string|null;interviewDetails?:string|null;offerDetails?:string|null}){
  if(status==='submitted')return {subject:`Application received — ${role} at Mettelo`,body:`Thank you for applying for ${role} at Mettelo. Your application has been received and will be reviewed.`};
  if(status==='in_review')return {subject:`Application update — ${role} at Mettelo`,body:`Your application for ${role} is now under review by the Mettelo team.`};
  if(status==='shortlisted')return {subject:`You have been shortlisted — ${role} at Mettelo`,body:`Your application for ${role} has been shortlisted. We will contact you with the next step.`};
  if(status==='interview')return {subject:`Interview stage — ${role} at Mettelo`,body:`You have progressed to interview for ${role}.${details?.interviewAt?` Interview: ${new Date(details.interviewAt).toLocaleString('en-GB')}.`:''}${details?.interviewDetails?` ${details.interviewDetails}`:''}`};
  if(status==='offer')return {subject:`Offer stage — ${role} at Mettelo`,body:`You have progressed to the offer stage for ${role}.${details?.offerDetails?` ${details.offerDetails}`:''}`};
  if(status==='hired')return {subject:`Welcome to Mettelo — ${role}`,body:`Your application for ${role} has been marked as hired. Welcome to Mettelo. We will share onboarding details with you directly.`};
  if(status==='rejected')return {subject:`Application outcome — ${role} at Mettelo`,body:`Thank you for the time you invested in applying for ${role}. We will not be progressing your application further on this occasion.`};
  return {subject:`Application update — ${role} at Mettelo`,body:`There has been an update to your application for ${role}.`};
}
