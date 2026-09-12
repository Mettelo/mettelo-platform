import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import {loadMemberDiscoverProjects} from '@/lib/member-discover-project-loader';
import MemberDiscoverCatalogue from '@/components/MemberDiscoverCatalogue';
import MemberDiscoverPagination from '@/components/MemberDiscoverPagination';
import MemberCapabilityPathFilters from '@/components/MemberCapabilityPathFilters';
import MemberPageHeader from '@/components/MemberPageHeader';
import DiscoverFilterEscapeBridge from '@/components/DiscoverFilterEscapeBridge';
import {memberProjectCatalogueAction,memberProjectStateLabel,resolveMemberProjectState} from '@/lib/member-project-journey';
import {getMemberCapabilityPathProgress,getMemberProjectPathContexts} from '@/lib/member-capability-paths';
import {normalizeCommitment,normalizeExperienceLevel,projectAvailabilityFacet,projectParticipationFacet,projectStageFacet,projectTypeFacet,workingModelFacet,type CatalogueFacet} from '@/lib/project-catalogue-filtering';
import {normalizeCareerRole} from '@/lib/project-catalogue-taxonomy';

export const dynamic='force-dynamic';

type Role={id:string;title:string;canonical_role_key:string|null;skills:string[]|null;openings:number};
type RoleFamilyRelation={project_role_catalogue:{slug:string;title:string}|{slug:string;title:string}[]|null};
type CapabilityRelation={capabilities:{id:string;slug:string;name:string}|{id:string;slug:string;name:string}[]|null};
type DomainRelation={domains:{slug:string;name:string}|{slug:string;name:string}[]|null};
type ToolRelation={tools:{slug:string;name:string}|{slug:string;name:string}[]|null};
type MethodRelation={methods:{slug:string;name:string}|{slug:string;name:string}[]|null};
type Project={id:string;slug:string;title:string;summary:string;status:string;project_type:string|null;location:string|null;location_type:string|null;difficulty_level:string|null;participation_mode:'solo'|'team'|'flexible'|null;min_team_size:number|null;target_team_size:number|null;max_team_size:number|null;team_size_threshold:number|null;duration_weeks:number|null;weekly_commitment:string|null;application_deadline:string|null;applications_open:boolean|null;created_at:string;project_roles:Role[]|null;project_role_families?:RoleFamilyRelation[]|null;project_capabilities?:CapabilityRelation[]|null;project_domains?:DomainRelation[]|null;project_tools?:ToolRelation[]|null;project_methods?:MethodRelation[]|null};
type Application={id:string;project_id:string;status:string;project_run_id:string|null;application_kind:string};
type Membership={project_id:string;project_run_id:string|null;membership_status:string;project_runs:{status:string}|null};
type Capacity={project_id:string;participation_mode:'solo'|'team'|'flexible'|null;confirmed_members:number;reserved_members:number;occupied_places:number;min_team_size:number|null;target_team_size:number|null;max_team_size:number|null;capacity_available:boolean;recruitment_state:string};
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
    loadMemberDiscoverProjects(supabase),
    supabase.from('project_applications').select('id,project_id,status,project_run_id,application_kind').eq('user_id',user.id).in('application_kind',['application','interest']).order('submitted_at',{ascending:false}),
    supabase.from('project_members').select('project_id,project_run_id,membership_status,project_runs(status)').eq('user_id',user.id).in('membership_status',['waiting','active','completed']),
    supabase.from('saved_projects').select('project_id').eq('user_id',user.id),
    getMemberCapabilityPathProgress(supabase,user.id),
    supabase.from('capability_aliases').select('alias,capability_id')
  ]);

  if(projectsResult.error)console.error('member Discover canonical project query failed',projectsResult.error);
  if(capabilityAliasesResult.error)console.warn('member Discover capability aliases unavailable; continuing without aliases',capabilityAliasesResult.error.message);
  const profile=profileResult.data as Record<string,unknown>|null;
  const memberReadiness=calculateMemberReadiness({profile:profile||{},domainCount:domainPrefs.data?.length||0,toolCount:toolPrefs.data?.length||0});
  const applicationReady=memberReadiness.applicationReadiness.ready;
  const projects=(projectsResult.data||[]) as unknown as Project[];
  const applications=(applicationsResult.data||[]) as unknown as Application[];
  const memberships=(membershipsResult.data||[]) as unknown as Membership[];
  const saved=new Set(((savedResult.data||[]) as Saved[]).map(row=>row.project_id));
  const aliasesByCapability=new Map<string,string[]>();
  for(const row of (capabilityAliasesResult.data||[]) as Alias[]){const current=aliasesByCapability.get(row.capability_id)||[];current.push(row.alias);aliasesByCapability.set(row.capability_id,current)}
  const latestActiveApplication=new Map<string,Application>();
  for(const item of applications){if(['declined','withdrawn'].includes(item.status))continue;if(!latestActiveApplication.has(item.project_id))latestActiveApplication.set(item.project_id,item)}
  const membershipByProject=new Map(memberships.map(item=>[item.project_id,item]));
  const capacityResult=projects.length?await supabase.rpc('get_member_project_capacities',{p_project_ids:projects.map(project=>project.id)}):{data:[],error:null};
  const capacityByProject=new Map(((capacityResult.data||[]) as Capacity[]).map(item=>[item.project_id,item]));
  const capacityLoadError=Boolean(capacityResult.error)||projects.some(project=>!capacityByProject.has(project.id));
  if(capacityResult.error)console.error('member Discover canonical capacity query failed',capacityResult.error);
  const pathContexts=await getMemberProjectPathContexts(supabase,user.id,projects.map(item=>item.id));
  const items=projects.flatMap(project=>{
    const contexts=pathContexts.get(project.id)||[];
    if(selectedPath&&!contexts.some(context=>context.pathSlug===selectedPath&&(!selectedStage||context.stageName===selectedStage)))return [];
    const capacity=capacityByProject.get(project.id);
    if(!capacity)return[];
    const roles=project.project_roles||[];
    const application=latestActiveApplication.get(project.id)||null;
    const membership=membershipByProject.get(project.id)||null;
    const run=membership?.project_runs||null;
    const state=resolveMemberProjectState({project,application,membership,run,applicationReady,capacityAvailable:capacity.capacity_available,capacityKnown:true});
    const displayRoleTitles=roles.map(role=>role.title);
    const relationRoles=(project.project_role_families||[]).flatMap(row=>{const value=relationOne(row.project_role_catalogue);const canonical=value?(normalizeCareerRole(value.slug)||normalizeCareerRole(value.title)):null;return canonical?[canonical]:[]});
    const roleFamilies=uniqueFacets([...relationRoles,...roles.flatMap(role=>{const canonical=normalizeCareerRole(role.canonical_role_key);return canonical?[canonical]:[]})]);
    const capabilities=uniqueFacets((project.project_capabilities||[]).flatMap(row=>{const value=relationOne(row.capabilities);return value?[{slug:value.slug,label:value.name,aliases:aliasesByCapability.get(value.id)||[]}]:[]}));
    const domains=uniqueFacets((project.project_domains||[]).flatMap(row=>{const value=relationOne(row.domains);return value?[{slug:value.slug,label:value.name}]:[]}));
    const tools=uniqueFacets((project.project_tools||[]).flatMap(row=>{const value=relationOne(row.tools);return value?[{slug:value.slug,label:value.name}]:[]}));
    const methods=uniqueFacets((project.project_methods||[]).flatMap(row=>{const value=relationOne(row.methods);return value?[{slug:value.slug,label:value.name}]:[]}));
    const primaryContext=contexts.find(context=>context.isPrimary)||contexts[0]||null;
    const workFacet=workingModelFacet(project.location_type);
    return [{
      id:project.id,title:project.title,summary:project.summary,state,stateLabel:memberProjectStateLabel(state),action:memberProjectCatalogueAction(state,project.id),saved:saved.has(project.id),
      workingModel:workFacet?.label||project.location||null,durationWeeks:project.duration_weeks,commitment:project.weekly_commitment,deadline:project.application_deadline,createdAt:project.created_at,
      roles:displayRoleTitles,roleFamilies,capabilities,domains,tools,methods,
      experienceFacet:normalizeExperienceLevel(project.difficulty_level),formatFacet:projectParticipationFacet(project.participation_mode,project.team_size_threshold),commitmentFacet:normalizeCommitment(project.weekly_commitment),workingModelFacet:workFacet,projectTypeFacet:projectTypeFacet(project.project_type),availabilityFacet:projectAvailabilityFacet({status:project.status,applicationsOpen:capacity.capacity_available,deadline:project.application_deadline,hasCapacity:capacity.capacity_available}),stageFacet:projectStageFacet(project.status),
      searchExtra:[...displayRoleTitles,primaryContext?.pathName||'',primaryContext?.stageName||'',capacity.recruitment_state],
      pathContext:primaryContext?{name:primaryContext.pathName,position:primaryContext.position,stage:primaryContext.stageName,isPrimary:primaryContext.isPrimary}:null
    }];
  });

  const pathAction=<a className="mdButton mdDiscoverTopAction" href="/member/paths">{pathProgress.length?'Manage Paths':'Explore Paths'}</a>;
  return <div className="mdDiscoverPage">
    <DiscoverFilterEscapeBridge/>
    <MemberPageHeader eyebrow="DIRECTION & DISCOVERY · PROJECTS" title="Discover projects" description="Scan projects quickly, then open the brief when one is worth deeper review. Capability Paths can add direction without restricting discovery." actions={<>{pathAction}<a className="mdButton mdDiscoverTopAction" href="/member/recommended">Recommended for you</a></>}/>
    <div className="mdDiscoverControlStack">
      {pathProgress.length?<MemberCapabilityPathFilters paths={pathProgress} selectedPath={selectedPath} selectedStage={selectedStage}/>:<aside className="mdPathPrompt"><div><strong>Want a clearer route through the catalogue?</strong><span>Follow a Capability Path to add sequence and stage context while keeping Discover broad.</span></div><a href="/member/paths">Explore Paths →</a></aside>}
      {projectsResult.error||capacityLoadError?<section className="mdDiscoverError" role="alert"><h2>Projects are temporarily unavailable</h2><p>Canonical project or capacity state could not be resolved safely. Nothing has been changed. Refresh to try again.</p><a className="mdButton mdButtonPrimary" href="/member/discover">Try again</a></section>:<><MemberDiscoverCatalogue projects={items}/><MemberDiscoverPagination/></>}
    </div>
    <style>{`
      .mdDiscoverPage{width:100%;max-width:none;margin:0;min-width:0;color:var(--ink)}
      .mdDiscoverControlStack{margin-top:18px}.mdDiscoverTopAction{white-space:nowrap}
      .mdDiscoverPage .mdButtonPrimary{background:var(--ink);border-color:var(--ink);color:var(--white)}
      .mdDiscoverPage .mdButton:not(.mdButtonPrimary){border-color:#cfc7ba;background:var(--white);color:var(--ink)}
      .mdDiscoverPage .mdButton:hover{border-color:var(--bronze);background:var(--sand);color:var(--bronze-deep)}
      .mdDiscoverPage .mdControlsV2{margin-top:10px;padding:14px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 8px 24px rgba(16,19,29,.03)}
      .mdDiscoverPage .mdSearchV2{border-color:#cfc7ba;background:var(--paper)}
      .mdDiscoverPage .mdProjectGrid{gap:16px;align-items:stretch}
      .mdDiscoverPage .mdProjectCard{border-color:var(--line);border-radius:18px;padding:18px;min-height:430px;max-height:465px;overflow:hidden;box-shadow:0 9px 25px rgba(16,19,29,.035);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}
      .mdDiscoverPage .mdProjectCard:hover{transform:translateY(-2px);border-color:#d7c59f;box-shadow:0 15px 34px rgba(16,19,29,.07)}
      .mdDiscoverPage .mdProjectCard h2{font-size:20px;line-height:1.16;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;min-height:46px;margin-top:10px}
      .mdDiscoverPage .mdProjectCard>p{max-width:68ch;color:var(--slate);line-height:1.5;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;min-height:57px;max-height:57px}
      .mdDiscoverPage .mdProjectCard .mdFacts{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:12px}
      .mdDiscoverPage .mdProjectCard .mdFacts>div:first-child:nth-last-child(3){display:none}
      .mdDiscoverPage .mdProjectCard .mdGroup{margin-top:11px}
      .mdDiscoverPage .mdProjectCard .mdGroup:has(.mdSkill){display:none}
      .mdDiscoverPage .mdProjectCard .mdTags{gap:5px;margin-top:6px;max-height:58px;overflow:hidden}
      .mdDiscoverPage .mdProjectCard .mdTag{padding:5px 8px;font-size:9.5px}
      .mdDiscoverPage .mdProjectCard .mdDeadline{margin-top:11px;padding-top:10px}
      .mdDiscoverPage .mdProjectCard .mdCardActions{padding-top:12px}
      .mdDiscoverPage .mdCardOpen{background:linear-gradient(135deg,var(--white),var(--sand-2))}
      .mdDiscoverPage .mdEyebrow,.mdDiscoverPage .mdLabel,.mdDiscoverPage .mdPathContext>span:first-child{color:var(--bronze-deep)}
      .mdDiscoverPage .mdPathContext strong{color:var(--indigo)}
      .mdDiscoverPage .mdActiveChipV2{background:var(--sand);border-color:#dcc18f;color:var(--bronze-deep)}
      .mdDiscoverPage .mdCatalogueHead{padding:0 2px;margin-top:20px}
      .mdDiscoverPage .mdCatalogueHead strong{font-size:14px}
      .mdDiscoverPage .mdRecommended{background:linear-gradient(135deg,var(--sand),var(--sand-2));border-color:#dfd1b5;border-radius:18px;padding:22px}
      .mdDiscoverError{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:14px;background:var(--white)}.mdDiscoverError h2{margin:0 0 6px}.mdDiscoverError p{margin:0 0 14px;color:var(--slate)}
      .mdPathPrompt{margin:0 0 14px;padding:15px 17px;border:1px solid #ded6c8;border-radius:14px;background:var(--sand-2);display:flex;justify-content:space-between;gap:18px;align-items:center}.mdPathPrompt>div{display:grid;gap:3px}.mdPathPrompt strong{font-size:12px}.mdPathPrompt span{color:var(--slate);font-size:11px;line-height:1.45}.mdPathPrompt a{min-height:44px;display:inline-flex;align-items:center;color:var(--bronze-deep);font-size:11px;font-weight:800;white-space:nowrap}.mdPathPrompt a:focus-visible{outline:3px solid var(--indigo);outline-offset:3px}
      @media(min-width:1500px){.mdDiscoverPage .mdProjectGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:900px){.mdDiscoverPage .mdControlsV2{padding:13px}.mdDiscoverPage .mdProjectCard{padding:17px;min-height:410px;max-height:445px}}
      @media(max-width:680px){.mdDiscoverControlStack{margin-top:14px}.mdDiscoverTopAction{white-space:normal;text-align:center}.mdPathPrompt{display:grid}.mdPathPrompt a{white-space:normal}.mdDiscoverPage .mdControlsV2{padding:11px;border-radius:13px}.mdDiscoverPage .mdProjectCard{padding:16px;border-radius:15px;min-height:0;max-height:none}.mdDiscoverPage .mdProjectCard:hover{transform:none}.mdDiscoverPage .mdProjectCard h2{min-height:0}.mdDiscoverPage .mdProjectCard>p{min-height:0}}
      @media(prefers-reduced-motion:reduce){.mdDiscoverPage .mdProjectCard{transition:none}.mdDiscoverPage .mdProjectCard:hover{transform:none}}
    `}</style>
  </div>;
}
