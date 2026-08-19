import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {deliverOutboxItem,enqueueEmail,notifyAdmins} from '@/lib/project-flow';

const allowedTypes=new Set(['contact','partnership','feedback']);
const contactTopics=new Set(['membership_account','project_application','active_project','events_speaking','media','jobs_opportunities','spotlight_awards','technical_issue','community_moderation','general']);
const organisationTypes=new Set(['employer','startup','nonprofit','public_sector','university_research','professional_community','talent_recruitment','other']);
const partnershipTypes=new Set(['labs_project','talent','event','research','open_source','sponsorship','community','other']);
const partnershipTimeframes=new Set(['asap','within_1_month','1_3_months','3_6_months','6_plus_months']);
const partnershipScales=new Set(['small_pilot','single_activity','multi_week_project','ongoing','unknown']);
const feedbackKinds=new Set(['bug','confusing','idea','content_data','accessibility','other']);
const feedbackAreas=new Set(['navigation_mobile','membership_account','projects_labs','opportunities','events','community','people_profiles','proof','accessibility','other']);
const feedbackImpacts=new Set(['blocked','partial','not_blocked']);
const formVersions:Record<string,number>={contact:2,partnership:2,feedback:2};
const fieldLimits:Record<string,number>={name:140,full_name:140,email:254,role:160,project:180,profile:400,organisation:180,organization:180,country:120,website:400,topic:120,area:120,kind:80,impact:80,context:300,partnershipType:120,organisationType:120,timeframe:80,scale:80,decisionOwner:180,message:3000,details:3000,feedback:3000,contribution:2000,objective:2500,motivation:2500,experience:2500,summary:600,description:2000,notes:3000};
const longTextFields=new Set(['message','details','feedback','contribution','objective','motivation','experience','summary','description','notes']);

function hasPathologicalToken(value:string){return value.split(/\s+/).some(token=>token.length>90&&/[A-Za-z0-9]{90}/.test(token))}
function sanitizePayload(input:Record<string,unknown>){const clean:Record<string,unknown>={};for(const [key,raw] of Object.entries(input)){if(typeof raw!=='string'){clean[key]=raw;continue}const value=raw.replace(/\u0000/g,'').trim();const limit=fieldLimits[key]??(longTextFields.has(key)?3000:500);if(value.length>limit)throw new Error(`${key.replace(/_/g,' ')} is too long. Please shorten it to ${limit} characters or fewer.`);if(longTextFields.has(key)&&hasPathologicalToken(value))throw new Error(`${key.replace(/_/g,' ')} contains an unusually long unbroken string. Please paste readable text with normal spacing.`);clean[key]=value;}return clean;}
function value(data:Record<string,unknown>,key:string){return String(data[key]??'').trim()}
function validEmail(email:string){return /^\S+@\S+\.\S+$/.test(email)}
function inSet(data:Record<string,unknown>,key:string,set:Set<string>){return set.has(value(data,key))}
function validatePublicForm(formType:string,data:Record<string,unknown>){
  if(formType==='contact'){
    if(!value(data,'name')||!validEmail(value(data,'email'))||!inSet(data,'topic',contactTopics)||value(data,'message').length<10)return 'Add your name, valid email, a valid topic and a short message.';
    if(value(data,'consent')!=='yes')return 'Confirm that Mettelo can use this information to respond to your enquiry.';
  }
  if(formType==='partnership'){
    if(!value(data,'organisation')||!value(data,'country')||!value(data,'name')||!validEmail(value(data,'email'))||!value(data,'role')||!inSet(data,'organisationType',organisationTypes)||!inSet(data,'partnershipType',partnershipTypes)||!inSet(data,'timeframe',partnershipTimeframes)||!inSet(data,'scale',partnershipScales)||value(data,'objective').length<10||value(data,'contribution').length<10)return 'Complete the organisation, country, contact, partnership type, timeframe, scale, objective and contribution fields.';
    if(value(data,'consent')!=='yes')return 'Confirm that Mettelo can use this information to assess and respond to the enquiry.';
  }
  if(formType==='feedback'){
    const email=value(data,'email');if(email&&!validEmail(email))return 'Enter a valid email address or leave the email field blank.';
    if(!inSet(data,'kind',feedbackKinds)||!inSet(data,'area',feedbackAreas)||!inSet(data,'impact',feedbackImpacts)||value(data,'message').length<10)return 'Choose a feedback type, area and impact, then add enough detail for the team to understand what happened.';
  }
  return null;
}

export async function POST(request:Request){
  try{
    const {formType,data}=await request.json();
    if(!allowedTypes.has(formType)||!data||typeof data!=='object'){console.info('[public-form] validation rejected',{reason:'invalid_form_type'});return NextResponse.json({error:'Invalid form submission.'},{status:400});}
    let safeData:Record<string,unknown>;try{safeData=sanitizePayload(data as Record<string,unknown>)}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Please check the text you entered.'},{status:422})}
    const invalid=validatePublicForm(formType,safeData);if(invalid){console.info('[public-form] validation rejected',{formType});return NextResponse.json({error:invalid},{status:400});}
    safeData={...safeData,schema_version:formVersions[formType]||1};
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!serviceKey){console.error('[public-form] configuration missing',{hasUrl:Boolean(url),hasServiceKey:Boolean(serviceKey)});return NextResponse.json({error:'Submissions are temporarily unavailable. Please contact Mettelo through the Community page.'},{status:503});}
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:submission,error}=await supabase.from('form_submissions').insert({form_type:formType,payload:safeData,status:'new'}).select('id').single();
    if(error){console.error('form submission error',error);return NextResponse.json({error:'We could not save your submission. Please try again.'},{status:500});}
    const name=String(safeData.name||safeData.full_name||'A visitor').trim().slice(0,140);const email=String(safeData.email||'').trim().toLowerCase();const isPartnership=formType==='partnership';
    await notifyAdmins(supabase,{type:isPartnership?'admin_intake_received':'contact_received',eventKey:isPartnership?'admin_intake_received':'contact_received',title:isPartnership?'New partnership / organisation intake':`New ${formType} submission`,body:`${name||'A visitor'} submitted the ${formType} form.`,actionUrl:'/admin/intake',subject:isPartnership?'New Mettelo partnership intake':`New Mettelo ${formType} submission`,dedupeKey:`form:${submission.id}:admin`});
    if(isPartnership&&validEmail(email)){const outbox=await enqueueEmail(supabase,{to:email,templateKey:'organisation_intake_received',eventKey:'organisation_intake_received',subject:'We received your Mettelo partnership enquiry',body:'Thank you for contacting Mettelo. Your organisation or partnership enquiry has been received and will be reviewed by the team.',actionUrl:'/partnership',dedupeKey:`form:${submission.id}:receipt`});if(outbox)await deliverOutboxItem(supabase,outbox);}
    console.info('[public-form] submission accepted',{formType,schemaVersion:formVersions[formType],adminNotification:true});return NextResponse.json({ok:true});
  }catch(error){console.error('form request error',error);return NextResponse.json({error:'Invalid request.'},{status:400});}
}
