import {createPublicSupabaseClient} from '@/lib/supabase/public';

const PROJECT_STATUSES=['pilot','recruiting','open','forming','active','review','completed'];
const BATCH_SIZE=200;
const PRIMARY_SELECT='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at,project_roles(id,title,discipline,openings),project_runs(id,run_number,status,completed_at),project_role_families(project_role_catalogue(slug,title)),project_capabilities(capabilities(id,slug,name)),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))';
const CORE_SELECT='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at,project_roles(id,title,discipline,openings),project_runs(id,run_number,status,completed_at),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))';
const MINIMAL_SELECT='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at';

type PublicDb=NonNullable<ReturnType<typeof createPublicSupabaseClient>>;

function query(db:PublicDb,select:string,from:number,to:number){return db.from('projects').select(select).in('status',PROJECT_STATUSES).eq('visibility','public').order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,to)}
async function all(db:PublicDb,select:string){let from=0;const rows:unknown[]=[];let last:Awaited<ReturnType<typeof query>>|null=null;while(true){const result=await query(db,select,from,from+BATCH_SIZE-1);last=result;if(result.error)return result;const batch=(result.data||[]) as unknown[];rows.push(...batch);if(batch.length<BATCH_SIZE)break;from+=BATCH_SIZE}return last?{...last,data:rows}:query(db,select,0,BATCH_SIZE-1)}

export async function loadPublicProjectCatalogue(db:PublicDb){const primary=await all(db,PRIMARY_SELECT);if(!primary.error)return primary;console.warn('public Projects enriched query failed; retrying core facets',primary.error.message);const core=await all(db,CORE_SELECT);if(!core.error)return core;console.warn('public Projects core query failed; retrying scalar fields',core.error.message);return all(db,MINIMAL_SELECT)}
