import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {deliverOutboxItem,enqueueEmail,notifyAdmins,notifyUser,serviceDb} from '@/lib/project-flow';

const allowedTypes=new Set(['contact','partnership','project_application','feedback']);

export async function POST(request:Request){
  try{
    const {formType,data}=await request.json();
    if(!allowedTypes.has(formType) || !data || typeof data!=='object'){
      return NextResponse.json({error:'Invalid form submission.'},{status:400});
    }

    if(formType==='project_application'){
      const auth=await createServerSupabaseClient();
      const {data:{user}}=await auth.auth.getUser();
      if(!user)return NextResponse.json({error:'Sign in first so this project interest can be tracked in My Mettelo.'},{status:401});
      const projectTitle=String(data.project||'').trim();
      const requestedRole=String(data.role||'').trim().slice(0,160);
      const statement=String(data.contribution||'').trim().slice(0,2000);
      const portfolio=String(data.profile||'').trim().slice(0,400);
      if(!projectTitle||!requestedRole||statement.length<20)return NextResponse.json({error:'Choose a project, contribution area and describe how you can contribute.'},{status:400});
      const db=serviceDb();if(!db)return NextResponse.json({error:'Project request service is not configured.'},{status:503});
      const {data:project,error:projectError}=await db.from('projects').select('id,title,status').eq('title',projectTitle).eq('status','pilot').maybeSingle();
      if(projectError||!project)return NextResponse.json({error:'This pilot brief is no longer accepting interest.'},{status:409});
      const {data:existing}=await db.from('project_applications').select('id,status').eq('project_id',project.id).eq('user_id',user.id).eq('application_kind','interest').neq('status','withdrawn').maybeSingle();
      if(existing)return NextResponse.json({error:'You already registered interest in this project. Track it in My Mettelo.'},{status:409});
      const {data:created,error}=await db.from('project_applications').insert({project_id:project.id,project_role_id:null,user_id:user.id,portfolio_url:portfolio||null,contribution_statement:statement,availability:null,status:'submitted',application_kind:'interest',requested_role:requestedRole}).select('id,status').single();
      if(error)throw error;
      const name=String(user.user_metadata?.full_name||user.email?.split('@')[0]||'A member');
      await Promise.all([
        notifyUser(db,{userId:user.id,email:user.email,projectId:project.id,applicationId:created.id,type:'project_interest_submitted',eventKey:'project_interest_submitted',title:'Project interest received',body:`We received your interest in ${project.title} — ${requestedRole}. Track it from My Mettelo.`,actionUrl:'/member/applications',subject:`Project interest received — ${project.title}`,dedupeKey:`project-interest:${created.id}`}),
        notifyAdmins(db,{projectId:project.id,applicationId:created.id,type:'new_project_interest',eventKey:'project_interest_submitted',title:`New project interest — ${project.title}`,body:`${name} registered interest in ${requestedRole}.`,actionUrl:'/admin/project-operations',subject:`New project interest — ${project.title}`,dedupeKey:`admin-project-interest:${created.id}`})
      ]);
      return NextResponse.json({ok:true,tracked:true,application:created});
    }

    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url || !serviceKey){
      return NextResponse.json({error:'Submissions are temporarily unavailable. Please contact Mettelo through the Community page.'},{status:503});
    }
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:submission,error}=await supabase.from('form_submissions').insert({form_type:formType,payload:data,status:'new'}).select('id').single();
    if(error){
      console.error('form submission error',error);
      return NextResponse.json({error:'We could not save your submission. Please try again.'},{status:500});
    }
    const name=String((data as Record<string,unknown>).name||(data as Record<string,unknown>).full_name||'A visitor').trim().slice(0,140);
    const email=String((data as Record<string,unknown>).email||'').trim().toLowerCase();
    const isPartnership=formType==='partnership';
    await notifyAdmins(supabase,{type:isPartnership?'admin_intake_received':'contact_received',eventKey:isPartnership?'admin_intake_received':'contact_received',title:isPartnership?'New partnership / organisation intake':`New ${formType} submission`,body:`${name||'A visitor'} submitted the ${formType} form.`,actionUrl:'/admin/intake',subject:isPartnership?'New Mettelo partnership intake':`New Mettelo ${formType} submission`,dedupeKey:`form:${submission.id}:admin`});
    if(isPartnership&&/^\S+@\S+\.\S+$/.test(email)){
      const outbox=await enqueueEmail(supabase,{to:email,templateKey:'organisation_intake_received',eventKey:'organisation_intake_received',subject:'We received your Mettelo partnership enquiry',body:'Thank you for contacting Mettelo. Your organisation or partnership enquiry has been received and will be reviewed by the team.',actionUrl:'/partnership',dedupeKey:`form:${submission.id}:receipt`});
      if(outbox)await deliverOutboxItem(supabase,outbox);
    }
    return NextResponse.json({ok:true});
  }catch(error){
    console.error('form request error',error);
    return NextResponse.json({error:'Invalid request.'},{status:400});
  }
}
