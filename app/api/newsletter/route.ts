import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {deliverOutboxItem,enqueueEmail} from '@/lib/notifications';

const topics=['projects','events','opportunities','insights'] as const;
export async function POST(request:Request){
  const contentType=request.headers.get('content-type')||'';let email='';let preferences:Record<string,boolean>={projects:true,events:true,opportunities:true,insights:true};
  try{if(contentType.includes('application/json')){const body=await request.json();email=String(body.email||'').trim().toLowerCase();if(body.preferences&&typeof body.preferences==='object')preferences=Object.fromEntries(topics.map(topic=>[topic,Boolean(body.preferences[topic])]))}else{const form=await request.formData();email=String(form.get('email')||'').trim().toLowerCase();preferences=Object.fromEntries(topics.map(topic=>[topic,form.get(topic)==='on']))}}catch{}
  if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:'Enter a valid email address.'},{status:400});if(!Object.values(preferences).some(Boolean))return NextResponse.json({error:'Choose at least one type of Mettelo update.'},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:'Newsletter signup is temporarily unavailable.'},{status:503});const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('newsletter_subscribers').upsert({email,status:'active',marketing_preferences:preferences,unsubscribed_at:null,updated_at:new Date().toISOString()},{onConflict:'email'}).select('email,unsubscribe_token').single();if(error)return NextResponse.json({error:'We could not save your email. Please try again.'},{status:500});
  const manageUrl=`/newsletter/preferences?token=${encodeURIComponent(data.unsubscribe_token)}`;const selected=topics.filter(topic=>preferences[topic]).map(topic=>topic[0].toUpperCase()+topic.slice(1)).join(', ');const outbox=await enqueueEmail(db,{to:email,templateKey:'newsletter_subscribed',eventKey:'newsletter_subscribed',subject:'Your Mettelo newsletter preferences are saved',body:`You are subscribed to Mettelo marketing updates for: ${selected}. These choices do not affect transactional account, project, recruitment or security messages.`,actionUrl:manageUrl,dedupeKey:`newsletter:${email}:${Date.now()}`});if(outbox)await deliverOutboxItem(db,outbox);
  if(contentType.includes('application/json'))return NextResponse.json({ok:true,preferences_url:manageUrl});return NextResponse.redirect(new URL('/newsletter?subscribed=1',request.url),303);
}
