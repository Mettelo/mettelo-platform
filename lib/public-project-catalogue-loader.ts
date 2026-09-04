import {createPublicSupabaseClient} from '@/lib/supabase/public';

const PROJECT_STATUSES=['pilot','recruiting','open','forming','active','review','completed'];
const BATCH_SIZE=200;
const PRIMARY_SELECT='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at,project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_capabilities(capabilities(id,slug,name)),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))';
const CORE_SELECT='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at,project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))';
const MINIMAL_SELECT='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at';

type PublicDb=NonNullable<ReturnType<typeof createPublicSupabaseClient>>;
type RoleRow={title?:string|null;canonical_role_key?:string|null;skills?:string[]|null};
type ProjectRow=Record<string,unknown>&{project_roles?:RoleRow[]|null;project_capabilities?:unknown[]|null};

function slugify(value:string){return value.trim().toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function cleanSkill(value:string){return value.trim().replace(/[.]+$/,'').replace(/\s+/g,' ')}
function enrichDiscoveryFacets(row:ProjectRow){
  const roles=Array.isArray(row.project_roles)?row.project_roles:[];
  const roleMap=new Map<string,{project_role_catalogue:{slug:string;title:string}}>();
  const skillMap=new Map<string,{capabilities:{id:string;slug:string;name:string}}>();
  for(const role of roles){
    const title=String(role.title||'').trim();
    const key=String(role.canonical_role_key||'').trim();
    const slug=slugify(key||title);
    if(slug&&title&&!roleMap.has(slug))roleMap.set(slug,{project_role_catalogue:{slug,title}});
    for(const raw of Array.isArray(role.skills)?role.skills:[]){const name=cleanSkill(String(raw));const skillSlug=slugify(name);if(skillSlug&&!skillMap.has(skillSlug))skillMap.set(skillSlug,{capabilities:{id:`role-skill:${skillSlug}`,slug:skillSlug,name}})}
  }
  const canonicalCapabilities=Array.isArray(row.project_capabilities)?row.project_capabilities:[];
  return {...row,project_role_families:[...roleMap.values()],project_capabilities:canonicalCapabilities.length?canonicalCapabilities:[...skillMap.values()]};
}
function query(db:PublicDb,select:string,from:number,to:number){return db.from('projects').select(select).in('status',PROJECT_STATUSES).eq('visibility','public').order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,to)}
async function all(db:PublicDb,select:string){let from=0;const rows:unknown[]=[];let last:Awaited<ReturnType<typeof query>>|null=null;while(true){const result=await query(db,select,from,from+BATCH_SIZE-1);last=result;if(result.error)return result;const batch=(result.data||[]) as unknown[];rows.push(...batch);if(batch.length<BATCH_SIZE)break;from+=BATCH_SIZE}return last?{...last,data:rows}:query(db,select,0,BATCH_SIZE-1)}
function enriched<T extends {data:unknown[]|null}>(result:T):T{return {...result,data:(result.data||[]).map(row=>enrichDiscoveryFacets(row as ProjectRow))} as T}

export async function loadPublicProjectCatalogue(db:PublicDb){const primary=await all(db,PRIMARY_SELECT);if(!primary.error)return enriched(primary);console.warn('public Projects enriched query failed; retrying core facets',primary.error.message);const core=await all(db,CORE_SELECT);if(!core.error)return enriched(core);console.warn('public Projects core query failed; retrying scalar fields',core.error.message);return all(db,MINIMAL_SELECT)}
