import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import MemberDiscoverCatalogue from '@/components/MemberDiscoverCatalogue';
import MemberCapabilityPathsPanel from '@/components/MemberCapabilityPathsPanel';
import MemberCapabilityPathFilters from '@/components/MemberCapabilityPathFilters';
import MemberPageHeader from '@/components/MemberPageHeader';
import {memberProjectCatalogueAction,memberProjectStateLabel,projectAcceptsApplications,resolveMemberProjectState} from '@/lib/member-project-journey';
import {resolveProjectPublicAvailability} from '@/lib/project-public-availability';
import {getMemberCapabilityPathProgress,getMemberProjectPathContexts} from '@/lib/member-capability-paths';

export const dynamic='force-dynamic';

type Role={id:string;title:string;skills:string[]|null;openings:number};
type Project={id:string;slug:string;title:string;summary:string;status:string;project_type:string|null;location:string|null;location_type:string|null;duration_weeks:number|null;weekly_commitment:string|null;application_deadline:string|null;applications_open:boolean|null;created_at:string;project_roles:Role[]|null};
type Application={id:string;project_id:string;status:string;project_run_id:string|null};
type Membership={project_id:string;project_run_id:string|null;membership_status:string;project_runs:{status:string}|null};
type Saved={project_id:string};
type CapacityRow={project_id:string;project_role_id:string|null};
type PublishedPath={id:string;slug:string;name:string;target_role:string;target_outcome:string};
type Search={path?:string|string[];stage?:string|string[]};

function titleCase(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function workingModel(project:Project){return project.location_type?titleCase(project.location_type):project.location||null}
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}

export default async function MemberDiscoverPage({searchParams}:{searchParams?:Promise<Search>}){
  const params=await searchParams||{};const selectedPath=one(params.path),selectedStage=one(params.stage);
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin?next=%2Fmember%2Fdiscover');
  const [profileResult,domainPrefs,toolPrefs,projectsResult,applicationsResult,membershipsResult,savedResult,publishedPathsResult,pathProgress]=await Promise.all([
    supabase.from('profiles').select('full_name,headline,current_job_title,professional_area,bio,location,experience_level,employment_status,project_availability,weekly_capacity,primary_goal,linkedin_url,github_url,portfolio_url,skills,preferred_roles').eq('id',user.id).maybeSingle(),
    supabase.from('profile_domain_preferences').select('domain_id').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tool_id').eq('user_id',user.id),
    supabase.from('projects').select('id,slug,title,summary,status,project_type,location,location_type,duration_weeks,weekly_commitment,application_deadline,applications_open,created_at,project_roles(id,title,skills,openings)').in('visibility',['public','members']).in('status',['recruiting','open','forming','active','review','completed']).order('created_at',{ascending:false}).limit(60),
    supabase.from('project_applications').select('id,project_id,status,project_run_id').eq('user_id',user.id).eq('application_kind','application').order('submitted_at',{ascending:false}),
    supabase.from('project_members').select('project_id,project_run_id,membership_status,project_runs(status)').eq('user_id',user.id).in('membership_status',['waiting','active','completed']),
    supabase.from('saved_projects').select('project_id').eq('user_id',user.id),
    supabase.from('capability_paths').select('id,slug,name,target_role,target_outcome').eq('status','published').order('sort_order').order('name').limit(100),
    getMemberCapabilityPathProgress(supabase,user.id)
  ]);
  if(projectsResult.error)console.error('member Discover project query failed',projectsResult.error);
  const profile=profileResult.data as Record<string,unknown>|null;
  const memberReadiness=calculateMemberReadiness({profile:profile||{},domainCount:domainPrefs.data?.length||0,toolCount:toolPrefs.data?.length||0});
  const applicationReady=memberReadiness.applicationReadiness.ready;
  const projects=(projectsResult.data||[]) as unknown as Project[];const applications=(applicationsResult.data||[]) as unknown as Application[];const memberships=(membershipsResult.data||[]) as unknown as Membership[];const saved=new Set(((savedResult.data||[]) as Saved[]).map(row=>row.project_id));
  const latestApplication=new Map<string,Application>();for(const item of applications){if(!latestApplication.has(item.project_id))latestApplication.set(item.project_id,item)}
  const membershipByProject=new Map(memberships.map(item=>[item.project_id,item]));
  const db=serviceDb();let capacityRows:CapacityRow[]=[];let availabilityKnown=false;
  if(db&&projects.length){const result=await db.from('project_members').select('project_id,project_role_id').in('project_id',projects.map(item=>item.id)).in('membership_status',['waiting','active']);if(!result.error){capacityRows=(result.data||[]) as CapacityRow[];availabilityKnown=true}else console.error('member Discover capacity lookup failed',result.error)}
  const filledByRole=new Map<string,number>();for(const row of capacityRows){if(row.project_role_id)filledByRole.set(row.project_role_id,(filledByRole.get(row.project_role_id)||0)+1)}
  const pathContexts=await getMemberProjectPathContexts(supabase,user.id,projects.map(item=>item.id));
  const items=projects.flatMap(project=>{
    const contexts=pathContexts.get(project.id)||[];if(selectedPath&&!contexts.some(context=>context.pathSlug===selectedPath&&(!selectedStage||context.stageName===selectedStage)))return [];
    const roles=project.project_roles||[];const availableRoles=roles.filter(role=>availabilityKnown?((filledByRole.get(role.id)||0)<role.openings):true);const roleCount=roles.reduce((sum,role)=>sum+Math.max(0,Number(role.openings)||0),0);const occupiedRoleCount=roles.reduce((sum,role)=>sum+Math.min(Math.max(0,Number(role.openings)||0),filledByRole.get(role.id)||0),0);const sharedAvailability=resolveProjectPublicAvailability({status:project.status,project_type:project.project_type||'open',application_deadline:project.application_deadline,applications_open:project.applications_open,role_count:roleCount,occupied_role_count:occupiedRoleCount,capacity_known:availabilityKnown});
    const application=latestApplication.get(project.id)||null;const membership=membershipByProject.get(project.id)||null;const run=membership?.project_runs||null;
    const state=resolveMemberProjectState({project,application,membership,run,applicationReady,hasAvailableRole:sharedAvailability.available&&availableRoles.length>0,roleAvailabilityKnown:availabilityKnown});
    const relationship=Boolean(application&&!['declined','withdrawn'].includes(application.status)||membership);
    if(!relationship&&!projectAcceptsApplications(project))return [];
    const displayRoles=projectAcceptsApplications(project)&&availabilityKnown?availableRoles:roles;
    const skills=[...new Set(displayRoles.flatMap(role=>role.skills||[]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const primaryContext=contexts.find(context=>context.isPrimary)||contexts[0]||null;
    const pathSummary=primaryContext?`${primaryContext.pathName} · Project ${primaryContext.position} · ${primaryContext.stageName}`:null;
    return [{id:project.id,title:project.title,summary:pathSummary?`${pathSummary}\n${project.summary}`:project.summary,state,stateLabel:memberProjectStateLabel(state),action:memberProjectCatalogueAction(state,project.id),saved:saved.has(project.id),workingModel:workingModel(project),durationWeeks:project.duration_weeks,commitment:project.weekly_commitment,deadline:project.application_deadline,createdAt:project.created_at,roles:displayRoles.map(role=>role.title),skills,paths:contexts}];
  });
  return <div className="mdDiscoverPage"><MemberPageHeader eyebrow="EXPLORE · PROJECTS" title="Discover projects" description="Explore Mettelo projects where you can contribute to real work, apply your capabilities and build evidence of what you can do." actions={<a className="mdButton" href="/member/recommended">View recommended projects</a>}/><MemberCapabilityPathsPanel paths={pathProgress} availablePaths={(publishedPathsResult.data||[]) as PublishedPath[]}/><MemberCapabilityPathFilters paths={pathProgress} selectedPath={selectedPath} selectedStage={selectedStage}/>{projectsResult.error?<section className="mdDiscoverError" role="alert"><h2>Projects are temporarily unavailable</h2><p>Nothing has been changed. Refresh this page to try the member catalogue again.</p><a className="mdButton mdButtonPrimary" href="/member/discover">Try again</a></section>:<MemberDiscoverCatalogue projects={items}/>}<style>{`.mdDiscoverPage{width:min(100%,1240px);margin:0;min-width:0;color:#111318}.mdDiscoverError{margin-top:20px;padding:22px;border:1px solid #d8dde3;border-radius:14px;background:#fff}.mdDiscoverError h2{margin:0 0 6px}.mdDiscoverError p{margin:0 0 14px;color:#59636f}`}</style></div>;
}
