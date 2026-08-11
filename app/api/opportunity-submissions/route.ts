import {NextResponse} from 'next/server';
import {serviceDb,notifyAdmins} from '@/lib/project-flow';

const DATA_AI_TERMS=['data','analytics','analyst','business intelligence','power bi','tableau','looker','sql','python','statistics','statistician','data science','scientist','machine learning','ml ','artificial intelligence',' ai ','data engineer','analytics engineer','data governance','data product','research'];
const ALLOWED_TYPES=new Set(['job','internship','graduate','apprenticeship','fellowship','volunteer']);
const ALLOWED_SCOPES=new Set(['global','country','region','unknown']);
const ALLOWED_SPONSORSHIP=new Set(['available','not_available','case_by_case','unknown']);
const ALLOWED_WORK=new Set(['remote','hybrid','onsite','unknown']);
function clean(value:unknown,max=5000){return String(value??'').trim().slice(0,max);}
function validUrl(value:string){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&Boolean(url.hostname);}catch{return false;}}
function slugify(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,80);}
async function sendConfirmation(db:NonNullable<ReturnType<typeof serviceDb>>,email:string,name:string,title:string){
  const subject=`Mettelo received your opportunity — ${title}`;const body=`Hi ${name}, we received your Data & AI opportunity submission for “${title}”. Mettelo will review the role before publication. No listing is published automatically.`;
  const {data:outbox}=await db.from('email_outbox').insert({user_id:null,recipient_email:email,template_key:'employer_opportunity_received',subject,payload:{body}}).select('id').single();
  const apiKey=process.env.RESEND_API_KEY;const from=process.env.METTELO_EMAIL_FROM;if(!outbox?.id||!apiKey||!from)return;
  try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:email,subject,html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#10131d"><p>${body}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL||'https://mettelo.com'}/organisations">Mettelo for organisations</a></p></div>`})});if(!response.ok)throw new Error(`Email provider returned ${response.status}`);await db.from('email_outbox').update({status:'sent',sent_at:new Date().toISOString(),attempts:1,last_error:null}).eq('id',outbox.id);}catch(error){await db.from('email_outbox').update({status:'failed',attempts:1,last_error:error instanceof Error?error.message:'Email delivery failed'}).eq('id',outbox.id);}
}

export async function POST(request:Request){
  try{
    const db=serviceDb();if(!db)return NextResponse.json({error:'Submission service is not configured.'},{status:503});
    const body=await request.json();
    const organisationName=clean(body.organisation_name,160),website=clean(body.organisation_website,500),contactName=clean(body.contact_name,120),contactEmail=clean(body.contact_email,254).toLowerCase(),jobTitle=clean(body.job_title,180),type=clean(body.opportunity_type,40),summary=clean(body.summary,5000),location=clean(body.location,180),countryCode=clean(body.country_code,2).toUpperCase(),work=clean(body.work_arrangement,40),scope=clean(body.applicant_scope,40),sponsorship=clean(body.sponsorship_status,40),eligibility=clean(body.eligibility,1200),applicationUrl=clean(body.official_application_url,1000),closes=clean(body.closes_at,30),roleCategory=clean(body.role_category,120);
    if(!organisationName||!website||!contactName||!contactEmail||!jobTitle||!summary||!applicationUrl||!roleCategory)return NextResponse.json({error:'Complete all required fields before submitting.'},{status:400});
    if(!/^\S+@\S+\.\S+$/.test(contactEmail))return NextResponse.json({error:'Enter a valid contact email.'},{status:400});
    if(!validUrl(website)||!validUrl(applicationUrl))return NextResponse.json({error:'Use valid organisation and official application URLs.'},{status:400});
    if(!ALLOWED_TYPES.has(type)||!ALLOWED_SCOPES.has(scope)||!ALLOWED_SPONSORSHIP.has(sponsorship)||!ALLOWED_WORK.has(work))return NextResponse.json({error:'One or more opportunity options are invalid.'},{status:400});
    if(countryCode&&!/^[A-Z]{2}$/.test(countryCode))return NextResponse.json({error:'Country code must use two letters, for example GB.'},{status:400});
    if(summary.length<80)return NextResponse.json({error:'Add a more specific role summary so Mettelo can verify the opportunity.'},{status:400});
    if(closes&&new Date(`${closes}T23:59:59Z`)<=new Date())return NextResponse.json({error:'Closing date must be in the future.'},{status:400});
    const combined=` ${jobTitle} ${roleCategory} ${summary} `.toLowerCase();if(!DATA_AI_TERMS.some(term=>combined.includes(term)))return NextResponse.json({error:'Mettelo only accepts Data & AI-related opportunities.'},{status:422});
    const normalizedUrl=new URL(applicationUrl).toString();
    const [existingSubmission,existingOpportunity]=await Promise.all([db.from('employer_opportunity_submissions').select('id').ilike('official_application_url',normalizedUrl).neq('status','rejected').maybeSingle(),db.from('opportunities').select('id,status').ilike('official_application_url',normalizedUrl).maybeSingle()]);
    if(existingSubmission.data||existingOpportunity.data)return NextResponse.json({error:'This official application URL has already been submitted to Mettelo.'},{status:409});
    const {data,error}=await db.from('employer_opportunity_submissions').insert({organisation_name:organisationName,organisation_website:website,contact_name:contactName,contact_email:contactEmail,job_title:jobTitle,opportunity_type:type,summary,location:location||null,country_code:countryCode||null,work_arrangement:work,applicant_scope:scope,sponsorship_status:sponsorship,eligibility:eligibility||null,official_application_url:normalizedUrl,closes_at:closes?`${closes}T23:59:59Z`:null,role_family:roleCategory,role_category:roleCategory,status:'submitted'}).select('id').single();
    if(error){if(error.code==='23505')return NextResponse.json({error:'This official application URL has already been submitted.'},{status:409});throw error;}
    await notifyAdmins(db,{type:'employer_opportunity_submission',title:'New employer opportunity to review',body:`${organisationName} submitted “${jobTitle}” for Mettelo review.`,actionUrl:'/admin/employer-opportunities',subject:`New Mettelo employer opportunity — ${jobTitle}`,payload:{submission_id:data.id,organisation:organisationName}});
    await sendConfirmation(db,contactEmail,contactName,jobTitle);
    return NextResponse.json({ok:true,id:data.id,reference:`MET-${slugify(organisationName)}-${data.id.slice(0,8)}`},{status:201});
  }catch(error){console.error('employer opportunity submission error',error);return NextResponse.json({error:'Unable to submit this opportunity right now.'},{status:500});}
}
