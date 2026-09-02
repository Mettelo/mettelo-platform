import {NextResponse} from 'next/server';
import {architectContext,assignedRole,clean} from '@/lib/project-governance';
import {getProjectCatalogueReadiness} from '@/lib/project-catalogue-readiness';

const workingModels=new Set(['remote','hybrid','onsite']);
type Context={params:Promise<{id:string}>};

function uuid(value:unknown){const id=clean(value,80);return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:''}
function cleanArray(value:unknown,max=20){return Array.isArray(value)?[...new Set(value.map(item=>clean(item,120)).filter(Boolean))].slice(0,max):[]}
function relationSlug(value:unknown){const item=Array.isArray(value)?value[0]:value;return item&&typeof item==='object'&&'slug'in item?clean((item as {slug?:unknown}).slug,120):''}
function rpcErrorMessage(message:string){
 if(message.includes('PROJECT_NOT_EDITABLE'))return 'This project is no longer editable because its governance state changed.';
 if(message.includes('LOCATION_REQUIRED'))return 'Add the location or region for a Hybrid or On-site project.';
 if(message.includes('INVALID_WORKING_MODEL'))return 'Choose Remote, Hybrid or On-site.';
 if(message.includes('INVALID_DOMAIN'))return 'Choose an active governed Domain.';
 if(message.includes('INVALID_ROLE_FAMILY')||message.includes('ROLE_FAMILY_REQUIRED'))return 'Choose at least one active governed Role family.';
 if(message.includes('INVALID_TOOL'))return 'One selected Tool is no longer active. Refresh the classification and try again.';
 return 'Unable to save the governed catalogue classification.';
}

async function editableContext(projectId:string){
 const ctx=await architectContext();if('error'in ctx)return{error:ctx.error} as const;const {db,user,isAdmin}=ctx;
 const {data:project,error}=await db.from('projects').select('id,governance_status,location,location_type,catalogue_working_model_source').eq('id',projectId).maybeSingle();if(error)throw error;
 if(!project)return{error:NextResponse.json({error:'Project proposal not found.'},{status:404})} as const;
 const roles=await assignedRole(db,projectId,user.id);if(!isAdmin&&!roles.includes('creating_architect'))return{error:NextResponse.json({error:'Creating Project Architect access is required.'},{status:403})} as const;
 if(!['draft','changes_requested'].includes(project.governance_status))return{error:NextResponse.json({error:'Only draft or changes-requested proposals can be edited.'},{status:409})} as const;
 return{db,user,isAdmin,project} as const;
}

export async function GET(_:Request,{params}:Context){
 try{
  const {id}=await params,projectId=uuid(id);if(!projectId)return NextResponse.json({error:'Valid project ID required.'},{status:400});
  const access=await editableContext(projectId);if('error'in access)return access.error;const {db,project}=access;
  const [domains,families,tools,readiness]=await Promise.all([
   db.from('project_domains').select('is_primary,domains(slug)').eq('project_id',projectId).order('is_primary',{ascending:false}),
   db.from('project_role_families').select('project_role_catalogue(slug)').eq('project_id',projectId),
   db.from('project_tools').select('tools(slug)').eq('project_id',projectId),
   getProjectCatalogueReadiness(db,projectId)
  ]);
  if(domains.error)throw domains.error;if(families.error)throw families.error;if(tools.error)throw tools.error;
  return NextResponse.json({working_model:project.location_type||'',location:project.location||'',working_model_source:project.catalogue_working_model_source,domain_slug:relationSlug(domains.data?.[0]?.domains),role_family_slugs:(families.data||[]).map(row=>relationSlug(row.project_role_catalogue)).filter(Boolean),tool_slugs:(tools.data||[]).map(row=>relationSlug(row.tools)).filter(Boolean),catalogue_readiness:readiness});
 }catch(error){console.error('project catalogue classification load error',error);return NextResponse.json({error:'Unable to load the governed catalogue classification.'},{status:500})}
}

export async function PATCH(request:Request,{params}:Context){
 try{
  const {id}=await params,projectId=uuid(id);if(!projectId)return NextResponse.json({error:'Valid project ID required.'},{status:400});
  const access=await editableContext(projectId);if('error'in access)return access.error;const {db,user,isAdmin}=access;
  const body=await request.json();const workingModel=clean(body.working_model,30),location=clean(body.location,160),domainSlug=clean(body.domain_slug,120),roleFamilySlugs=cleanArray(body.role_family_slugs,12),toolSlugs=cleanArray(body.tool_slugs,20);
  if(!workingModels.has(workingModel))return NextResponse.json({error:'Choose an explicit working model: Remote, Hybrid or On-site.'},{status:400});
  if(workingModel!=='remote'&&!location)return NextResponse.json({error:'Add the location or region for a Hybrid or On-site project.'},{status:400});
  if(!domainSlug||roleFamilySlugs.length<1)return NextResponse.json({error:'Choose one Domain and at least one canonical Role family.'},{status:400});
  const [{data:domain,error:domainError},{data:roleFamilies,error:familyError},{data:tools,error:toolError}]=await Promise.all([
   db.from('domains').select('id,slug').eq('slug',domainSlug).eq('is_active',true).maybeSingle(),
   db.from('project_role_catalogue').select('id,slug').in('slug',roleFamilySlugs).eq('active',true),
   toolSlugs.length?db.from('tools').select('id,slug').in('slug',toolSlugs).eq('is_active',true):Promise.resolve({data:[],error:null})
  ]);
  if(domainError)throw domainError;if(familyError)throw familyError;if(toolError)throw toolError;
  if(!domain||new Set((roleFamilies||[]).map(row=>row.slug)).size!==roleFamilySlugs.length||new Set((tools||[]).map(row=>row.slug)).size!==toolSlugs.length)return NextResponse.json({error:'One or more catalogue classifications are invalid or inactive. Refresh and choose governed values.'},{status:400});
  const {error}=await db.rpc('apply_project_catalogue_classification_revision',{target_project_id:projectId,actor_user_id:user.id,actor_scope_value:isAdmin?'admin':'project_architect',working_model_value:workingModel,location_value:workingModel==='remote'?'Remote':location,domain_id_value:domain.id,role_family_ids:(roleFamilies||[]).map(row=>row.id),tool_ids:(tools||[]).map(row=>row.id)});
  if(error)return NextResponse.json({error:rpcErrorMessage(error.message)},{status:error.message.includes('NOT_EDITABLE')?409:500});
  const readiness=await getProjectCatalogueReadiness(db,projectId);
  return NextResponse.json({ok:true,catalogue_readiness:readiness});
 }catch(error){console.error('project catalogue classification save error',error);return NextResponse.json({error:'Unable to save the governed catalogue classification.'},{status:500})}
}
