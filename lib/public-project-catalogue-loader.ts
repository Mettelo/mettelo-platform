import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {normalizeCareerRole,normalizeCapability} from '@/lib/project-catalogue-taxonomy';

const PROJECT_STATUSES=['pilot','recruiting','open','forming','active','review','completed'];
const BATCH_SIZE=200;
const PROJECT_FIELDS='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at';
const PRIMARY_SELECT=`${PROJECT_FIELDS},project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_capabilities(capabilities(id,slug,name)),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;
const CORE_SELECT=`${PROJECT_FIELDS},project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;
const LEGACY_PROJECT_FIELDS='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at';
const LEGACY_PRIMARY_SELECT=`${LEGACY_PROJECT_FIELDS},project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_capabilities(capabilities(id,slug,name)),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;
const LEGACY_CORE_SELECT=`${LEGACY_PROJECT_FIELDS},project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;
const LEGACY_MINIMAL_SELECT=LEGACY_PROJECT_FIELDS;

type PublicDb=NonNullable<ReturnType<typeof createPublicSupabaseClient>>;
type RoleRow={title?:string|null;canonical_role_key?:string|null;skills?:string[]|null};
type ProjectRow=Record<string,unknown>&{project_roles?:RoleRow[]|null;project_capabilities?:unknown[]|null};

function cleanSkill(value:string){return value.trim().replace(/[.]+$/,'').replace(/\s+/g,' ')}
function enrichDiscoveryFacets(row:ProjectRow){
  const roles=Array.isArray(row.project_roles)?row.project_roles:[];
  const roleMap=new Map<string,{project_role_catalogue:{slug:string;title:string}}>();
  const skillMap=new Map<string,{capabilities:{id:string;slug:string;name:string}}>();
  for(const role of roles){
    // Project-facing titles remain untouched. Career / Role receives only values
    // that exactly resolve to the controlled career taxonomy. Imported per-project
    // identifiers may resolve if they are genuinely canonical; granular titles do not.
    const canonical=normalizeCareerRole(role.title)||normalizeCareerRole(role.canonical_role_key);
    if(canonical&&!roleMap.has(canonical.slug))roleMap.set(canonical.slug,{project_role_catalogue:{slug:canonical.slug,title:canonical.label}});
    for(const raw of Array.isArray(role.skills)?role.skills:[]){
      const name=cleanSkill(String(raw));
      const capability=normalizeCapability(name);
      if(capability&&!skillMap.has(capability.slug))skillMap.set(capability.slug,{capabilities:{id:`role-skill:${capability.slug}`,slug:capability.slug,name:capability.label}});
    }
  }
  const canonicalCapabilities=Array.isArray(row.project_capabilities)?row.project_capabilities:[];
  return {...row,project_role_families:[...roleMap.values()],project_capabilities:canonicalCapabilities.length?canonicalCapabilities:[...skillMap.values()]};
}
function query(db:PublicDb,select:string,from:number,to:number){return db.from('projects').select(select).in('status',PROJECT_STATUSES).eq('visibility','public').order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,to)}
async function all(db:PublicDb,select:string){let from=0;const rows:unknown[]=[];let last:Awaited<ReturnType<typeof query>>|null=null;while(true){const result=await query(db,select,from,from+BATCH_SIZE-1);last=result;if(result.error)return result;const batch=(result.data||[]) as unknown[];rows.push(...batch);if(batch.length<BATCH_SIZE)break;from+=BATCH_SIZE}return last?{...last,data:rows}:query(db,select,0,BATCH_SIZE-1)}
function enriched<T extends {data:unknown[]|null}>(result:T):T{return {...result,data:(result.data||[]).map(row=>enrichDiscoveryFacets(row as ProjectRow))} as T}

export async function loadPublicProjectCatalogue(db:PublicDb){
  const primary=await all(db,PRIMARY_SELECT);
  if(!primary.error)return enriched(primary);
  // Phase 4 is stacked on the Phase 3 schema, but the public loader retains a
  // compatibility path so previews against an older hosted database fail soft
  // rather than hiding the entire catalogue.
  console.warn('public Projects canonical query failed; retrying legacy public projection',primary.error.message);
  const legacyPrimary=await all(db,LEGACY_PRIMARY_SELECT);
  if(!legacyPrimary.error)return enriched(legacyPrimary);
  const core=await all(db,CORE_SELECT);
  if(!core.error)return enriched(core);
  console.warn('public Projects enriched query failed; retrying core facets',core.error.message);
  const legacyCore=await all(db,LEGACY_CORE_SELECT);
  if(!legacyCore.error)return enriched(legacyCore);
  console.warn('public Projects core query failed; retrying scalar fields',legacyCore.error.message);
  return all(db,LEGACY_MINIMAL_SELECT);
}
