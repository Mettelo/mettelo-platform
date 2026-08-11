import type {SupabaseClient} from '@supabase/supabase-js';

const site=process.env.NEXT_PUBLIC_SITE_URL||'https://mettelo.com';

export async function sendCareerEmail(db:SupabaseClient,input:{email:string;subject:string;body:string;templateKey:string;userId?:string|null;actionUrl?:string|null}){
  const {data:outbox}=await db.from('email_outbox').insert({user_id:input.userId||null,recipient_email:input.email,template_key:input.templateKey,subject:input.subject,payload:{body:input.body,action_url:input.actionUrl||null}}).select('id').single();
  if(input.userId){await db.from('notifications').insert({user_id:input.userId,type:input.templateKey,title:input.subject,body:input.body,action_url:input.actionUrl||null});}
  const apiKey=process.env.RESEND_API_KEY;const from=process.env.METTELO_EMAIL_FROM;
  if(!outbox?.id)return {queued:false,sent:false};
  if(!apiKey||!from){await db.from('email_outbox').update({status:'failed',last_error:'Email provider is not configured.'}).eq('id',outbox.id);return {queued:true,sent:false};}
  try{
    const href=input.actionUrl?`${site}${input.actionUrl}`:site;
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:input.email,subject:input.subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#10131d"><p>${input.body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p><p><a href="${href}">Open Mettelo</a></p></div>`})});
    if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
    await db.from('email_outbox').update({status:'sent',sent_at:new Date().toISOString(),attempts:1,last_error:null}).eq('id',outbox.id);
    return {queued:true,sent:true};
  }catch(error){await db.from('email_outbox').update({status:'failed',attempts:1,last_error:error instanceof Error?error.message:'Email delivery failed'}).eq('id',outbox.id);return {queued:true,sent:false};}
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
