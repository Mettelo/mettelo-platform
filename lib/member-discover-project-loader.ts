import {createServerSupabaseClient} from '@/lib/supabase/server';

const PROJECT_STATUSES=['pilot','recruiting','open','forming','active','review','completed'];
const SCALARS='id,slug,title,summary,status,project_type,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,created_at';
const PRIMARY_SELECT=`${SCALARS},project_roles(id,title,skills,openings),project_role_families(project_role_catalogue(slug,title)),project_capabilities(capabilities(id,slug,name)),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;
const CORE_FACET_SELECT=`${SCALARS},project_roles(id,title,skills,openings),project_capabilities(capabilities(id,slug,name)),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;
const MINIMAL_SELECT=`${SCALARS},project_roles(id,title,skills,openings)`;
const DISCOVER_BATCH_SIZE=200;

type MemberServerDb=Awaited<ReturnType<typeof createServerSupabaseClient>>;
function projectQuery(db:MemberServerDb,select:string,from:number,to:number){return db.from('projects').select(select).in('visibility',['public','members']).in('status',PROJECT_STATUSES).order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,to)}
async function loadAllProjectBatches(db:MemberServerDb,select:string){let from=0;const rows:unknown[]=[];let lastResult:Awaited<ReturnType<typeof projectQuery>>|null=null;while(true){const to=from+DISCOVER_BATCH_SIZE-1;const result=await projectQuery(db,select,from,to);lastResult=result;if(result.error)return result;const batch=(result.data||[]) as unknown[];rows.push(...batch);if(batch.length<DISCOVER_BATCH_SIZE)break;from+=DISCOVER_BATCH_SIZE}if(!lastResult)return projectQuery(db,select,0,DISCOVER_BATCH_SIZE-1);return{...lastResult,data:rows}}
export async function loadMemberDiscoverProjects(db:MemberServerDb){const primary=await loadAllProjectBatches(db,PRIMARY_SELECT);if(!primary.error)return primary;console.warn('member Discover enriched project query failed; retrying without optional role-family catalogue relation',primary.error.message);const core=await loadAllProjectBatches(db,CORE_FACET_SELECT);if(!core.error)return core;console.warn('member Discover core-facet project query failed; retrying canonical project and role fields only',core.error.message);return loadAllProjectBatches(db,MINIMAL_SELECT)}
