import {createClient, type SupabaseClient} from '@supabase/supabase-js';

export function serviceDb(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url&&key?createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}):null;
}

type NotifyInput={userId:string;email?:string|null;projectId?:string|null;applicationId?:string|null;type:string;title:string;body:string;actionUrl?:string|null;subject?:string;templateKey?:string;payload?:Record<string,unknown>};

async function trySendEmail(db:SupabaseClient,outboxId:string,to:string,subject:string,body:string){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.METTELO_EMAIL_FROM;
  if(!apiKey||!from)return;
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to,subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#10131d"><p>${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL||'https://mettelo.com'}">Open Mettelo</a></p></div>`})});
    if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
    await db.from('email_outbox').update({status:'sent',sent_at:new Date().toISOString(),attempts:1,last_error:null}).eq('id',outboxId);
  }catch(error){
    await db.from('email_outbox').update({status:'failed',attempts:1,last_error:error instanceof Error?error.message:'Email delivery failed'}).eq('id',outboxId);
  }
}

export async function notifyUser(db:SupabaseClient,input:NotifyInput){
  await db.from('notifications').insert({user_id:input.userId,project_id:input.projectId||null,application_id:input.applicationId||null,type:input.type,title:input.title,body:input.body,action_url:input.actionUrl||null});
  if(!input.email)return;
  const subject=input.subject||input.title;
  const {data:outbox}=await db.from('email_outbox').insert({user_id:input.userId,recipient_email:input.email,template_key:input.templateKey||input.type,subject,payload:{body:input.body,action_url:input.actionUrl||null,...(input.payload||{})}}).select('id').single();
  if(outbox?.id)await trySendEmail(db,outbox.id,input.email,subject,input.body);
}

export async function notifyAdmins(db:SupabaseClient,input:Omit<NotifyInput,'userId'|'email'>){
  const {data}=await db.auth.admin.listUsers({page:1,perPage:1000});
  const admins=data.users.filter(user=>user.app_metadata?.role==='admin');
  await Promise.all(admins.map(admin=>notifyUser(db,{...input,userId:admin.id,email:admin.email||null})));
}
