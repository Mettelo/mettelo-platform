import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type DiscoveredJob={provider:'arbeitnow'|'remotive';externalId:string;title:string;organisation:string;description:string;location:string|null;url:string;publishedAt:string|null;remote:boolean};
type ArbeitnowJob={slug?:string;company_name?:string;title?:string;description?:string;remote?:boolean;url?:string;location?:string;created_at?:number};
type ArbeitnowResponse={data?:ArbeitnowJob[]};
type RemotiveJob={id?:number|string;url?:string;title?:string;company_name?:string;publication_date?:string;candidate_required_location?:string;description?:string};
type RemotiveResponse={jobs?:RemotiveJob[]};

function decodeEntities(value:string){return value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');}
function stripHtml(value:string){let current=value;for(let i=0;i<2;i++)current=decodeEntities(current);return current.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);}
const highTitles=['data analyst','senior data analyst','business intelligence analyst','bi developer','analytics engineer','data engineer','data scientist','decision scientist','product analyst','marketing analyst','crm analyst','digital analyst','web analyst','insight analyst','statistician','quantitative analyst','data quality analyst','data governance','data architect','ai engineer','machine learning engineer','ml engineer','applied scientist','nlp engineer','computer vision engineer','generative ai engineer','llm engineer','mlops engineer','ai researcher','data platform engineer','database engineer','etl engineer','elt engineer','cloud data engineer','data warehouse engineer','data reliability engineer','dataops'];
const mediumTitles=['business analyst','performance analyst','research analyst','commercial analyst','product manager','operations analyst'];
const signals=['sql','python',' r ','power bi','tableau','looker','data model','data modelling','analytics','dashboard','machine learning','artificial intelligence',' ai ','statistical','forecast','bigquery','snowflake','databricks','dbt','data warehouse','data pipeline','etl','elt','experiment','a/b test','predictive','nlp','llm','generative ai'];
function classify(title:string,description:string){const t=` ${title.toLowerCase()} `;const d=` ${description.toLowerCase()} `;const high=highTitles.some(x=>t.includes(x));const medium=mediumTitles.some(x=>t.includes(x));const signalCount=signals.filter(x=>d.includes(x)||t.includes(x)).length;if(high)return {score:Math.min(99,90+Math.min(signalCount,3)*3),status:'high',roleFamily:highTitles.find(x=>t.includes(x))||title};if(medium){const score=Math.min(89,52+signalCount*8);return {score,status:score>=85?'high':'medium',roleFamily:mediumTitles.find(x=>t.includes(x))||title};}const score=Math.min(82,25+signalCount*9);return {score,status:score>=60?'medium':'low',roleFamily:'other'};}

async function fetchArbeitnow():Promise<DiscoveredJob[]>{
  const response=await fetch('https://www.arbeitnow.com/api/job-board-api',{headers:{accept:'application/json'},cache:'no-store'});if(!response.ok)throw new Error(`Arbeitnow returned ${response.status}`);const json=(await response.json()) as ArbeitnowResponse;
  return (json.data||[]).filter(job=>job.slug&&job.title&&job.company_name&&job.url).map(job=>({provider:'arbeitnow',externalId:String(job.slug),title:String(job.title),organisation:String(job.company_name),description:stripHtml(String(job.description||'')),location:job.location?String(job.location):null,url:String(job.url),publishedAt:job.created_at?new Date(job.created_at*1000).toISOString():null,remote:Boolean(job.remote)}));
}
async function fetchRemotive():Promise<DiscoveredJob[]>{
  const response=await fetch('https://remotive.com/api/remote-jobs',{headers:{accept:'application/json','user-agent':'Mettelo opportunity discovery'},cache:'no-store'});if(!response.ok)throw new Error(`Remotive returned ${response.status}`);const json=(await response.json()) as RemotiveResponse;
  return (json.jobs||[]).filter(job=>job.id&&job.title&&job.company_name&&job.url).map(job=>({provider:'remotive',externalId:String(job.id),title:String(job.title),organisation:String(job.company_name),description:stripHtml(String(job.description||'')),location:job.candidate_required_location?String(job.candidate_required_location):'Remote',url:String(job.url),publishedAt:job.publication_date?String(job.publication_date):null,remote:true}));
}

export async function POST(){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user||user.app_metadata?.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return NextResponse.json({error:'Opportunity discovery is not configured.'},{status:503});
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const cutoff=Date.now()-7*24*60*60*1000;const settled=await Promise.allSettled([fetchArbeitnow(),fetchRemotive()]);const errors=settled.filter(item=>item.status==='rejected').map(item=>item.status==='rejected'?(item.reason instanceof Error?item.reason.message:String(item.reason)):'');const jobs=settled.flatMap(item=>item.status==='fulfilled'?item.value:[]).filter(job=>!job.publishedAt||new Date(job.publishedAt).getTime()>=cutoff);
    let relevant=0,ingested=0,published=0,rejected=0,duplicates=0;
    for(const job of jobs){
      const cls=classify(job.title,job.description);if(cls.status!=='high'||cls.score<90){rejected++;continue;}relevant++;
      const now=new Date().toISOString();const existing=await db.from('opportunities').select('id').eq('source_url',job.url).maybeSingle();if(existing.data?.id){duplicates++;continue;}
      const sourceLabel=job.provider==='arbeitnow'?'Arbeitnow discovery feed':'Remotive discovery feed';const payload={slug:slugify(`${job.organisation}-${job.title}-${job.provider}-${job.externalId}`),title:job.title,organisation:job.organisation,opportunity_type:'job',summary:job.description.slice(0,700)||null,location:job.location,eligibility:null,source_url:job.url,official_application_url:job.url,access_level:'public',status:'published',published_at:now,closes_at:null,role_family:cls.roleFamily,role_category:null,data_ai_relevance_score:cls.score,data_ai_relevance_status:'high',verification_status:'high_confidence',verification_score:88,verification_reasons:[`${sourceLabel} returned an active listing`,`Strong Data/AI role match ${cls.score}/100`,`Discovered within the last 7 days`],source_type:`discovery_${job.provider}`,source_organisation:job.provider==='arbeitnow'?'Arbeitnow':'Remotive',employer_domain:null,external_job_id:`${job.provider}:${job.externalId}`,original_published_at:job.publishedAt,last_verified_at:now,next_verification_at:new Date(Date.now()+24*60*60*1000).toISOString(),eligibility_status:'unknown',eligible_countries:[],remote_scope:job.remote?'remote':null,sponsorship_status:'unknown',suspicion_score:10,review_required:false,rejection_reason:null,publication_mode:'auto',classification_version:'discovery-rule-v2',updated_at:now};
      const result=await db.from('opportunities').insert(payload).select('id').single();if(result.error)continue;ingested++;published++;
      await db.from('opportunity_verification_checks').insert({opportunity_id:result.data.id,check_type:'discovery_feed',result:'pass',score:88,detail:`${sourceLabel}; strong Data/AI relevance ${cls.score}/100; auto-published under strict v2 rule.`,checked_by:'global-discovery-v2'});
    }
    return NextResponse.json({ok:true,scanned:jobs.length,relevant,ingested,published,needs_review:0,rejected,duplicates,source_errors:errors});
  }catch(error){console.error('opportunity discovery error',error);return NextResponse.json({error:error instanceof Error?error.message:'Opportunity discovery failed.'},{status:500});}
}
