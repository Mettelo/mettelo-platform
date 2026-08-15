import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb,notifyAdmins} from '@/lib/project-flow';
import {careerMessageForDb,sendCareerEmail} from '@/lib/career-notifications';

const DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function clean(value:FormDataEntryValue|null,max:number){return String(value||'').trim().slice(0,max);}
function validUrl(value:string){if(!value)return true;try{const url=new URL(value);return ['http:','https:'].includes(url.protocol);}catch{return false;}}

export async function POST(request:Request){
  try{
    const db=serviceDb();if(!db)return NextResponse.json({error:'Career application service is not configured.'},{status:503});
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
    const form=await request.formData();const roleId=clean(form.get('role_id'),80),fullName=clean(form.get('full_name'),140),email=clean(form.get('email'),254).toLowerCase(),phone=clean(form.get('phone'),50),location=clean(form.get('location'),160),linkedin=clean(form.get('linkedin_url'),800),portfolio=clean(form.get('portfolio_url'),800),workAuth=clean(form.get('work_authorisation'),300),motivation=clean(form.get('motivation'),3000),experience=clean(form.get('relevant_experience'),4000);const file=form.get('cv');
    if(!roleId||!fullName||!/^\S+@\S+\.\S+$/.test(email)||motivation.length<80||experience.length<100||!(file instanceof File))return NextResponse.json({error:'Complete the required application fields.'},{status:400});
    if(!validUrl(linkedin)||!validUrl(portfolio))return NextResponse.json({error:'LinkedIn and portfolio links must be valid URLs.'},{status:400});
    if(!['application/pdf',DOCX].includes(file.type)||file.size>5*1024*1024)return NextResponse.json({error:'CV must be PDF or DOCX and no larger than 5MB.'},{status:400});
    const {data:role}=await db.from('career_roles').select('id,title,status,closes_at').eq('id',roleId).maybeSingle();if(!role||role.status!=='published'||(role.closes_at&&new Date(role.closes_at)<=new Date()))return NextResponse.json({error:'This role is not accepting applications.'},{status:409});
    const {data:existing}=await db.from('career_applications').select('id').eq('role_id',roleId).ilike('email',email).neq('status','withdrawn').maybeSingle();if(existing)return NextResponse.json({error:'An application for this role already exists for this email address.'},{status:409});
    const ext=file.type==='application/pdf'?'pdf':'docx';const path=`${roleId}/${crypto.randomUUID()}.${ext}`;const bytes=Buffer.from(await file.arrayBuffer());const upload=await db.storage.from('career-cvs').upload(path,bytes,{contentType:file.type,upsert:false});if(upload.error)return NextResponse.json({error:'Unable to store the CV securely.'},{status:500});
    const {data:application,error}=await db.from('career_applications').insert({role_id:roleId,user_id:user?.id||null,full_name:fullName,email,phone:phone||null,location:location||null,linkedin_url:linkedin||null,portfolio_url:portfolio||null,cv_path:path,work_authorisation:workAuth||null,motivation,relevant_experience:experience,status:'submitted'}).select('id').single();if(error){await db.storage.from('career-cvs').remove([path]);throw error;}
    await db.from('career_application_events').insert({application_id:application.id,from_status:null,to_status:'submitted',note:'Application submitted.',actor_user_id:user?.id||null});
    const message=await careerMessageForDb(db,'submitted',role.title,{recipientName:fullName});const emailResult=await sendCareerEmail(db,{email,subject:message.subject,body:message.body,templateKey:'career_application_submitted',userId:user?.id||null,actionUrl:user?'/member/applications#careers':'/careers',name:fullName,roleTitle:role.title,payload:{career_application_id:application.id}});
    await db.from('communication_records').insert({recipient_user_id:user?.id||null,recipient_email:email,template_key:'career_submitted',journey:'Careers',related_type:'career_application',related_id:application.id,subject:message.subject,body:message.body,send_mode:message.template?.send_mode||'automatic',status:emailResult.sent?'sent':'queued',outbox_id:emailResult.outboxId,actor_user_id:user?.id||null,sent_at:emailResult.sent?new Date().toISOString():null});
    await notifyAdmins(db,{type:'career_application_received',title:'New Mettelo career application',body:`${fullName} applied for ${role.title}.`,actionUrl:'/admin/careers',subject:`New career application: ${role.title}`,payload:{career_application_id:application.id}});
    return NextResponse.json({ok:true,id:application.id,email_sent:emailResult.sent},{status:201});
  }catch(error){console.error('career application error',error);return NextResponse.json({error:'Unable to submit the application right now.'},{status:500});}
}
