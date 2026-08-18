import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {deliverOutboxItem,enqueueEmail} from '@/lib/notifications';

const topics=['projects','events','opportunities','insights'] as const;
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function databaseFailure(error:{code?:string;message?:string;details?:string;hint?:string}){
  console.error('[newsletter] database upsert failed',{
    code:error.code||'unknown',
    message:error.message||'Unknown database error',
    details:error.details||null,
    hint:error.hint||null
  });
  if(['42703','PGRST204'].includes(error.code||''))return NextResponse.json({error:'Newsletter signup is temporarily unavailable while we update the service.',code:'NEWSLETTER_SCHEMA_NOT_READY'},{status:503});
  if(error.code==='42501')return NextResponse.json({error:'Newsletter signup is temporarily unavailable because database access is not configured.',code:'NEWSLETTER_DATABASE_ACCESS'},{status:503});
  return NextResponse.json({error:'We could not save your email. Please try again.',code:'NEWSLETTER_DATABASE_WRITE'},{status:500});
}

export async function POST(request:Request){
  const contentType=request.headers.get('content-type')||'';let email='';let preferences:Record<string,boolean>={projects:true,events:true,opportunities:true,insights:true};
  try{
    if(contentType.includes('application/json')){
      const body=await request.json();
      email=String(body.email||'').trim().toLowerCase();
      if(body.preferences&&typeof body.preferences==='object')preferences=Object.fromEntries(topics.map(topic=>[topic,Boolean(body.preferences[topic])]));
    }else{
      const form=await request.formData();
      email=String(form.get('email')||'').trim().toLowerCase();
      preferences=Object.fromEntries(topics.map(topic=>[topic,form.get(topic)==='on']));
    }
  }catch(error){
    console.info('[newsletter] payload rejected',{reason:'unreadable_payload',contentType,error:error instanceof Error?error.message:'unknown'});
    return NextResponse.json({error:'We could not read this subscription request.'},{status:400});
  }

  const enabledTopics=topics.filter(topic=>preferences[topic]);
  console.info('[newsletter] submission received',{contentType:contentType.split(';')[0]||'unknown',hasEmail:Boolean(email),emailLength:email.length,topicCount:enabledTopics.length});
  if(!emailPattern.test(email)){console.info('[newsletter] validation rejected',{reason:'invalid_email'});return NextResponse.json({error:'Enter a valid email address.'},{status:400});}
  if(!enabledTopics.length){console.info('[newsletter] validation rejected',{reason:'no_preferences'});return NextResponse.json({error:'Choose at least one type of Mettelo update.'},{status:400});}

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){console.error('[newsletter] configuration missing',{hasUrl:Boolean(url),hasServiceKey:Boolean(key)});return NextResponse.json({error:'Newsletter signup is temporarily unavailable.',code:'NEWSLETTER_CONFIGURATION'},{status:503});}
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('newsletter_subscribers').upsert({email,status:'active',marketing_preferences:preferences,unsubscribed_at:null,updated_at:new Date().toISOString()},{onConflict:'email'}).select('email,unsubscribe_token').single();
  if(error)return databaseFailure(error);
  if(!data?.unsubscribe_token){console.error('[newsletter] database response incomplete',{hasEmail:Boolean(data?.email),hasPreferencesToken:false});return NextResponse.json({error:'Newsletter signup is temporarily unavailable while we update the service.',code:'NEWSLETTER_SCHEMA_NOT_READY'},{status:503});}

  const manageUrl=`/newsletter/preferences?token=${encodeURIComponent(data.unsubscribe_token)}`;
  const selected=enabledTopics.map(topic=>topic[0].toUpperCase()+topic.slice(1)).join(', ');
  let confirmationQueued=false;
  try{
    const outbox=await enqueueEmail(db,{to:email,templateKey:'newsletter_subscribed',eventKey:'newsletter_subscribed',subject:'Your Mettelo newsletter preferences are saved',body:`You are subscribed to Mettelo marketing updates for: ${selected}. These choices do not affect transactional account, project, recruitment or security messages.`,actionUrl:manageUrl,dedupeKey:`newsletter:${email}:${Date.now()}`});
    if(outbox){confirmationQueued=true;await deliverOutboxItem(db,outbox);}
  }catch(error){
    console.error('[newsletter] confirmation enqueue failed',{message:error instanceof Error?error.message:'Unknown notification error'});
  }
  console.info('[newsletter] subscription accepted',{topicCount:enabledTopics.length,confirmationQueued});
  if(contentType.includes('application/json'))return NextResponse.json({ok:true,preferences_url:manageUrl,confirmation_email_queued:confirmationQueued});
  return NextResponse.redirect(new URL('/newsletter?subscribed=1',request.url),303);
}
