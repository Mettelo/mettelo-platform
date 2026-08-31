import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberCapabilityPathsPanel from '@/components/MemberCapabilityPathsPanel';
import MemberPageHeader from '@/components/MemberPageHeader';
import {getMemberCapabilityPathProgress} from '@/lib/member-capability-paths';

export const dynamic='force-dynamic';
type PublishedPath={id:string;slug:string;name:string;target_role:string;target_outcome:string};

export default async function MemberPathsPage(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin?next=%2Fmember%2Fpaths');
  const [progress,{data:publishedPaths}]=await Promise.all([
    getMemberCapabilityPathProgress(supabase,user.id),
    supabase.from('capability_paths').select('id,slug,name,target_role,target_outcome').eq('status','published').order('sort_order').order('name').limit(100)
  ]);
  return <div className="memberPathsPage"><MemberPageHeader eyebrow="DIRECTION & DISCOVERY · CAPABILITY PATHS" title="Build with direction" description="Choose professional directions for the project work you want to build through. Paths recommend sequence and context; they never replace Mettelo's team-formation lifecycle or Verified Proof." actions={<a className="mdButton" href="/member/discover">Discover all projects</a>}/><section className="memberPathsPrinciples" aria-label="How Capability Paths work"><div><strong>Multiple directions</strong><span>Follow several Paths and choose one primary direction for recommendations.</span></div><div><strong>Team projects stay team projects</strong><span>A Path can recommend a project, but work starts only when the existing Mettelo team requirements are met.</span></div><div><strong>One project, many contexts</strong><span>Complete a canonical project once and it can contribute wherever that project appears across your followed Paths.</span></div><div><strong>Proof stays evidence-led</strong><span>Project completion can move Path progress; Verified Proof still requires reviewed contribution evidence.</span></div></section><MemberCapabilityPathsPanel paths={progress} availablePaths={(publishedPaths||[]) as PublishedPath[]}/><style>{`.memberPathsPage{width:min(100%,1240px);margin:0;min-width:0;color:#111318}.memberPathsPrinciples{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 16px}.memberPathsPrinciples div{display:grid;gap:4px;padding:13px 14px;border:1px solid #d8dde3;border-radius:11px;background:#fff;min-width:0}.memberPathsPrinciples strong{font-size:12px}.memberPathsPrinciples span{color:#59636f;font-size:11px;line-height:1.5}@media(max-width:1000px){.memberPathsPrinciples{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.memberPathsPrinciples{grid-template-columns:1fr}}`}</style></div>;
}
