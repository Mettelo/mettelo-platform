import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import ProjectPublicDetailV2 from '@/components/project-experience/ProjectPublicDetailV2';
import polish from '@/components/project-experience/ProjectExperiencePolish.module.css';
import {buildProjectExperienceModel} from '@/lib/project-experience-model';
import {getPublicProjectExperienceData} from '@/lib/public-project-experience-data';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

type Role={id:string;title:string;description:string|null;skills:string[]|null;openings:number;discipline:string|null;canonical_role_key:string|null};
type TaxonomyRef={slug:string;name:string};
type Capacity={project_id:string;participation_mode:'solo'|'team'|'flexible'|null;confirmed_members:number;reserved_members:number;occupied_places:number;min_team_size:number|null;target_team_size:number|null;max_team_size:number|null;capacity_available:boolean;recruitment_state:string};
type Project={id:string;canonical_project_key:string|null;title:string;summary:string;problem_statement:string|null;status:string;project_type:string|null;applications_open:boolean|null;partner_name:string|null;location:string|null;location_type:string|null;difficulty_level:string|null;duration_weeks:number|null;weekly_commitment:string|null;application_deadline:string|null;participation_mode:'solo'|'team'|'flexible'|null;min_team_size:number|null;target_team_size:number|null;max_team_size:number|null;team_size_threshold:number|null;project_roles:Role[]|null;project_domains:{domains:TaxonomyRef|null}[]|null;project_tools:{tools:TaxonomyRef|null}[]|null;project_methods:{methods:TaxonomyRef|null}[]|null};

function relationValues(rows:{domains?:TaxonomyRef|null;tools?:TaxonomyRef|null;methods?:TaxonomyRef|null}[]|null|undefined,key:'domains'|'tools'|'methods'){
  return (rows||[]).map(row=>row[key]).filter((value):value is TaxonomyRef=>Boolean(value));
}

async function getPublicProject(id:string){
  const publicDb=createPublicSupabaseClient();
  if(!publicDb)return null;
  const result=await publicDb
    .from('projects')
    .select('id,canonical_project_key,title,summary,problem_statement,status,project_type,applications_open,partner_name,location,location_type,difficulty_level,duration_weeks,weekly_commitment,application_deadline,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold,project_roles(id,title,description,skills,openings,discipline,canonical_role_key),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))')
    .eq('id',id)
    .eq('visibility','public')
    .maybeSingle();
  if(result.error||!result.data)return null;
  return result.data as unknown as Project;
}

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const {id}=await params;
  const project=await getPublicProject(id);
  if(!project)return{title:'Project not found',robots:{index:false,follow:false}};
  const title=`${project.title} | Mettelo Projects`;
  const description=project.summary?.trim()||'Explore this public Mettelo project opportunity.';
  const canonical=`/projects/${project.id}`;
  return{title,description,alternates:{canonical},openGraph:{title,description,url:canonical,type:'website'},twitter:{card:'summary',title,description},robots:{index:true,follow:true}};
}

export default async function ProjectDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const project=await getPublicProject(id);
  if(!project)notFound();
  const publicDb=createPublicSupabaseClient();
  if(!publicDb)notFound();

  const [publicExperience,auth,capacityResult]=await Promise.all([
    getPublicProjectExperienceData(project.id),
    createServerSupabaseClient(),
    publicDb.rpc('get_public_project_capacity',{p_project_id:project.id})
  ]);
  const {detail,brief,milestones,roleDetails,loadError}=publicExperience;
  const {data:{user}}=await auth.auth.getUser();
  if(capacityResult.error||!capacityResult.data||capacityResult.data.length!==1){
    console.error('public project capacity projection unavailable; refusing stale availability',capacityResult.error);
    notFound();
  }
  const capacity=capacityResult.data[0] as Capacity;

  // Legacy role rows remain only to preserve historical foreign-key identity and
  // describe possible contribution areas. They are never a capacity authority.
  const rolePool=project.canonical_project_key
    ?(project.project_roles||[]).filter(role=>Boolean(role.canonical_role_key))
    :(project.project_roles||[]);
  const roles=rolePool;
  const canApply=capacity.capacity_available&&!['closed','joining_closed','completed','full'].includes(capacity.recruitment_state);
  const domains=relationValues(project.project_domains,'domains');
  const tools=relationValues(project.project_tools,'tools');
  const methods=relationValues(project.project_methods,'methods');
  const legacyMinimum=project.team_size_threshold&&project.team_size_threshold>0?project.team_size_threshold:null;
  const participationMode=project.participation_mode||(legacyMinimum===1?'solo':legacyMinimum&&legacyMinimum>1?'team':null);
  const minTeamSize=project.min_team_size||legacyMinimum;
  const targetTeamSize=project.target_team_size||minTeamSize;
  const maxTeamSize=project.max_team_size||targetTeamSize;

  const model=buildProjectExperienceModel({
    project:{id:project.id,title:project.title,summary:project.summary,problemStatement:project.problem_statement,status:project.status,projectType:project.project_type,applicationsOpen:project.applications_open,partnerName:project.partner_name,location:project.location,locationType:project.location_type,difficultyLevel:project.difficulty_level,durationWeeks:project.duration_weeks,weeklyCommitment:project.weekly_commitment,applicationDeadline:project.application_deadline,participationMode,minTeamSize,targetTeamSize,maxTeamSize,teamSizeThreshold:project.team_size_threshold},
    roles:roles.map(role=>{const rich=roleDetails.get(role.id);return{id:role.id,title:role.title,description:role.description,discipline:role.discipline,skills:(role.skills||[]).filter(Boolean),openings:role.openings,responsibilities:rich?.responsibilities||[],recommendedSkills:rich?.recommendedSkills||[],experienceExpectation:rich?.experienceExpectation||null,weeklyCommitment:rich?.weeklyCommitment||null,roleStatus:null,applicationRequirements:null}}),
    domains,tools,methods,detail,brief,milestones
  });

  const memberProjectHref=`/member/discover/${project.id}`;
  const signinHref=`/signin?next=${encodeURIComponent(memberProjectHref)}`;
  const ctaHref=user?memberProjectHref:signinHref;

  return <div className={`${polish.host} ${polish.publicHost}`}><ProjectPublicDetailV2 model={model} capacity={capacity} canApply={canApply} ctaHref={ctaHref} authenticated={Boolean(user)} detailLoadError={loadError}/></div>;
}
