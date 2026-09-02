import {notFound} from 'next/navigation';
import ProjectPublicDetailV2 from '@/components/project-experience/ProjectPublicDetailV2';
import {projectAcceptsApplications} from '@/lib/member-project-journey';
import {getProjectDetailContent} from '@/lib/project-detail-content';
import {getProjectExperiencePlanning} from '@/lib/project-experience-data';
import {buildProjectExperienceModel} from '@/lib/project-experience-model';
import {createPublicSupabaseClient} from '@/lib/supabase/public';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

type Role={
  id:string;
  title:string;
  description:string|null;
  skills:string[]|null;
  openings:number;
  discipline:string|null;
  responsibilities:string[]|null;
  recommended_skills:string[]|null;
  experience_expectation:string|null;
  weekly_commitment:string|null;
  role_status:string|null;
  application_requirements:string|null;
};

type TaxonomyRef={slug:string;name:string};

type Project={
  id:string;
  title:string;
  summary:string;
  problem_statement:string|null;
  status:string;
  project_type:string|null;
  applications_open:boolean|null;
  partner_name:string|null;
  location:string|null;
  location_type:string|null;
  difficulty_level:string|null;
  duration_weeks:number|null;
  weekly_commitment:string|null;
  application_deadline:string|null;
  team_size_threshold:number|null;
  project_roles:Role[]|null;
  project_domains:{domains:TaxonomyRef|null}[]|null;
  project_tools:{tools:TaxonomyRef|null}[]|null;
  project_methods:{methods:TaxonomyRef|null}[]|null;
};

function relationValues(rows:{domains?:TaxonomyRef|null;tools?:TaxonomyRef|null;methods?:TaxonomyRef|null}[]|null|undefined,key:'domains'|'tools'|'methods'){
  return (rows||[]).map(row=>row[key]).filter((value):value is TaxonomyRef=>Boolean(value));
}

export default async function ProjectDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const publicDb=createPublicSupabaseClient();
  if(!publicDb)notFound();

  // Establish that this is a genuinely public project first. Canonical planning
  // content is projected server-side through explicit public-safe loaders. No
  // internal storage URL or private governance evidence enters this public route.
  const projectResult=await publicDb
    .from('projects')
    .select('id,title,summary,problem_statement,status,project_type,applications_open,partner_name,location,location_type,difficulty_level,duration_weeks,weekly_commitment,application_deadline,team_size_threshold,project_roles(id,title,description,skills,openings,discipline,responsibilities,recommended_skills,experience_expectation,weekly_commitment,role_status,application_requirements),project_domains(domains(slug,name)),project_tools(tools(slug,name)),project_methods(methods(slug,name))')
    .eq('id',id)
    .eq('visibility','public')
    .maybeSingle();

  if(projectResult.error||!projectResult.data)notFound();
  const project=projectResult.data as unknown as Project;

  const [detail,planning,auth]=await Promise.all([
    getProjectDetailContent(project.id),
    getProjectExperiencePlanning(project.id),
    createServerSupabaseClient()
  ]);
  const {data:{user}}=await auth.auth.getUser();

  const roles=(project.project_roles||[]).filter(role=>role.role_status!=='closed'&&role.role_status!=='filled');
  const canApply=projectAcceptsApplications(project)&&roles.length>0;
  const domains=relationValues(project.project_domains,'domains');
  const tools=relationValues(project.project_tools,'tools');
  const methods=relationValues(project.project_methods,'methods');

  const model=buildProjectExperienceModel({
    project:{
      id:project.id,
      title:project.title,
      summary:project.summary,
      problemStatement:project.problem_statement,
      status:project.status,
      projectType:project.project_type,
      applicationsOpen:project.applications_open,
      partnerName:project.partner_name,
      location:project.location,
      locationType:project.location_type,
      difficultyLevel:project.difficulty_level,
      durationWeeks:project.duration_weeks,
      weeklyCommitment:project.weekly_commitment,
      applicationDeadline:project.application_deadline,
      teamSizeThreshold:project.team_size_threshold
    },
    roles:roles.map(role=>({
      id:role.id,
      title:role.title,
      description:role.description,
      discipline:role.discipline,
      skills:(role.skills||[]).filter(Boolean),
      openings:role.openings,
      responsibilities:(role.responsibilities||[]).filter(Boolean),
      recommendedSkills:(role.recommended_skills||[]).filter(Boolean),
      experienceExpectation:role.experience_expectation,
      weeklyCommitment:role.weekly_commitment,
      roleStatus:role.role_status,
      applicationRequirements:role.application_requirements
    })),
    domains,
    tools,
    methods,
    detail,
    brief:planning.brief,
    milestones:planning.milestones
  });

  const memberProjectHref=`/member/discover/${project.id}`;
  const signinHref=`/signin?next=${encodeURIComponent(memberProjectHref)}`;
  const ctaHref=user?memberProjectHref:signinHref;

  return <ProjectPublicDetailV2
    model={model}
    canApply={canApply}
    ctaHref={ctaHref}
    authenticated={Boolean(user)}
  />;
}
