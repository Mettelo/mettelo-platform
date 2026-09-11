import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {calculateMemberReadiness} from '@/lib/member-readiness';
import {memberProjectPrimaryAction,resolveMemberProjectState} from '@/lib/member-project-journey';
import MemberProjectApplicationFlow from '@/components/MemberProjectApplicationFlow';

export const dynamic='force-dynamic';
type Project={id:string;title:string;status:string;project_type:string|null;visibility:string;applications_open:boolean|null;application_deadline:string|null;weekly_commitment:string|null;participation_mode:'solo'|'team'|'flexible'|null;min_team_size:number|null;target_team_size:number|null;max_team_size:number|null;team_size_threshold:number|null};
type Application={id:string;status:string;application_kind:string|null;project_run_id:string|null};
type Membership={membership_status:string;project_run_id:string|null;project_runs:{status:string}|null};
type Search={collaboration_need?:string|string[]};
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}
function profileSkills(value:unknown){return Array.isArray(value)?value.map(String).filter(Boolean).slice(0,30):[]}

export default async function MemberProjectApplyPage({params,searchParams}:{params:Promise<{id:string}>;searchParams?:Promise<Search>}){
 const {id}=await params;const query=await searchParams||{};const collaborationNeedId=one(query.collaboration_need).trim();const applyPath=`/member/discover/${id}/apply${collaborationNeedId?`?collaboration_need=${encodeURIComponent(collaborationNeedId)}`:''}`;const detailPath=`/member/discover/${id}${collaborationNeedId?`?collaboration_need=${encodeURIComponent(collaborationNeedId)}`:''}`;const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(applyPath)}`);
 const [projectResult,applicationsResult,membershipResult,profileResult,domainPrefs,toolPrefs,rolesResult]=await Promise.all([
  supabase.from('projects').select('id,title,status,project_type,visibility,applications_open,application_deadline,weekly_commitment,participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold').eq('id',id).in('visibility',['public','members']).maybeSingle(),
  supabase.from('project_applications').select('id,status,application_kind,project_run_id').eq('project_id',id).eq('user_id',user.id).order('submitted_at',{ascending:false}).limit(20),
  supabase.from('project_members').select('membership_status,project_run_id,project_runs(status)').eq('project_id',id).eq('user_id',user.id).in('membership_status',['waiting','active','completed']).order('joined_at',{ascending:false}).limit(1).maybeSingle(),
  supabase.from('profiles').select('full_name,headline,current_job_title,professional_area,bio,location,experience_level,employment_status,project_availability,weekly_capacity,primary_goal,linkedin_url,github_url,portfolio_url,skills,preferred_roles').eq('id',user.id).maybeSingle(),
  supabase.from('profile_domain_preferences').select('domain_id').eq('user_id',user.id),supabase.from('profile_tool_preferences').select('tool_id').eq('user_id',user.id),
  supabase.from('project_roles').select('id,title,description,skills,openings,role_status').eq('project_id',id).eq('role_status','open').order('title')
 ]);
 if(projectResult.error||!projectResult.data)notFound();const project=projectResult.data as unknown as Project;const profile=profileResult.data as Record<string,unknown>|null;const memberReadiness=calculateMemberReadiness({profile:profile||{},domainCount:domainPrefs.data?.length||0,toolCount:toolPrefs.data?.length||0});const applicationReady=memberReadiness.applicationReadiness.ready;const applications=(applicationsResult.data||[]) as Application[];const application=applications.find(item=>!['declined','withdrawn'].includes(item.status))||null;const membership=(membershipResult.data||null) as unknown as Membership|null;
 const state=resolveMemberProjectState({project,application,membership,run:membership?.project_runs||null,applicationReady});
 if(state!=='open_eligible'){if(state==='ineligible'&&!applicationReady)redirect(`/member/profile?next=${encodeURIComponent(`${detailPath}#member-decision-title`)}`);const action=memberProjectPrimaryAction(state,id);redirect(action?.href||detailPath)}
 if(!serviceDb())redirect(detailPath);
 const initialAvailability=typeof profile?.weekly_capacity==='string'?profile.weekly_capacity:'';const initialPortfolioUrl=[profile?.portfolio_url,profile?.github_url,profile?.linkedin_url].find(value=>typeof value==='string'&&value.trim()) as string|undefined;
 const roles=(rolesResult.data||[]).map(role=>({id:String(role.id),title:String(role.title),description:role.description?String(role.description):null,skills:Array.isArray(role.skills)?role.skills.map(String):[],openings:Number(role.openings||0)}));
 return <div className="mpaPage"><nav className="mpaBreadcrumb" aria-label="Project breadcrumb"><Link href="/member">My Mettelo</Link><span aria-hidden="true">/</span><Link href="/member/discover">Discover</Link><span aria-hidden="true">/</span><Link href={detailPath}>{project.title}</Link><span aria-hidden="true">/</span><strong>Submit Interest</strong></nav><header className="mpaHead"><div className="mpaEyebrow">PROJECT INTEREST</div><h1>Submit Interest — {project.title}</h1><p>Choose how you want to participate, describe the contribution you can own, confirm your availability and review everything before submitting.</p></header><MemberProjectApplicationFlow project={{id:project.id,title:project.title,commitment:project.weekly_commitment,participationMode:project.participation_mode||'team'}} roles={roles} profileSkills={profileSkills(profile?.skills)} initialAvailability={initialAvailability} initialPortfolioUrl={initialPortfolioUrl||''} collaborationNeedId={collaborationNeedId||null}/><style>{`.mpaPage{width:min(100%,1180px);margin:0 auto;min-width:0;color:#111318}.mpaBreadcrumb{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:0 0 18px;font-size:11px;color:#68727d}.mpaBreadcrumb a{color:inherit;text-underline-offset:3px}.mpaBreadcrumb strong{color:#111318}.mpaHead{width:min(100%,920px);margin:0 auto;padding:8px 0 20px;border-bottom:1px solid #d8dde3}.mpaHead h1{margin:8px 0 10px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:clamp(35px,5vw,44px);letter-spacing:-.045em;line-height:1.03;overflow-wrap:anywhere}.mpaHead p{margin:0;color:#59636f;line-height:1.62}@media(max-width:480px){.mpaBreadcrumb{margin-bottom:12px}.mpaHead h1{font-size:35px}.mpaHead p{font-size:14px}}`}</style></div>;
}
