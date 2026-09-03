import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {loadProjectRoleUsage} from '@/lib/project-role-capacity';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import {memberProjectPrimaryAction,memberProjectStateCopy,memberProjectStateLabel,resolveMemberProjectState} from '@/lib/member-project-journey';
import {getProjectDetailContent} from '@/lib/project-detail-content';
import {getProjectExperiencePlanning} from '@/lib/project-experience-data';
import {buildProjectExperienceModel} from '@/lib/project-experience-model';
import {getProjectExperienceRoleDetails} from '@/lib/project-experience-role-data';
import MemberProjectDetailV2 from '@/components/project-experience/MemberProjectDetailV2';
import polish from '@/components/project-experience/ProjectExperiencePolish.module.css';

export const dynamic='force-dynamic';

type Role={id:string;title:string;description:string|null;skills:string[]|null;openings:number;discipline:string|null;canonical_role_key:string|null};
type TaxonomyRef={slug:string;name:string};
type RoleFamilyCatalogue={slug:string;title:string;description:string|null};
type RoleFamilyRelation={project_role_catalogue:RoleFamilyCatalogue|RoleFamilyCatalogue[]|null};
type Project={id:string;canonical_project_key:string|null;title:string;summary:string;problem_statement:string|null;status:string;project_type:string|null;visibility:string;partner_name:string|null;location:string|null;location_type:string|null;difficulty_level:string|null;duration_weeks:number|null;weekly_commitment:string|null;application_deadline:string|null;applications_open:boolean|null;team_size_threshold:number|null;starts_at:string|null;ends_at:string|null;project_roles:Role[]|null;project_domains:{domains:TaxonomyRef|null}[]|null;project_tools:{tools:TaxonomyRef|null}[]|null;project_methods:{methods:TaxonomyRef|null}[]|null};
type Application={id:string;status:string;project_run_id:string|null};
type Membership={membership_status:string;project_run_id:string|null;project_runs:{status:string}|null};

function relationValues(rows:{domains?:TaxonomyRef|null;tools?:TaxonomyRef|null;methods?:TaxonomyRef|null}[]|null|undefined,key:'domains'|'tools'|'methods'){
  return (rows||[]).map(row=>row[key]).filter((value):value is TaxonomyRef=>Boolean(value));
}
function relationOne<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}

export default async function MemberProjectDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/discover/${id}`)}`);

  // Keep project identity/lifecycle readable even while optional Catalogue V2
  // relationships are rolling out. Contribution areas are loaded separately so a
  // missing enrichment table can never blank the canonical project page.
  const [projectResult,applicationsResult,membershipResult,savedResult,profileResult,domainPrefs,toolPrefs,detail,planning,roleDetails,roleFamiliesResult]=await Promise.all([
    supabase.from('projects').select('id,canonical_project_key,title,summary,problem_statement,status,project_type,visibility,partner_name,location,location_type,difficulty_level,duration_weeks,weekly_commitment,application_deadline,applications_open,team_size_threshold,starts_at,ends_at,project_roles(id,title,description,skills,openings,discipline,canonical_role_key),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))').eq('id',id).in('visibility',['public','members']).maybeSingle(),
    supabase.from('project_applications').select('id,status,project_run_id').eq('project_id',id).eq('user_id',user.id).eq('application_kind','application').order('submitted_at',{ascending:false}).limit(10),
    supabase.from('project_members').select('membership_status,project_run_id,project_runs(status)').eq('project_id',id).eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('saved_projects').select('project_id').eq('project_id',id).eq('user_id',user.id).maybeSingle(),
    supabase.from('profiles').select('full_name,headline,current_job_title,professional_area,bio,location,experience_level,employment_status,project_availability,weekly_capacity,primary_goal,linkedin_url,github_url,portfolio_url,skills,preferred_roles').eq('id',user.id).maybeSingle(),
    supabase.from('profile_domain_preferences').select('domain_id').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tool_id').eq('user_id',user.id),
    getProjectDetailContent(id),
    getProjectExperiencePlanning(id),
    getProjectExperienceRoleDetails(id),
    supabase.from('project_role_families').select('project_role_catalogue(slug,title,description)').eq('project_id',id)
  ]);

  if(projectResult.error||!projectResult.data)notFound();
  const project=projectResult.data as unknown as Project;
  const applications=(applicationsResult.data||[]) as Application[];
  const application=applications.find(item=>!['declined','withdrawn'].includes(item.status))||null;
  const membership=(membershipResult.data||null) as unknown as Membership|null;
  const profile=profileResult.data as Record<string,unknown>|null;
  const memberReadiness=calculateMemberReadiness({profile:profile||{},domainCount:domainPrefs.data?.length||0,toolCount:toolPrefs.data?.length||0});
  const applicationReady=memberReadiness.applicationReadiness.ready;

  // Canonical projects preserve their legacy role rows for historical application
  // and membership foreign keys. Those rows are not the current project definition.
  // Discovery therefore renders canonical roles only, without deleting history.
  const rolePool=project.canonical_project_key
    ?(project.project_roles||[]).filter(role=>Boolean(role.canonical_role_key))
    :(project.project_roles||[]);
  const roles=rolePool.filter(role=>{const status=roleDetails.get(role.id)?.roleStatus;return status!=='closed'&&status!=='filled'});
  const db=serviceDb();
  let availabilityKnown=false;
  let filled=new Map<string,number>();
  if(db){
    const usage=await loadProjectRoleUsage(db,id,project.project_type);
    availabilityKnown=usage.known;
    filled=usage.filled;
    if(!usage.known)console.error('member detail role capacity lookup failed');
  }
  const availableRoles=roles.filter(role=>availabilityKnown?((filled.get(role.id)||0)<role.openings):false);
  const run=membership?.project_runs||null;
  const state=resolveMemberProjectState({project,application,membership,run,applicationReady,hasAvailableRole:availableRoles.length>0,roleAvailabilityKnown:availabilityKnown});
  const displayRoles=roles.map(role=>{
    const used=filled.get(role.id)||0;
    const rich=roleDetails.get(role.id);
    return{id:role.id,title:role.title,description:role.description,skills:role.skills||[],openings:role.openings,remaining:availabilityKnown?Math.max(0,role.openings-used):null,available:availabilityKnown&&used<role.openings,responsibilities:rich?.responsibilities||[],recommendedSkills:rich?.recommendedSkills||[],experienceExpectation:rich?.experienceExpectation||null,weeklyCommitment:rich?.weeklyCommitment||null,applicationRequirements:rich?.applicationRequirements||null};
  });

  if(roleFamiliesResult.error)console.warn('member project contribution-area enrichment unavailable',roleFamiliesResult.error.message);
  const contributionMap=new Map<string,RoleFamilyCatalogue>();
  for(const row of (roleFamiliesResult.data||[]) as unknown as RoleFamilyRelation[]){const value=relationOne(row.project_role_catalogue);if(value&&!contributionMap.has(value.slug))contributionMap.set(value.slug,value)}
  const contributionAreas=[...contributionMap.values()].sort((a,b)=>a.title.localeCompare(b.title));

  const domains=relationValues(project.project_domains,'domains');
  const tools=relationValues(project.project_tools,'tools');
  const methods=relationValues(project.project_methods,'methods');
  const model=buildProjectExperienceModel({
    project:{id:project.id,title:project.title,summary:project.summary,problemStatement:project.problem_statement,status:project.status,projectType:project.project_type,applicationsOpen:project.applications_open,partnerName:project.partner_name,location:project.location,locationType:project.location_type,difficultyLevel:project.difficulty_level,durationWeeks:project.duration_weeks,weeklyCommitment:project.weekly_commitment,applicationDeadline:project.application_deadline,teamSizeThreshold:project.team_size_threshold,startsAt:project.starts_at,endsAt:project.ends_at},
    roles:roles.map(role=>{const rich=roleDetails.get(role.id);return{id:role.id,title:role.title,description:role.description,discipline:role.discipline,skills:role.skills||[],openings:role.openings,responsibilities:rich?.responsibilities||[],recommendedSkills:rich?.recommendedSkills||[],experienceExpectation:rich?.experienceExpectation||null,weeklyCommitment:rich?.weeklyCommitment||null,roleStatus:rich?.roleStatus||null,applicationRequirements:rich?.applicationRequirements||null}}),
    domains,tools,methods,detail,brief:planning.brief,milestones:planning.milestones
  });

  return <div className={`${polish.host} ${polish.memberHost}`}><MemberProjectDetailV2 model={model} state={state} stateLabel={memberProjectStateLabel(state)} stateCopy={memberProjectStateCopy(state)} primaryAction={memberProjectPrimaryAction(state,project.id)} applicationReady={applicationReady} profileCompletion={memberReadiness.profileCompletion.percentage} applicationMissing={memberReadiness.applicationReadiness.missing.map(item=>item.label)} roleAvailabilityKnown={availabilityKnown} saved={Boolean(savedResult.data)} roles={displayRoles} contributionAreas={contributionAreas}/></div>;
}
