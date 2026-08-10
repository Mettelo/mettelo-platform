import { createClient } from '@supabase/supabase-js';

type OpportunityRow={id:string;title:string;organisation:string|null;location:string|null;role_family:string|null;source_type:string|null;country_code:string|null;region_code:string|null;sponsorship_status:string|null;classification_version:string|null};

const explicitDataAiTitle=/\b(data|analytics?|business intelligence|\bbi\b|ai|artificial intelligence|machine learning|\bml\b|mlops|dataops|nlp|llm|generative ai|genai|computer vision|statistic(?:ian|al)|quant(?:itative)?|insights?)\b/i;
const explicitAiEngineering=/\b(agentic|foundation model|world model|language model|pre-training|post-training|model training)\b/i;
const allowedAppliedAnalyst=/\b(marketing|crm|digital|web|product|business|performance|research|commercial|operations|risk|financial)\s+analyst\b/i;
const genericEngineering=/\b(software engineer|software developer|solutions? architect|platform engineer|backend engineer|frontend engineer|full[ -]?stack|devops engineer)\b/i;

function shouldRemainPublished(row:OpportunityRow){
  const title=row.title||'';
  if(explicitDataAiTitle.test(title)||explicitAiEngineering.test(title)||allowedAppliedAnalyst.test(title))return true;
  if(genericEngineering.test(title))return false;
  if(row.role_family==='Data / AI adjacent'||row.role_family==='Data / AI Software Engineering')return false;
  return true;
}

const locationRules:[RegExp,string,string][]=[
  [/\b(united kingdom|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|glasgow|edinburgh|cheltenham)\b/i,'GB','UK'],
  [/\b(nigeria|lagos|abuja|ibadan|port harcourt)\b/i,'NG','AFRICA'],
  [/\b(india|bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai)\b/i,'IN','ASIA'],
  [/\b(united states|usa|new york|california|texas|seattle|san francisco)\b/i,'US','NORTH_AMERICA'],
  [/\b(canada|toronto|vancouver|montreal)\b/i,'CA','NORTH_AMERICA'],
  [/\b(australia|sydney|melbourne|brisbane)\b/i,'AU','OCEANIA'],
  [/\b(germany|berlin|munich|münchen|hamburg|frankfurt)\b/i,'DE','EUROPE'],
  [/\b(france|paris|lyon)\b/i,'FR','EUROPE'],
  [/\b(netherlands|amsterdam|rotterdam)\b/i,'NL','EUROPE'],
  [/\b(spain|madrid|barcelona)\b/i,'ES','EUROPE'],
  [/\b(ireland|dublin)\b/i,'IE','EUROPE'],
  [/\b(italy|milan|rome)\b/i,'IT','EUROPE'],
  [/\b(poland|warsaw|krakow)\b/i,'PL','EUROPE'],
  [/\b(slovakia|bratislava)\b/i,'SK','EUROPE'],
  [/\b(hungary|budapest)\b/i,'HU','EUROPE'],
  [/\b(romania|bucharest)\b/i,'RO','EUROPE'],
  [/\b(serbia|belgrade)\b/i,'RS','EUROPE']
];
function geoFor(row:OpportunityRow){if(row.country_code){if(row.region_code)return {countryCode:row.country_code,regionCode:row.region_code};const region=row.country_code==='GB'?'UK':row.country_code==='NG'?'AFRICA':row.country_code==='IN'?'ASIA':['US','CA'].includes(row.country_code)?'NORTH_AMERICA':row.country_code==='AU'?'OCEANIA':row.country_code==='GLOBAL'?'GLOBAL':null;return {countryCode:row.country_code,regionCode:region};}const location=row.location||'';const match=locationRules.find(([pattern])=>pattern.test(location));return match?{countryCode:match[1],regionCode:match[2]}:{countryCode:null,regionCode:null};}
function normalizeOrg(value:string){return value.toLowerCase().replace(/&amp;/g,'and').replace(/&/g,'and').replace(/\b(limited|ltd|plc|llp|inc|incorporated|corp|corporation|company|co)\b/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function stripHtml(value:string){return value.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
async function getSponsorPreviewUrl(){try{const response=await fetch('https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers',{headers:{'user-agent':'Mettelo opportunity sponsor verifier'},cache:'no-store'});if(!response.ok)return null;const html=await response.text();const match=html.match(/href=["']([^"']*\/csv-preview\/[^"']+)["']/i);if(!match)return null;return new URL(match[1],'https://www.gov.uk').toString();}catch{return null;}}
async function isLicensedSponsor(previewUrl:string,organisation:string){try{const url=new URL(previewUrl);url.searchParams.set('search',organisation);const response=await fetch(url,{headers:{'user-agent':'Mettelo opportunity sponsor verifier'},cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)return false;const text=normalizeOrg(stripHtml(await response.text()));const target=normalizeOrg(organisation);return target.length>=4&&text.includes(target)&&/skilled worker/i.test(text);}catch{return false;}}

export async function runOpportunityQualitySweep(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Opportunity quality sweep is not configured.');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const rowsResult=await db.from('opportunities').select('id,title,organisation,location,role_family,source_type,country_code,region_code,sponsorship_status,classification_version').eq('status','published').eq('access_level','public').eq('data_ai_relevance_status','high').limit(500);if(rowsResult.error)throw rowsResult.error;
  const rows=(rowsResult.data||[]) as OpportunityRow[];let removed=0,geoUpdated=0,sponsorMatched=0;const sponsorPreview=await getSponsorPreviewUrl();const sponsorCache=new Map<string,boolean>();
  for(const row of rows){if(String(row.source_type||'').startsWith('discovery_')&&!shouldRemainPublished(row)){const now=new Date().toISOString();await db.from('opportunities').update({status:'archived',expired_at:now,rejection_reason:'Removed by automated Data & AI title-quality sweep.',review_required:false,updated_at:now}).eq('id',row.id);removed++;continue;}
    const geo=geoFor(row),updates:Record<string,unknown>={};if(geo.countryCode&&geo.countryCode!==row.country_code)updates.country_code=geo.countryCode;if(geo.regionCode&&geo.regionCode!==row.region_code)updates.region_code=geo.regionCode;if(Object.keys(updates).length){updates.updated_at=new Date().toISOString();await db.from('opportunities').update(updates).eq('id',row.id);geoUpdated++;}
    const effectiveCountry=geo.countryCode||row.country_code;if(effectiveCountry==='GB'&&row.organisation&&sponsorPreview&&!['confirmed','not_offered'].includes(row.sponsorship_status||'')){const cacheKey=normalizeOrg(row.organisation);let licensed=sponsorCache.get(cacheKey);if(licensed===undefined){licensed=await isLicensedSponsor(sponsorPreview,row.organisation);sponsorCache.set(cacheKey,licensed);}if(licensed){await db.from('opportunities').update({sponsorship_status:'licensed_sponsor',updated_at:new Date().toISOString()}).eq('id',row.id);sponsorMatched++;}}
  }
  return {ok:true,checked:rows.length,removed_non_data_ai:removed,geo_updated:geoUpdated,licensed_sponsors_matched:sponsorMatched};
}
