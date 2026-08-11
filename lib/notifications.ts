import type {SupabaseClient} from '@supabase/supabase-js';

type NotifyInput={userId:string;email?:string|null;projectId?:string|null;applicationId?:string|null;type:string;title:string;body:string;actionUrl?:string|null;subject?:string;templateKey?:string;payload?:Record<string,unknown>;eventKey?:string;dedupeKey?:string|null;email?:string|null};
type OutboxRow={id:string;user_id:string|null;recipient_email:string;template_key:string;subject:string;payload:Record<string,unknown>;status:string;attempts:number;max_attempts:number;next_attempt_at:string|null;permanent_failure:boolean};

function escapeHtml(value:string){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function backoffMinutes(attempt:number){return Math.min(60*12,Math.max(2,Math.pow(2,Math.max(0,attempt-1))*2))}
function providerErrorPermanent(status:number){return status>=400&&status<500&&status!==408&&status!==409&&status!==425&&status!==429}
function siteUrl(){return (process.env.NEXT_PUBLIC_SITE_URL||'https://mettelo.com').replace(/\/$/,'')}
function emailHtml(body:string,actionUrl?:string|null){const action=actionUrl?`${siteUrl()}${actionUrl.startsWith('/')?actionUrl:`/${actionUrl}`}`:siteUrl();return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#10131d;max-width:640px;margin:auto"><div style="font-weight:800;font-size:20px;margin-bottom:20px">Mettelo</div><p>${escapeHtml(body).replace(/\n/g,'<br>')}</p><p style="margin-top:28px"><a href="${escapeHtml(action)}" style="display:inline-block;background:#10131d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">Open Mettelo</a></p><p style="color:#6b7280;font-size:12px;margin-top:28px">This is a transactional Mettelo notification about activity relevant to your account or application.</p></div>`}

export async function enqueueEmail(db:SupabaseClient,input:{userId?:string|null;to:string;templateKey:string;subject:string;body:string;actionUrl?:string|null;eventKey?:string;dedupeKey?:string|null;payload?:Record<string,unknown>}){
  const row={user_id:input.userId||null,recipient_email:input.to,template_key:input.templateKey,subject:input.subject,payload:{body:input.body,action_url:input.actionUrl||null,...(input.payload||{})},status:'queued',event_key:input.eventKey||input.templateKey,dedupe_key:input.dedupeKey||null,next_attempt_at:new Date().toISOString()};
  const {data,error}=await db.from('email_outbox').insert(row).select('*').single();
  if(error){if(error.code==='23505')return null;throw error}return data as OutboxRow;
}

export async function deliverOutboxItem(db:SupabaseClient,item:OutboxRow){
  if(['sent','dead_letter','cancelled'].includes(item.status))return {status:item.status};
  const apiKey=process.env.RESEND_API_KEY;const from=process.env.METTELO_EMAIL_FROM;
  const attempt=(item.attempts||0)+1;const now=new Date().toISOString();
  await db.from('email_outbox').update({status:'sending',last_attempt_at:now,updated_at:now}).eq('id',item.id);
  await db.from('email_delivery_attempts').insert({outbox_id:item.id,attempt_number:attempt,status:'sending'});
  if(!apiKey||!from){const error='Email provider is not configured.';await recordFailure(db,item,attempt,error,503,false);return {status:'failed',error}}
  try{
    const body=String(item.payload?.body||'');const actionUrl=typeof item.payload?.action_url==='string'?item.payload.action_url:null;
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:item.recipient_email,subject:item.subject,html:emailHtml(body,actionUrl)})});
    const raw=await response.text();let providerId:string|null=null;try{providerId=(JSON.parse(raw) as {id?:string}).id||null}catch{}
    if(!response.ok){const permanent=providerErrorPermanent(response.status);const message=`Email provider returned ${response.status}${raw?`: ${raw.slice(0,500)}`:''}`;await recordFailure(db,item,attempt,message,response.status,permanent);return {status:permanent?'dead_letter':'failed',error:message}}
    await db.from('email_outbox').update({status:'sent',attempts:attempt,sent_at:now,last_error:null,provider_message_id:providerId,next_attempt_at:null,updated_at:now}).eq('id',item.id);
    await db.from('email_delivery_attempts').update({status:'sent',provider_message_id:providerId}).eq('outbox_id',item.id).eq('attempt_number',attempt);
    return {status:'sent',providerId};
  }catch(error){const message=error instanceof Error?error.message:'Email delivery failed';await recordFailure(db,item,attempt,message,null,false);return {status:'failed',error:message}}
}

async function recordFailure(db:SupabaseClient,item:OutboxRow,attempt:number,message:string,httpStatus:number|null,permanent:boolean){
  const exhausted=attempt>=Math.max(1,item.max_attempts||5);const dead=permanent||exhausted;const next=dead?null:new Date(Date.now()+backoffMinutes(attempt)*60_000).toISOString();
  await db.from('email_outbox').update({status:dead?'dead_letter':'retrying',attempts:attempt,last_error:message,permanent_failure:permanent,dead_letter_at:dead?new Date().toISOString():null,next_attempt_at:next,updated_at:new Date().toISOString()}).eq('id',item.id);
  await db.from('email_delivery_attempts').update({status:permanent?'permanent_failure':'failed',error_message:message,http_status:httpStatus}).eq('outbox_id',item.id).eq('attempt_number',attempt);
}

export async function processEmailQueue(db:SupabaseClient,limit=25){
  const now=new Date().toISOString();const {data}=await db.from('email_outbox').select('*').in('status',['queued','retrying','failed']).or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`).order('created_at',{ascending:true}).limit(limit);
  const results=[];for(const item of (data||[]) as OutboxRow[])results.push({id:item.id,...await deliverOutboxItem(db,item)});return results;
}

export async function notifyUser(db:SupabaseClient,input:NotifyInput){
  const eventKey=input.eventKey||input.type;const dedupe=input.dedupeKey||null;
  const notification={user_id:input.userId,project_id:input.projectId||null,application_id:input.applicationId||null,type:input.type,title:input.title,body:input.body,action_url:input.actionUrl||null,event_key:eventKey,dedupe_key:dedupe,channel:input.email?'email_and_in_app':'in_app'};
  const {error}=await db.from('notifications').insert(notification);if(error&&error.code!=='23505')throw error;
  if(!input.email)return;
  const outbox=await enqueueEmail(db,{userId:input.userId,to:input.email,templateKey:input.templateKey||input.type,subject:input.subject||input.title,body:input.body,actionUrl:input.actionUrl,eventKey,dedupeKey:dedupe?`${input.userId}:${dedupe}`:null,payload:input.payload});
  if(outbox)await deliverOutboxItem(db,outbox);
}

export async function notifyAdmins(db:SupabaseClient,input:Omit<NotifyInput,'userId'|'email'>){
  const {data}=await db.auth.admin.listUsers({page:1,perPage:1000});const admins=data.users.filter(user=>user.app_metadata?.role==='admin');
  for(const admin of admins)await notifyUser(db,{...input,userId:admin.id,email:admin.email||null,dedupeKey:input.dedupeKey?`${admin.id}:${input.dedupeKey}`:null});
}
