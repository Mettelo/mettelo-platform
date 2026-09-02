import {createServerSupabaseClient} from '@/lib/supabase/server';

const PROJECT_STATUSES=['pilot','recruiting','open','forming','active','review','completed'];
const PRIMARY_SELECT='id,slug,title,summary,status,project_type,location,location_type,duration_weeks,weekly_commitment,application_deadline,applications_open,created_at,project_roles(id,title,skills,openings),project_role_families(project_role_catalogue(slug,title)),project_capabilities(capabilities(id,slug,name)),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))';
const CORE_FACET_SELECT='id,slug,title,summary,status,project_type,location,location_type,duration_weeks,weekly_commitment,application_deadline,applications_open,created_at,project_roles(id,title,skills,openings),project_capabilities(capabilities(id,slug,name)),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))';
const MINIMAL_SELECT='id,slug,title,summary,status,project_type,location,location_type,duration_weeks,weekly_commitment,application_deadline,applications_open,created_at,project_roles(id,title,skills,openings)';

type MemberServerDb=Awaited<ReturnType<typeof createServerSupabaseClient>>;

function projectQuery(db:MemberServerDb,select:string){
  return db.from('projects').select(select).in('visibility',['public','members']).in('status',PROJECT_STATUSES).order('created_at',{ascending:false}).limit(200);
}

export async function loadMemberDiscoverProjects(db:MemberServerDb){
  const primary=await projectQuery(db,PRIMARY_SELECT);
  if(!primary.error)return primary;
  console.warn('member Discover enriched project query failed; retrying without optional role-family catalogue relation',primary.error.message);

  const core=await projectQuery(db,CORE_FACET_SELECT);
  if(!core.error)return core;
  console.warn('member Discover core-facet project query failed; retrying canonical project and role fields only',core.error.message);

  return projectQuery(db,MINIMAL_SELECT);
}
