import Image from 'next/image';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberPageHeader from '@/components/MemberPageHeader';

export const dynamic='force-dynamic';
type Search={project_id?:string|string[];project_run_id?:string|string[];collaboration_need?:string|string[]};
function one(value:string|string[]|undefined){return Array.isArray(value)?value[0]||'':value||''}

export default async function CollaborationProfilePage({params,searchParams}:{params:Promise<{username:string}>;searchParams?:Promise<Search>}){
 const {username:rawUsername}=await params;const username=decodeURIComponent(rawUsername).replace(/^@/,'').trim();
 const search=await searchParams||{};const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 const back=new URLSearchParams({view:'people'});const projectId=one(search.project_id).trim(),runId=one(search.project_run_id).trim(),needId=one(search.collaboration_need).trim();if(projectId&&runId){back.set('project_id',projectId);back.set('project_run_id',runId)}if(needId)back.set('collaboration_need',needId);
 if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/collaboration/people/${encodeURIComponent(username)}`)}`);
 if(username.length<2)notFound();
 const {data,error}=await auth.rpc('phase18_search_discoverable_members',{p_query:username,p_limit:20});
 if(error){console.error('collaboration profile lookup failed',{code:error.code,message:error.message});notFound()}
 const member=(data||[]).find(item=>String(item.username||'').toLocaleLowerCase('en-GB')===username.toLocaleLowerCase('en-GB'));
 if(!member)notFound();
 const role=member.current_job_title||(member.preferred_roles||[])[0]||member.professional_area||'Mettelo member';
 return <main className="cpRoot">
  <Link className="cpBack" href={`/member/collaboration?${back.toString()}`}>← Back to Collaboration Network</Link>
  <MemberPageHeader eyebrow="COLLABORATION NETWORK · PEOPLE" title={member.full_name||`@${member.username}`} description={member.headline||role}/>
  <section className="cpCard" aria-label="Discoverable collaborator profile">
   <div className="cpIdentity"><div className="cpAvatar" aria-hidden="true">{member.avatar_url?<Image src={member.avatar_url} alt="" width={64} height={64} unoptimized/>:<span>{String(member.full_name||member.username).slice(0,2).toUpperCase()}</span>}</div><div><strong>@{member.username}</strong><span>{role}</span></div></div>
   <dl>
    <div><dt>Professional area</dt><dd>{member.professional_area||'Not specified'}</dd></div>
    <div><dt>Experience</dt><dd>{member.experience_level||'Not specified'}</dd></div>
    <div><dt>Availability</dt><dd>{member.project_availability||'Not specified'}</dd></div>
    <div><dt>Weekly commitment</dt><dd>{member.weekly_capacity||'Confirm after a team request'}</dd></div>
    <div className="cpWide"><dt>Capabilities</dt><dd>{member.skills?.length?member.skills.join(' · '):'Not specified'}</dd></div>
    <div className="cpWide"><dt>Preferred roles</dt><dd>{member.preferred_roles?.length?member.preferred_roles.join(' · '):'Not specified'}</dd></div>
   </dl>
   <p className="cpPrivacy">Only information this member has made discoverable for collaboration is shown here. Private email, project history, Lab activity, reviews and support information are not included.</p>
   {projectId&&runId&&<Link className="button dark" href={`/member/collaboration?${back.toString()}`}>Return to send team request</Link>}
  </section>
  <style>{`.cpRoot{display:grid;gap:20px;min-width:0}.cpBack{width:max-content;max-width:100%;font-size:.78rem;font-weight:800}.cpCard{max-width:860px;padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--white)}.cpIdentity{display:flex;align-items:center;gap:14px;padding-bottom:18px;border-bottom:1px solid var(--line)}.cpIdentity>div:last-child{display:grid;gap:4px}.cpIdentity span{color:var(--slate)}.cpAvatar{width:64px;height:64px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--ink);color:white;font-weight:850}.cpAvatar img{width:100%;height:100%;object-fit:cover}.cpCard dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.cpCard dl div{padding:12px;border-radius:11px;background:#f7f7f5}.cpCard dt{font-size:.68rem;font-weight:800;text-transform:uppercase;color:var(--slate)}.cpCard dd{margin:5px 0 0;overflow-wrap:anywhere}.cpWide{grid-column:1/-1}.cpPrivacy{color:var(--slate);font-size:.76rem;line-height:1.55}.cpCard>.button{display:inline-flex;min-height:44px;align-items:center;margin-top:4px}@media(max-width:560px){.cpCard{padding:16px}.cpCard dl{grid-template-columns:1fr}.cpWide{grid-column:1}.cpCard>.button{width:100%;justify-content:center;text-align:center}}`}</style>
 </main>;
}
