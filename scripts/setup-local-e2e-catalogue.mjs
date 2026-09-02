import {createClient} from '@supabase/supabase-js';

function required(name){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required.`);return value;}
const url=required('E2E_SUPABASE_URL');
if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Catalogue fixture setup refuses non-local Supabase hosts.');
const db=createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const projectId='00000000-0000-4000-8000-00000000e2e1';

async function one(table,slug,extra={}){
  let query=db.from(table).select('id,slug').eq('slug',slug);
  for(const [key,value] of Object.entries(extra))query=query.eq(key,value);
  const {data,error}=await query.single();
  if(error)throw error;
  return data;
}

const role=await one('project_role_catalogue','data-analyst',{active:true});
const domain=await one('domains','cross-industry-open-data',{is_active:true});
const tool=await one('tools','python',{is_active:true});
const method=await one('methods','data-quality',{is_active:true});
const {data:capabilities,error:capabilityError}=await db.from('capabilities').select('id,slug').in('slug',['data-analysis','data-quality','stakeholder-communication']).eq('is_active',true);
if(capabilityError)throw capabilityError;
if((capabilities||[]).length!==3)throw new Error('Expected three canonical catalogue capabilities for isolated E2E fixture.');

const {error:projectError}=await db.from('projects').update({
  location_type:'remote',
  catalogue_working_model_source:'explicit',
  duration_weeks:4
}).eq('id',projectId);
if(projectError)throw projectError;

const {error:familyError}=await db.from('project_role_families').upsert({project_id:projectId,role_catalogue_id:role.id,source:'e2e_fixture'},{onConflict:'project_id,role_catalogue_id'});
if(familyError)throw familyError;
const {error:capError}=await db.from('project_capabilities').upsert(capabilities.map(item=>({project_id:projectId,capability_id:item.id,importance:'core',evidence_expected:true})),{onConflict:'project_id,capability_id'});
if(capError)throw capError;
const {error:domainError}=await db.from('project_domains').upsert({project_id:projectId,domain_id:domain.id,is_primary:true},{onConflict:'project_id,domain_id'});
if(domainError)throw domainError;
const {error:toolError}=await db.from('project_tools').upsert({project_id:projectId,tool_id:tool.id},{onConflict:'project_id,tool_id'});
if(toolError)throw toolError;
const {error:methodError}=await db.from('project_methods').upsert({project_id:projectId,method_id:method.id},{onConflict:'project_id,method_id'});
if(methodError)throw methodError;

const {data:readiness,error:readinessError}=await db.from('project_catalogue_readiness').select('catalogue_ready,missing_requirements').eq('project_id',projectId).single();
if(readinessError)throw readinessError;
if(!readiness.catalogue_ready)throw new Error(`Isolated E2E project is catalogue-incomplete: ${(readiness.missing_requirements||[]).join(', ')}`);
console.log('Classified isolated E2E project fixture against Project Catalogue Filters V2 Phase 1.');
