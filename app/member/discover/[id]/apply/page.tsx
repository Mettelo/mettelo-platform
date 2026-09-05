import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {loadProjectRoleUsage} from '@/lib/project-role-capacity';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import {memberProjectPrimaryAction,resolveMemberProjectState} from '@/lib/member-project-journey';
import MemberProjectApplicationFlow from '@/components/MemberProjectApplicationFlow';

export const dynamic='force-dynamic';

type Role={id:string;title:string;description:string|null;openings:number};
type Project={id:string;title:string;status:string;project_type:string|null;visibility:string;applications_open:boolean|null;application_deadline:string|null;weekly_commitment:string|null;project_roles:Role[]|null};
type Application={id:string;status:string;project_run_id:string|null};
type Membership={membership_status:string;project_run_id:string|null;project_runs:{status:string}|null};

export default async function MemberProjectApplyPage({params,searchParams}:{params:Promise<{id:string}>;searchParams?:Promise<{role?:string|string[]}>}){
  const {id}=await params;const query=await searchParams||{};const requestedRole=Array.isArray(query.role)?query.role[0]:query.role;
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/discover/${id}${requestedRole?`/apply?role=${encodeURIComponent(requestedRole)}`:'#roles'}`)}`);
  const [projectResult,applicationsResult,membershipResult,profileResult,domainPrefs,toolPrefs]=await Promise.all([
    supabase.from('projects').select('id,title,status,project_type,visibility,applications_open,application_deadline,weekly_commitment,project_roles(id,title,description,openings)').eq('id',id).in('visibility',['public','members']).maybeSingle(),
    supabase.from('project_applications').select('id,status,project_run_id').eq('project_id',id).eq('user_id',user.id).eq('application_kind','application').order('submitted_at',{ascending:false}).limit(10),
    supabase.from('project_members').select('membership_status,project_run_id,project_runs(status)').eq('project_id',id).eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('profiles').select('full_name,headline,current_job_title,professional_area,bio,location,experience_level,employment_status,project_availability,weekly_capacity,primary_goal,linkedin_url,github_url,portfolio_url,skills,preferred_roles').eq('id',user.id).maybeSingle(),
    supabase.from('profile_domain_preferences').select('domain_id').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tool_id').eq('user_id',user.id)
  ]);
  if(projectResult.error||!projectResult.data)notFound();const project=projectResult.data as unknown as Project;const profile=profileResult.data as Record<string,unknown>|null;
  const memberReadiness=calculateMemberReadiness({profile:profile||{},domainCount:domainPrefs.data?.length||0,toolCount:toolPrefs.data?.length||0});
  const applicationReady=memberReadiness.applicationReadiness.ready;
  const applications=(applicationsResult.data||[]) as Application[];const application=applications.find(item=>!['declined','withdrawn'].includes(item.status))||null;const membership=(membershipResult.data||null) as unknown as Membership|null;
  const roles=project.project_roles||[];const db=serviceDb();let availabilityKnown=false;let filled=new Map<string,number>();if(db){const usage=await loadProjectRoleUsage(db,id,project.project_type);availabilityKnown=usage.known;filled=usage.filled;if(!usage.known)console.error('member apply role capacity lookup failed')}
  const availableRoles=roles.filter(role=>availabilityKnown&&(filled.get(role.id)||0)<role.openings);const state=resolveMemberProjectState({project,application,membership,run:membership?.project_runs||null,applicationReady,hasAvailableRole:availableRoles.length>0,roleAvailabilityKnown:availabilityKnown});
  if(state!=='open_eligible'){const action=memberProjectPrimaryAction(state,id);redirect(action?.href||`/member/discover/${id}`)}
  if(!requestedRole||!availableRoles.some(role=>role.id===requestedRole))redirect(`/member/discover/${id}#roles`);
  const initialRoleId=requestedRole;const initialAvailability=typeof profile?.weekly_capacity==='string'?profile.weekly_capacity:'';const initialPortfolioUrl=[profile?.portfolio_url,profile?.github_url,profile?.linkedin_url].find(value=>typeof value==='string'&&value.trim()) as string|undefined;
  return <div className="mpaPage"><nav className="mpaBreadcrumb" aria-label="Project breadcrumb"><Link href="/member">My Mettelo</Link><span aria-hidden="true">/</span><Link href="/member/discover">Discover</Link><span aria-hidden="true">/</span><Link href={`/member/discover/${id}`}>{project.title}</Link><span aria-hidden="true">/</span><strong>Apply</strong></nav><header className="mpaHead"><div className="mpaEyebrow">PROJECT APPLICATION</div><h1>Apply to {project.title}</h1><p>Tell the team how you could contribute, confirm the contribution area that best fits you and review the commitment before submitting. Your application status will remain visible in My Mettelo.</p></header><MemberProjectApplicationFlow project={{id:project.id,title:project.title,commitment:project.weekly_commitment}} roles={roles.map(role=>({id:role.id,title:role.title,description:role.description,available:availableRoles.some(item=>item.id===role.id)}))} initialRoleId={initialRoleId} initialAvailability={initialAvailability} initialPortfolioUrl={initialPortfolioUrl||''}/><style>{`.mpaPage{width:min(100%,1180px);margin:0 auto;min-width:0;color:#111318}.mpaBreadcrumb{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 18px;font-size:11px;color:#68727d}.mpaBreadcrumb a{color:inherit;text-underline-offset:3px}.mpaBreadcrumb strong{color:#111318}.mpaHead{width:min(100%,920px);margin:0 auto;padding:8px 0 20px;border-bottom:1px solid #d8dde3}.mpaHead h1{margin:8px 0 10px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:clamp(35px,5vw,44px);letter-spacing:-.045em;line-height:1.03;overflow-wrap:anywhere}.mpaHead p{margin:0;color:#59636f;line-height:1.62}.mpaBreadcrumb a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:480px){.mpaBreadcrumb{margin-bottom:12px}.mpaHead h1{font-size:35px}.mpaHead p{font-size:14px}}`}</style></div>;
}
