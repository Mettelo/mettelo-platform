import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {careerMessageForDb,sendCareerEmail} from '@/lib/career-notifications';

const WITHDRAWABLE=new Set(['submitted','in_review','shortlisted','interview']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career service is not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||'').trim();const action=String(body.action||'').trim();if(!id||action!=='withdraw')return NextResponse.json({error:'Invalid application request.'},{status:400});
    const {data:application}=await db.from('career_applications').select('id,user_id,email,full_name,status,career_roles(title)').eq('id',id).eq('user_id',user.id).maybeSingle();if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    if(!WITHDRAWABLE.has(application.status))return NextResponse.json({error:'This application can no longer be withdrawn online. Contact Mettelo if you need help.'},{status:409});
    const now=new Date().toISOString();const {error}=await db.from('career_applications').update({status:'withdrawn',withdrawn_at:now,updated_at:now}).eq('id',id).eq('user_id',user.id);if(error)throw error;
    await db.from('career_application_events').insert({application_id:id,from_status:application.status,to_status:'withdrawn',note:'Candidate withdrew application.',actor_user_id:user.id});
    const roleTitle=(application.career_roles as unknown as {title:string}|null)?.title||'Mettelo role';const message=await careerMessageForDb(db,'withdrawn',roleTitle,{recipientName:application.full_name});const sent=await sendCareerEmail(db,{email:application.email,subject:message.subject,body:message.body,templateKey:'career_withdrawn',userId:user.id,actionUrl:'/careers',name:application.full_name,roleTitle,payload:{career_application_id:id}});
    await db.from('communication_records').insert({recipient_user_id:user.id,recipient_email:application.email,template_key:'career_withdrawn',journey:'Careers',related_type:'career_application',related_id:id,subject:message.subject,body:message.body,send_mode:message.template?.send_mode||'automatic',status:sent.sent?'sent':'queued',outbox_id:sent.outboxId,actor_user_id:user.id,sent_at:sent.sent?now:null});
    await db.from('communication_audit_log').insert({actor_user_id:user.id,action:'career_application_withdrawn',entity_type:'career_application',entity_id:id,metadata:{previous_status:application.status,email_sent:sent.sent}});
    return NextResponse.json({ok:true,status:'withdrawn',email_sent:sent.sent});
  }catch(error){console.error('career withdrawal error',error);return NextResponse.json({error:'Unable to withdraw the application right now.'},{status:500});}
}
