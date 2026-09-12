import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {normalizeCareerRole,normalizeCapability} from '@/lib/project-catalogue-taxonomy';

const PROJECT_STATUSES=['pilot','recruiting','open','forming','active','review','completed'];
const BATCH_SIZE=200;
const PROJECT_FIELDS='id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at';
const PRIMARY_SELECT=`${PROJECT_FIELDS},project_roles(id,title,discipline,openings,canonical_role_key,skills),project_runs(id,run_number,status,completed_at),project_capabilities(capabilities(id,slug,name)),project_domains(is_primary,domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))`;

type PublicDb=NonNullable<ReturnType<typeof createPublicSupabaseClient>>;
type RoleRow={title?:string|null;canonical_role_key?:string|null;skills?:string[]|null};
type ProjectRow=Record<string,unknown>&{project_roles?:RoleRow[]|null;project_capabilities?:unknown[]|null};

function cleanSkill(value:string){return value.trim().replace(/[.]+$/,'').replace(/\s+/g,' ')}
function enrichDiscoveryFacets(row:ProjectRow){
  const roles=Array.isArray(row.project_roles)?row.project_roles:[];
  const roleMap=new Map<string,{project_role_catalogue:{slug:string;title:string}}>();
  const skillMap=new Map<string,{capabilities:{id:string;slug:string;name:string}}>();
  for(const role of roles){
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
function query(db:PublicDb,from:number,to:number){return db.from('projects').select(PRIMARY_SELECT).in('status',PROJECT_STATUSES).eq('visibility','public').order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,to)}

export async function loadPublicProjectCatalogue(db:PublicDb){
  let from=0;const rows:unknown[]=[];let last:Awaited<ReturnType<typeof query>>|null=null;
  while(true){
    const result=await query(db,from,from+BATCH_SIZE-1);last=result;
    if(result.error){
      console.error('public Projects canonical query failed; refusing stale fallback projection',result.error.message);
      return result;
    }
    const batch=(result.data||[]) as unknown[];rows.push(...batch);
    if(batch.length<BATCH_SIZE)break;
    from+=BATCH_SIZE;
  }
  const result=last?{...last,data:rows}:await query(db,0,BATCH_SIZE-1);
  return {...result,data:(result.data||[]).map(row=>enrichDiscoveryFacets(row as ProjectRow))};
}
