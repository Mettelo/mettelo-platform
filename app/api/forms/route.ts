import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {deliverOutboxItem,enqueueEmail,notifyAdmins,notifyUser,serviceDb} from '@/lib/project-flow';

const allowedTypes=new Set(['contact','partnership','project_application','feedback']);
const fieldLimits:Record<string,number>={name:140,full_name:140,email:254,role:160,project:180,profile:400,organisation:180,organization:180,subject:180,partnership_type:120,area:120,category:120,message:3000,details:3000,feedback:3000,contribution:2000,motivation:2500,experience:2500,summary:600,description:2000,notes:3000};
const longTextFields=new Set(['message','details','feedback','contribution','motivation','experience','summary','description','notes']);

function hasPathologicalToken(value:string){return value.split(/\s+/).some(token=>token.length>90&&/[A-Za-z0-9]{90}/.test(token))}
function sanitizePayload(input:Record<string,unknown>){
  const clean:Record<string,unknown>={};
  for(const [key,raw] of Object.entries(input)){
    if(typeof raw!=='string'){clean[key]=raw;continue}
    const value=raw.replace(/\u0000/g,'').trim();
    const limit=fieldLimits[key]??(longTextFields.has(key)?3000:500);
    if(value.length>limit)throw new Error(`${key.replace(/_/g,' ')} is too long. Please shorten it to ${limit} characters or fewer.`);
    if(longTextFields.has(key)&&hasPathologicalToken(value))throw new Error(`${key.replace(/_/g,' ')} contains an unusually long unbroken string. Please paste readable text with normal spacing.`);
    clean[key]=value;
  }
  return clean;
}
function value(data:Record<string,unknown>,key:string){return String(data[key]??'').trim()}
function validEmail(email:string){return /^\S+@\S+\.\S+$/.test(email)}
function validatePublicForm(formType:string,data:Record<string,unknown>){
  if(formType==='contact'){
    if(!value(data,'name')||!validEmail(value(data,'email'))||!value(data,'topic')||!value(data,'subject')||value(data,'message').length<10)return 'Add your name, valid email, topic, subject and a short message.';
    if(value(data,'consent')!=='yes')return 'Confirm that Mettelo can use this information to respond to your enquiry.';
  }
  if(formType==='partnership'){
    if(!value(data,'organisation')||!value(data,'name')||!validEmail(value(data,'email'))||!value(data,'role')||!value(data,'partnershipType')||value(data,'objective').length<10||value(data,'contribution').length<10)return 'Complete the organisation, contact, partnership type, objective and contribution fields.';
    if(value(data,'consent')!=='yes')return 'Confirm that Mettelo can use this information to assess and respond to the enquiry.';
  }
  if(formType==='feedback'){
    const email=value(data,'email');if(email&&!validEmail(email))return 'Enter a valid email address or leave the email field blank.';
    if(!value(data,'area')||value(data,'message').length<10)return 'Choose an area and add enough detail for the team to understand your feedback.';
  }
  return null;
}

export async function POST(request:Request){
  try{
    const {formType,data}=await request.json();
    if(!allowedTypes.has(formType) || !data || typeof data!=='object'){
      return NextResponse.json({error:'Invalid form submission.'},{status:400});
    }
    let safeData:Record<string,unknown>;
    try{safeData=sanitizePayload(data as Record<string,unknown>)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Please check the text you entered.'},{status:422})}

    if(formType==='project_application'){
      const auth=await createServerSupabaseClient();
      const {data:{user}}=await auth.auth.getUser();
      if(!user)return NextResponse.json({error:'Sign in first so this project interest can be tracked in My Mettelo.'},{status:401});
      const projectTitle=String(safeData.project||'').trim();
      const requestedRole=String(safeData.role||'').trim();
      const statement=String(safeData.contribution||'').trim();
      const portfolio=String(safeData.profile||'').trim();
      if(!projectTitle||!requestedRole||statement.length<20)return NextResponse.json({error:'Choose a project, contribution area and describe how you can contribute.'},{status:400});
      const privilegedDb=serviceDb();
      const db=privilegedDb||auth;
      const {data:project,error:projectError}=await db.from('projects').select('id,title,status').eq('title',projectTitle).eq('status','pilot').maybeSingle();
      if(projectError||!project)return NextResponse.json({error:'This pilot brief is no longer accepting interest.'},{status:409});
      const {data:existing}=await db.from('project_applications').select('id,status').eq('project_id',project.id).eq('user_id',user.id).eq('application_kind','interest').neq('status','withdrawn').maybeSingle();
      if(existing)return NextResponse.json({error:'You already registered interest in this project. Track it in My Mettelo.'},{status:409});
      const {data:created,error}=await db.from('project_applications').insert({project_id:project.id,project_role_id:null,user_id:user.id,portfolio_url:portfolio||null,contribution_statement:statement,availability:null,status:'submitted',application_kind:'interest',requested_role:requestedRole}).select('id,status').single();
      if(error)throw error;
      const name=String(user.user_metadata?.full_name||user.email?.split('@')[0]||'A member');
      if(privilegedDb){
        await Promise.all([
          notifyUser(privilegedDb,{userId:user.id,email:user.email,projectId:project.id,applicationId:created.id,type:'project_interest_submitted',eventKey:'project_interest_submitted',title:'Project interest received',body:`We received your interest in ${project.title} — ${requestedRole}. Track it from My Mettelo.`,actionUrl:'/member/applications',subject:`Project interest received — ${project.title}`,dedupeKey:`project-interest:${created.id}`}),
          notifyAdmins(privilegedDb,{projectId:project.id,applicationId:created.id,type:'new_project_interest',eventKey:'project_interest_submitted',title:`New project interest — ${project.title}`,body:`${name} registered interest in ${requestedRole}.`,actionUrl:'/admin/project-operations',subject:`New project interest — ${project.title}`,dedupeKey:`admin-project-interest:${created.id}`})
        ]);
      }
      return NextResponse.json({ok:true,tracked:true,application:created});
    }

    const invalid=validatePublicForm(formType,safeData);if(invalid)return NextResponse.json({error:invalid},{status:400});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url || !serviceKey){
      return NextResponse.json({error:'Submissions are temporarily unavailable. Please contact Mettelo through the Community page.'},{status:503});
    }
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:submission,error}=await supabase.from('form_submissions').insert({form_type:formType,payload:safeData,status:'new'}).select('id').single();
    if(error){
      console.error('form submission error',error);
      return NextResponse.json({error:'We could not save your submission. Please try again.'},{status:500});
    }
    const name=String(safeData.name||safeData.full_name||'A visitor').trim().slice(0,140);
    const email=String(safeData.email||'').trim().toLowerCase();
    const isPartnership=formType==='partnership';
    await notifyAdmins(supabase,{type:isPartnership?'admin_intake_received':'contact_received',eventKey:isPartnership?'admin_intake_received':'contact_received',title:isPartnership?'New partnership / organisation intake':`New ${formType} submission`,body:`${name||'A visitor'} submitted the ${formType} form.`,actionUrl:'/admin/intake',subject:isPartnership?'New Mettelo partnership intake':`New Mettelo ${formType} submission`,dedupeKey:`form:${submission.id}:admin`});
    if(isPartnership&&validEmail(email)){
      const outbox=await enqueueEmail(supabase,{to:email,templateKey:'organisation_intake_received',eventKey:'organisation_intake_received',subject:'We received your Mettelo partnership enquiry',body:'Thank you for contacting Mettelo. Your organisation or partnership enquiry has been received and will be reviewed by the team.',actionUrl:'/partnership',dedupeKey:`form:${submission.id}:receipt`});
      if(outbox)await deliverOutboxItem(supabase,outbox);
    }
    return NextResponse.json({ok:true});
  }catch(error){
    console.error('form request error',error);
    return NextResponse.json({error:'Invalid request.'},{status:400});
  }
}
