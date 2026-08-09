import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type Source={id:string;provider:'greenhouse'|'lever';organisation_name:string;source_key:string;region:'global'|'eu';employer_domain:string|null;is_active:boolean;auto_publish_enabled:boolean};
type Job={externalId:string;title:string;description:string;location:string|null;url:string;updatedAt:string|null;team:string|null};
type GreenhouseJob={id?:string|number;title?:string;absolute_url?:string;content?:string;updated_at?:string;location?:{name?:string|null}|null;departments?:{name?:string|null}[]|null};
type GreenhouseResponse={jobs?:GreenhouseJob[]};
type LeverJob={id?:string;text?:string;hostedUrl?:string;descriptionPlain?:string;description?:string;additionalPlain?:string;additional?:string;categories?:{location?:string|null;team?:string|null}|null};

function stripHtml(value:string){return value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);}

const highTitles=['data analyst','senior data analyst','business intelligence analyst','bi developer','analytics engineer','data engineer','data scientist','decision scientist','product analyst','marketing analyst','crm analyst','digital analyst','web analyst','insight analyst','statistician','quantitative analyst','data quality analyst','data governance','data architect','ai engineer','machine learning engineer','ml engineer','applied scientist','nlp engineer','computer vision engineer','generative ai engineer','llm engineer','mlops engineer','ai researcher','data platform engineer','database engineer','etl engineer','elt engineer','cloud data engineer','data warehouse engineer','data reliability engineer','dataops'];
const mediumTitles=['business analyst','performance analyst','research analyst','commercial analyst','product manager','operations analyst'];
const signals=['sql','python','r ','power bi','tableau','looker','data model','data modelling','analytics','dashboard','machine learning','artificial intelligence',' ai ','statistical','forecast','bigquery','snowflake','databricks','dbt','data warehouse','data pipeline','etl','elt','experiment','a/b test','predictive','nlp','llm','generative ai'];

function classify(title:string,description:string){
  const t=` ${title.toLowerCase()} `;const d=` ${description.toLowerCase()} `;const high=highTitles.some(x=>t.includes(x));const medium=mediumTitles.some(x=>t.includes(x));const signalCount=signals.filter(x=>d.includes(x)||t.includes(x)).length;
  if(high)return {score:Math.min(99,90+Math.min(signalCount,3)*3),status:'high',roleFamily:highTitles.find(x=>t.includes(x))||title};
  if(medium){const score=Math.min(89,52+signalCount*8);return {score,status:score>=85?'high':'medium',roleFamily:mediumTitles.find(x=>t.includes(x))||title};}
  const score=Math.min(82,25+signalCount*9);return {score,status:score>=60?'medium':'low',roleFamily:'other'};
}

async function fetchJobs(source:Source):Promise<Job[]>{
  if(source.provider==='greenhouse'){
    const response=await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.source_key)}/jobs?content=true`,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`Greenhouse returned ${response.status}`);
    const json=(await response.json()) as GreenhouseResponse;
    return (Array.isArray(json.jobs)?json.jobs:[])
      .filter(job=>Boolean(job.id&&job.title&&job.absolute_url))
      .map(job=>({externalId:String(job.id),title:String(job.title),description:stripHtml(String(job.content||'')),location:job.location?.name?String(job.location.name):null,url:String(job.absolute_url),updatedAt:job.updated_at?String(job.updated_at):null,team:Array.isArray(job.departments)&&job.departments[0]?.name?String(job.departments[0].name):null}));
  }
  const base=source.region==='eu'?'https://api.eu.lever.co':'https://api.lever.co';
  const response=await fetch(`${base}/v0/postings/${encodeURIComponent(source.source_key)}?mode=json`,{headers:{accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw new Error(`Lever returned ${response.status}`);
  const json=(await response.json()) as LeverJob[];
  return (Array.isArray(json)?json:[])
    .filter(job=>Boolean(job.id&&job.text&&job.hostedUrl))
    .map(job=>({externalId:String(job.id),title:String(job.text),description:stripHtml([job.descriptionPlain,job.description,job.additionalPlain,job.additional].filter(Boolean).join(' ')),location:job.categories?.location?String(job.categories.location):null,url:String(job.hostedUrl),updatedAt:null,team:job.categories?.team?String(job.categories.team):null}));
}

export async function POST(request:Request){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:'Opportunity sync is not configured.'},{status:503});
  const body=await request.json();const sourceId=String(body.source_id||'');const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:source,error:sourceError}=await db.from('opportunity_ingestion_sources').select('*').eq('id',sourceId).single();if(sourceError||!source)return NextResponse.json({error:'Source not found.'},{status:404});const typed=source as Source;if(!typed.is_active)return NextResponse.json({error:'This source is disabled.'},{status:409});
  const {data:run}=await db.from('opportunity_ingestion_runs').insert({source_id:sourceId,status:'running'}).select('id').single();let published=0,review=0,rejected=0,ingested=0;
  try{
    const jobs=await fetchJobs(typed);
    for(const job of jobs){
      const cls=classify(job.title,job.description);const autoPublish=typed.auto_publish_enabled&&cls.status==='high'&&cls.score>=85;const reject=cls.status==='low'&&cls.score<40;const now=new Date().toISOString();const payload={slug:slugify(`${typed.organisation_name}-${job.title}-${job.externalId}`),title:job.title,organisation:typed.organisation_name,opportunity_type:'job',summary:job.description.slice(0,900)||null,location:job.location,eligibility:null,source_url:job.url,official_application_url:job.url,access_level:'public',status:autoPublish?'published':'draft',published_at:autoPublish?now:null,closes_at:null,role_family:cls.roleFamily,role_category:job.team||null,data_ai_relevance_score:cls.score,data_ai_relevance_status:reject?'rejected':cls.status,verification_status:reject?'rejected':autoPublish?'high_confidence':'needs_review',verification_score:95,verification_reasons:[`${typed.provider} official published-job feed`,`Data/AI relevance score ${cls.score}/100`],source_type:`official_${typed.provider}_ats`,source_organisation:typed.organisation_name,employer_domain:typed.employer_domain,external_job_id:job.externalId,original_published_at:job.updatedAt,last_verified_at:now,next_verification_at:new Date(Date.now()+24*60*60*1000).toISOString(),eligibility_status:'unknown',eligible_countries:[],remote_scope:null,sponsorship_status:'unknown',suspicion_score:0,review_required:!autoPublish&&!reject,rejection_reason:reject?'Insufficient Data/AI relevance.':null,publication_mode:'auto',classification_version:'ats-rule-v1',ingestion_source_id:sourceId,updated_at:now};
      const existing=await db.from('opportunities').select('id').eq('ingestion_source_id',sourceId).eq('external_job_id',job.externalId).maybeSingle();
      const result=existing.data?.id?await db.from('opportunities').update(payload).eq('id',existing.data.id).select('id').single():await db.from('opportunities').insert(payload).select('id').single();if(result.error)throw result.error;ingested++;
      if(autoPublish)published++;else if(reject)rejected++;else review++;
      await db.from('opportunity_verification_checks').insert({opportunity_id:result.data.id,check_type:'ats_sync',result:reject?'fail':autoPublish?'pass':'warn',score:cls.score,detail:`${typed.provider} sync; relevance ${cls.status}; source verification 95/100.`,checked_by:'ats-sync-v1'});
    }
    await db.from('opportunity_ingestion_runs').update({status:'completed',discovered_count:jobs.length,ingested_count:ingested,published_count:published,review_count:review,rejected_count:rejected,completed_at:new Date().toISOString()}).eq('id',run?.id);
    await db.from('opportunity_ingestion_sources').update({last_synced_at:new Date().toISOString(),last_sync_status:'completed',last_sync_error:null,updated_at:new Date().toISOString()}).eq('id',sourceId);
    return NextResponse.json({ok:true,discovered:jobs.length,ingested,published,needs_review:review,rejected});
  }catch(error){const message=error instanceof Error?error.message:'Sync failed.';if(run?.id)await db.from('opportunity_ingestion_runs').update({status:'failed',error_message:message,completed_at:new Date().toISOString()}).eq('id',run.id);await db.from('opportunity_ingestion_sources').update({last_sync_status:'failed',last_sync_error:message,updated_at:new Date().toISOString()}).eq('id',sourceId);return NextResponse.json({error:message},{status:500});}
}
