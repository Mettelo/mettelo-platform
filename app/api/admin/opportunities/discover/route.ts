import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type DiscoveredJob={provider:'arbeitnow'|'remotive';externalId:string;title:string;organisation:string;description:string;location:string|null;url:string;publishedAt:string|null;remote:boolean};
type ArbeitnowJob={slug?:string;company_name?:string;title?:string;description?:string;remote?:boolean;url?:string;location?:string;created_at?:number};
type ArbeitnowResponse={data?:ArbeitnowJob[]};
type RemotiveJob={id?:number|string;url?:string;title?:string;company_name?:string;publication_date?:string;candidate_required_location?:string;description?:string};
type RemotiveResponse={jobs?:RemotiveJob[]};

type Classification={score:number;status:'high'|'medium'|'low';roleFamily:string;reasons:string[]};

function decodeEntities(value:string){return value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');}
function stripHtml(value:string){let current=value;for(let i=0;i<2;i++)current=decodeEntities(current);return current.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function slugify(value:string){return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);}

const excludedTitlePatterns=[
  /\bdata entry\b/i,/\bentry clerk\b/i,/\badministrative assistant\b/i,/\bsales (representative|executive|manager)\b/i,
  /\baccountant\b/i,/\bwarehouse operative\b/i,/\bcustomer service\b/i,/\bcall centre\b/i
];

const strongTitleFamilies:[RegExp,string][]=[
  [/\bdata\s+(analyst|scientist|engineer|architect|developer|specialist|consultant|manager|lead|platform|quality|governance|steward|model(?:er|ling)?|warehouse|pipeline|ops|reliability)\b/i,'Data'],
  [/\b(data|analytics?)\s+(pipeline|platform|engineering|infrastructure|warehouse|lakehouse)\b/i,'Data Engineering'],
  [/\banalytics?\s+(engineer|analyst|consultant|manager|lead|specialist|developer)\b/i,'Analytics'],
  [/\bbusiness intelligence\b|\bbi\s+(analyst|developer|engineer|consultant|specialist)\b/i,'Business Intelligence'],
  [/\b(ai|artificial intelligence)\s+(engineer|developer|scientist|researcher|specialist|consultant|product|platform|architect|lead)\b/i,'AI'],
  [/\b(machine learning|ml)\s+(engineer|scientist|researcher|developer|specialist|platform|ops|architect|lead)\b/i,'Machine Learning'],
  [/\bmlops\b|\bdataops\b/i,'MLOps / DataOps'],
  [/\b(nlp|natural language processing|computer vision|generative ai|genai|llm|large language model)\b/i,'Applied AI'],
  [/\b(statistician|statistical analyst|quantitative analyst|quant analyst|decision scientist)\b/i,'Statistics / Quant'],
  [/\b(insight|insights)\s+(analyst|manager|lead|specialist)\b/i,'Insights'],
  [/\b(marketing|crm|digital|web|product)\s+analyst\b/i,'Applied Analytics'],
  [/\b(database|etl|elt|big data|cloud data)\s+(engineer|developer|architect|specialist|administrator)\b/i,'Data Engineering'],
  [/\bsoftware\s+(engineer|developer).*\b(data|analytics|machine learning|ai|ml|pipeline|platform)\b/i,'Data / AI Software Engineering']
];

const genericAnalystPatterns:[RegExp,string][]=[
  [/\bbusiness analyst\b/i,'Business Analyst'],
  [/\bperformance analyst\b/i,'Performance Analyst'],
  [/\bresearch analyst\b/i,'Research Analyst'],
  [/\bcommercial analyst\b/i,'Commercial Analyst'],
  [/\boperations analyst\b/i,'Operations Analyst'],
  [/\bfinancial analyst\b/i,'Financial Analyst'],
  [/\brisk analyst\b/i,'Risk Analyst'],
  [/\banalyst\b/i,'Analyst']
];

const technicalSignals=[
  'sql','python',' r ','power bi','tableau','looker','bigquery','snowflake','databricks','dbt','pandas','numpy','spark',
  'data model','data modelling','data modeling','data warehouse','data pipeline','etl','elt','dashboard','analytics','statistical',
  'forecast','experiment','a/b test','predictive','machine learning','artificial intelligence',' generative ai',' llm','nlp',
  'data quality','data governance','segmentation','regression','classification','time series','business intelligence','semantic model'
];

const strongDescriptionSignals=[
  'machine learning','artificial intelligence','generative ai','large language model',' llm','nlp','computer vision','data pipeline',
  'data warehouse','analytics engineering','data science','predictive model','statistical model','bigquery','snowflake','databricks','dbt'
];

function classify(title:string,description:string):Classification{
  const t=` ${title.toLowerCase()} `;
  const d=` ${description.toLowerCase()} `;
  if(excludedTitlePatterns.some(pattern=>pattern.test(title)))return {score:10,status:'low',roleFamily:'Excluded',reasons:['Title matches an explicitly excluded non-Data/AI role']};

  const direct=strongTitleFamilies.find(([pattern])=>pattern.test(title));
  const signalMatches=technicalSignals.filter(signal=>d.includes(signal)||t.includes(signal));
  const uniqueSignals=[...new Set(signalMatches)];
  const strongDescriptionCount=strongDescriptionSignals.filter(signal=>d.includes(signal)||t.includes(signal)).length;

  if(direct){
    const score=Math.min(99,88+Math.min(uniqueSignals.length,4)*2);
    return {score,status:'high',roleFamily:direct[1],reasons:[`Strong Data/AI title family: ${direct[1]}`,`${uniqueSignals.length} supporting technical signal${uniqueSignals.length===1?'':'s'}`]};
  }

  const generic=genericAnalystPatterns.find(([pattern])=>pattern.test(title));
  if(generic){
    const score=Math.min(94,64+(uniqueSignals.length*5)+(strongDescriptionCount*4));
    const high=uniqueSignals.length>=3&&score>=85;
    return {score,status:high?'high':score>=65?'medium':'low',roleFamily:generic[1],reasons:[`Conditional analyst title: ${generic[1]}`,`${uniqueSignals.length} supporting Data/AI signal${uniqueSignals.length===1?'':'s'}`]};
  }

  if(strongDescriptionCount>=2&&uniqueSignals.length>=5){
    const score=Math.min(90,70+(uniqueSignals.length*3));
    return {score,status:score>=85?'high':'medium',roleFamily:'Data / AI adjacent',reasons:[`${strongDescriptionCount} strong Data/AI description signals`,`${uniqueSignals.length} total technical signals`]};
  }

  const score=Math.min(79,20+uniqueSignals.length*7);
  return {score,status:score>=60?'medium':'low',roleFamily:'Other',reasons:[`${uniqueSignals.length} Data/AI signals but no qualifying title family`]};
}

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
    let relevant=0,ingested=0,published=0,rejected=0,duplicates=0,upgraded=0;
    for(const job of jobs){
      const cls=classify(job.title,job.description);if(cls.status!=='high'||cls.score<85){rejected++;continue;}relevant++;
      const now=new Date().toISOString();
      const existing=await db.from('opportunities').select('id,status,source_type').eq('source_url',job.url).maybeSingle();
      const sourceLabel=job.provider==='arbeitnow'?'Arbeitnow discovery feed':'Remotive discovery feed';
      const verificationReasons=[`${sourceLabel} returned an active listing`,...cls.reasons,`Data/AI relevance score ${cls.score}/100`,`Discovered within the last 7 days`];
      if(existing.data?.id){
        if(existing.data.status!=='published'&&String(existing.data.source_type||'').startsWith('discovery_')){
          const update=await db.from('opportunities').update({status:'published',published_at:now,official_application_url:job.url,data_ai_relevance_score:cls.score,data_ai_relevance_status:'high',role_family:cls.roleFamily,verification_status:'high_confidence',verification_score:88,verification_reasons:verificationReasons,last_verified_at:now,next_verification_at:new Date(Date.now()+24*60*60*1000).toISOString(),review_required:false,rejection_reason:null,publication_mode:'auto',classification_version:'discovery-rule-v3',updated_at:now}).eq('id',existing.data.id);
          if(!update.error){upgraded++;published++;}
        }else duplicates++;
        continue;
      }
      const payload={slug:slugify(`${job.organisation}-${job.title}-${job.provider}-${job.externalId}`),title:job.title,organisation:job.organisation,opportunity_type:'job',summary:job.description.slice(0,700)||null,location:job.location,eligibility:null,source_url:job.url,official_application_url:job.url,access_level:'public',status:'published',published_at:now,closes_at:null,role_family:cls.roleFamily,role_category:null,data_ai_relevance_score:cls.score,data_ai_relevance_status:'high',verification_status:'high_confidence',verification_score:88,verification_reasons:verificationReasons,source_type:`discovery_${job.provider}`,source_organisation:job.provider==='arbeitnow'?'Arbeitnow':'Remotive',employer_domain:null,external_job_id:`${job.provider}:${job.externalId}`,original_published_at:job.publishedAt,last_verified_at:now,next_verification_at:new Date(Date.now()+24*60*60*1000).toISOString(),eligibility_status:'unknown',eligible_countries:[],remote_scope:job.remote?'remote':null,sponsorship_status:'unknown',suspicion_score:10,review_required:false,rejection_reason:null,publication_mode:'auto',classification_version:'discovery-rule-v3',updated_at:now};
      const result=await db.from('opportunities').insert(payload).select('id').single();if(result.error)continue;ingested++;published++;
      await db.from('opportunity_verification_checks').insert({opportunity_id:result.data.id,check_type:'discovery_feed',result:'pass',score:88,detail:`${sourceLabel}; ${cls.reasons.join('; ')}; Data/AI relevance ${cls.score}/100; auto-published under v3 rule.`,checked_by:'global-discovery-v3'});
    }
    return NextResponse.json({ok:true,scanned:jobs.length,relevant,ingested,published,upgraded,needs_review:0,rejected,duplicates,source_errors:errors});
  }catch(error){console.error('opportunity discovery error',error);return NextResponse.json({error:error instanceof Error?error.message:'Opportunity discovery failed.'},{status:500});}
}
