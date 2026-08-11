import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {careerMessage,sendCareerEmail} from '@/lib/career-notifications';

const STAGES=new Set(['in_review','shortlisted','interview','offer','hired','rejected']);
export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career service not configured.'},{status:503});
    const body=await request.json();const id=String(body.id||''),status=String(body.status||''),note=String(body.note||'').trim().slice(0,2000),interviewAt=body.interview_at?new Date(String(body.interview_at)).toISOString():null;
    if(!id||!STAGES.has(status))return NextResponse.json({error:'Invalid recruitment stage.'},{status:400});
    const {data:application}=await db.from('career_applications').select('id,user_id,email,full_name,status,role_id,career_roles(title)').eq('id',id).maybeSingle();if(!application)return NextResponse.json({error:'Application not found.'},{status:404});
    const roleTitle=(application.career_roles as unknown as {title:string}|null)?.title||'Mettelo role';
    const patch:Record<string,unknown>={status,updated_at:new Date().toISOString(),admin_notes:note||null};if(status==='interview')patch.interview_at=interviewAt;if(status==='interview')patch.interview_details=note||null;if(status==='offer')patch.offer_details=note||null;
    const {error}=await db.from('career_applications').update(patch).eq('id',id);if(error)throw error;
    await db.from('career_application_events').insert({application_id:id,from_status:application.status,to_status:status,note:note||null,actor_user_id:user.id});
    const message=careerMessage(status,roleTitle,{interviewAt,interviewDetails:status==='interview'?note:null,offerDetails:status==='offer'?note:null});
    const sent=await sendCareerEmail(db,{email:application.email,subject:message.subject,body:message.body,templateKey:`career_${status}`,userId:application.user_id||null,actionUrl:application.user_id?'/member/applications#careers':'/careers',name:application.full_name,roleTitle,payload:{career_application_id:id,interview_at:interviewAt?new Date(interviewAt).toLocaleString('en-GB'):null,stage_note:note||null}});
    return NextResponse.json({ok:true,email_sent:sent.sent});
  }catch(error){console.error('career stage update error',error);return NextResponse.json({error:'Unable to update candidate stage.'},{status:500});}
}
