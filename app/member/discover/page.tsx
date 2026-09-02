import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {loadProjectRoleUsageBulk,type RoleUsage} from '@/lib/project-role-capacity';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import MemberDiscoverCatalogue from '@/components/MemberDiscoverCatalogue';
import MemberDiscoverPagination from '@/components/MemberDiscoverPagination';
import MemberCapabilityPathFilters from '@/components/MemberCapabilityPathFilters';
import MemberPageHeader from '@/components/MemberPageHeader';
import {memberProjectCatalogueAction,memberProjectStateLabel,projectAcceptsApplications,resolveMemberProjectState} from '@/lib/member-project-journey';
import {resolveProjectPublicAvailability} from '@/lib/project-public-availability';
import {getMemberCapabilityPathProgress,getMemberProjectPathContexts} from '@/lib/member-capability-paths';
import {normalizeCommitment,projectStageFacet,projectTypeFacet,workingModelFacet,type CatalogueFacet} from '@/lib/project-catalogue-filtering';

export const dynamic='force-dynamic';

type Role={id:string;title:string;skills:string[]|null;openings:number};
type RoleFamilyRelation={project_role_catalogue:{slug:string;title:string}|{slug:string;title:string}[]|null};
type CapabilityRelation={capabilities:{id:string;slug:string;name:string}|{id:string;slug:string;name:string}[]|null};
type DomainRelation={domains:{slug:string;name:string}|{slug:string;name:string}[]|null};
type ToolRelation={tools:{slug:string;name:string}|{slug:string;name:string}[]|null};
type MethodRelation={methods:{slug:string;name:string}|{slug:string;name:string}[]|null};
type Project={id:string;slug:string;title:string;summary:string;status:string;project_type:string|null;location:string|null;location_type:string|null;duration_weeks:number|null;weekly_commitment:string|null;application_deadline:string|null;applications_open:boolean|null;created_at:string;project_roles:Role[]|null;project_role_families:RoleFamilyRelation[]|null;project_capabilities:CapabilityRelation[]|null;project_domains:DomainRelation[]|null;project_tools:ToolRelation[]|null;project_methods:MethodRelation[]|null};
type Application={id:string;project_id:string;status:string;project_run_id:string|null};
type Membership={project_id:string;project_run_id:string|null;membership_status:string;project_runs:{status:string}|null};
type Saved={project_id:string};
type Alias={alias:string;capability_id:string};
type Search={path?:string|string[];stage?:string|string[]};

function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}
function relationOne<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}
function uniqueFacets(values:CatalogueFacet[]){const map=new Map<string,CatalogueFacet>();for(const item of values)if(!map.has(item.slug))map.set(item.slug,item);return[...map.values()].sort((a,b)=>a.label.localeCompare(b.label))}

export default async function MemberDiscoverPage({searchParams}:{searchParams?:Promise<Search>}){
  const params=await searchParams||{};
  const selectedPath=one(params.path),selectedStage=one(params.stage);
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Fdiscover');

  const [profileResult,domainPrefs,toolPrefs,projectsResult,applicationsResult,membershipsResult,savedResult,pathProgress,capabilityAliasesResult]=await Promise.all([
    supabase.from('profiles').select('full_name,headline,current_job_title,professional_area,bio,location,experience_level,employment_status,project_availability,weekly_capacity,primary_goal,linkedin_url,github_url,portfolio_url,skills,preferred_roles').eq('id',user.id).maybeSingle(),
    supabase.from('profile_domain_preferences').select('domain_id').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tool_id').eq('user_id',user.id),
    supabase.from('projects').select('id,slug,title,summary,status,project_type,location,location_type,duration_weeks,weekly_commitment,application_deadline,applications_open,created_at,project_roles(id,title,skills,openings),project_role_families(project_role_catalogue(slug,title)),project_capabilities(capabilities(id,slug,name)),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))').in('visibility',['public','members']).in('status',['pilot','recruiting','open','forming','active','review','completed']).order('created_at',{ascending:false}).limit(200),
    supabase.from('project_applications').select('id,project_id,status,project_run_id').eq('user_id',user.id).eq('application_kind','application').order('submitted_at',{ascending:false}),
    supabase.from('project_members').select('project_id,project_run_id,membership_status,project_runs(status)').eq('user_id',user.id).in('membership_status',['waiting','active','completed']),
    supabase.from('saved_projects').select('project_id').eq('user_id',user.id),
    getMemberCapabilityPathProgress(supabase,user.id),
    supabase.from('capability_aliases').select('alias,capability_id')
  ]);

  if(projectsResult.error)console.error('member Discover project query failed',projectsResult.error);
  if(capabilityAliasesResult.error)console.error('member Discover capability alias query failed',capabilityAliasesResult.error);
  const profile=profileResult.data as Record<string,unknown>|null;
  const memberReadiness=calculateMemberReadiness({profile:profile||{},domainCount:domainPrefs.data?.length||0,toolCount:toolPrefs.data?.length||0});
  const applicationReady=memberReadiness.applicationReadiness.ready;
  const projects=(projectsResult.data||[]) as unknown as Project[];
  const applications=(applicationsResult.data||[]) as unknown as Application[];
  const memberships=(membershipsResult.data||[]) as unknown as Membership[];
  const saved=new Set(((savedResult.data||[]) as Saved[]).map(row=>row.project_id));
  const aliasesByCapability=new Map<string,string[]>();
  for(const row of (capabilityAliasesResult.data||[]) as Alias[]){const current=aliasesByCapability.get(row.capability_id)||[];current.push(row.alias);aliasesByCapability.set(row.capability_id,current)}
  const latestApplication=new Map<string,Application>();
  for(const item of applications){if(!latestApplication.has(item.project_id))latestApplication.set(item.project_id,item)}
  const membershipByProject=new Map(memberships.map(item=>[item.project_id,item]));
  const db=serviceDb();
  let usageByProject=new Map<string,RoleUsage>();
  if(db&&projects.length)usageByProject=await loadProjectRoleUsageBulk(db,projects.map(project=>({id:project.id,project_type:project.project_type})));
  const pathContexts=await getMemberProjectPathContexts(supabase,user.id,projects.map(item=>item.id));
  const items=projects.flatMap(project=>{
    const contexts=pathContexts.get(project.id)||[];
    if(selectedPath&&!contexts.some(context=>context.pathSlug===selectedPath&&(!selectedStage||context.stageName===selectedStage)))return [];
    const usage=usageByProject.get(project.id)||{known:false,filled:new Map<string,number>()};
    const availabilityKnown=usage.known;
    const roles=project.project_roles||[];
    const availableRoles=roles.filter(role=>availabilityKnown?((usage.filled.get(role.id)||0)<role.openings):true);
    const roleCount=roles.reduce((sum,role)=>sum+Math.max(0,Number(role.openings)||0),0);
    const occupiedRoleCount=roles.reduce((sum,role)=>sum+Math.min(Math.max(0,Number(role.openings)||0),usage.filled.get(role.id)||0),0);
    const sharedAvailability=resolveProjectPublicAvailability({status:project.status,project_type:project.project_type||'open',application_deadline:project.application_deadline,applications_open:project.applications_open,role_count:roleCount,occupied_role_count:occupiedRoleCount,capacity_known:availabilityKnown});
    const application=latestApplication.get(project.id)||null;
    const membership=membershipByProject.get(project.id)||null;
    const run=membership?.project_runs||null;
    const state=resolveMemberProjectState({project,application,membership,run,applicationReady,hasAvailableRole:sharedAvailability.available&&availableRoles.length>0,roleAvailabilityKnown:availabilityKnown});
    const displayRoles=projectAcceptsApplications(project)&&availabilityKnown?availableRoles:roles;
    const roleFamilies=uniqueFacets((project.project_role_families||[]).flatMap(row=>{const value=relationOne(row.project_role_catalogue);return value?[{slug:value.slug,label:value.title}]:[]}));
    const capabilities=uniqueFacets((project.project_capabilities||[]).flatMap(row=>{const value=relationOne(row.capabilities);return value?[{slug:value.slug,label:value.name,aliases:aliasesByCapability.get(value.id)||[]}]:[]}));
    const domains=uniqueFacets((project.project_domains||[]).flatMap(row=>{const value=relationOne(row.domains);return value?[{slug:value.slug,label:value.name}]:[]}));
    const tools=uniqueFacets((project.project_tools||[]).flatMap(row=>{const value=relationOne(row.tools);return value?[{slug:value.slug,label:value.name}]:[]}));
    const methods=uniqueFacets((project.project_methods||[]).flatMap(row=>{const value=relationOne(row.methods);return value?[{slug:value.slug,label:value.name}]:[]}));
    const primaryContext=contexts.find(context=>context.isPrimary)||contexts[0]||null;
    return [{
      id:project.id,title:project.title,summary:project.summary,state,stateLabel:memberProjectStateLabel(state),action:memberProjectCatalogueAction(state,project.id),saved:saved.has(project.id),
      workingModel:project.location_type||project.location||null,durationWeeks:project.duration_weeks,commitment:project.weekly_commitment,deadline:project.application_deadline,createdAt:project.created_at,
      roles:displayRoles.map(role=>role.title),roleFamilies,capabilities,domains,tools,methods,
      commitmentFacet:normalizeCommitment(project.weekly_commitment),workingModelFacet:workingModelFacet(project.location_type),projectTypeFacet:projectTypeFacet(project.project_type),stageFacet:projectStageFacet(project.status),
      pathContext:primaryContext?{name:primaryContext.pathName,position:primaryContext.position,stage:primaryContext.stageName,isPrimary:primaryContext.isPrimary}:null
    }];
  });

  const pathAction=<a className="mdButton mdDiscoverTopAction" href="/member/paths">{pathProgress.length?'Manage Paths':'Explore Paths'}</a>;
  return <div className="mdDiscoverPage">
    <MemberPageHeader eyebrow="DIRECTION & DISCOVERY · PROJECTS" title="Discover projects" description="Explore the full project catalogue. Use a Capability Path when you want direction, without limiting what you can discover." actions={<>{pathAction}<a className="mdButton mdDiscoverTopAction" href="/member/recommended">Recommended for you</a></>}/>
    <div className="mdDiscoverControlStack">
      {pathProgress.length?<MemberCapabilityPathFilters paths={pathProgress} selectedPath={selectedPath} selectedStage={selectedStage}/>:<aside className="mdPathPrompt"><div><strong>Want a clearer route through the catalogue?</strong><span>Follow a Capability Path to add sequence and stage context while keeping Discover broad.</span></div><a href="/member/paths">Explore Paths →</a></aside>}
      {projectsResult.error?<section className="mdDiscoverError" role="alert"><h2>Projects are temporarily unavailable</h2><p>Nothing has been changed. Refresh this page to try the member catalogue again.</p><a className="mdButton mdButtonPrimary" href="/member/discover">Try again</a></section>:<><MemberDiscoverCatalogue projects={items}/><MemberDiscoverPagination/></>}
    </div>
    <style>{`
      .mdDiscoverPage{width:min(100%,1240px);margin:0;min-width:0;color:#111318}.mdDiscoverControlStack{margin-top:18px}.mdDiscoverTopAction{white-space:nowrap}.mdDiscoverError{margin-top:20px;padding:22px;border:1px solid #d8dde3;border-radius:14px;background:#fff}.mdDiscoverError h2{margin:0 0 6px}.mdDiscoverError p{margin:0 0 14px;color:#59636f}.mdPathPrompt{margin:0 0 14px;padding:13px 15px;border:1px solid #ded6c8;border-radius:14px;background:#fbf7ee;display:flex;justify-content:space-between;gap:18px;align-items:center}.mdPathPrompt>div{display:grid;gap:3px}.mdPathPrompt strong{font-size:12px}.mdPathPrompt span{color:#59636f;font-size:11px;line-height:1.45}.mdPathPrompt a{min-height:44px;display:inline-flex;align-items:center;color:#8b5a17;font-size:11px;font-weight:800;white-space:nowrap}.mdPathPrompt a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:680px){.mdDiscoverControlStack{margin-top:14px}.mdDiscoverTopAction{white-space:normal;text-align:center}.mdPathPrompt{display:grid}.mdPathPrompt a{white-space:normal}}
    `}</style>
  </div>;
}
