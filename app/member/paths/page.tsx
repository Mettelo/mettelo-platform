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
  return <div className="memberPathsPage"><MemberPageHeader eyebrow="MY METTELO · CAPABILITY PATHS" title="Build with direction" description="Choose professional directions for the project work you want to build through. Paths recommend sequence and context; they do not lock your discovery or replace Verified Proof." actions={<a className="mdButton" href="/member/discover">Discover all projects</a>}/><section className="memberPathsPrinciples" aria-label="How Capability Paths work"><div><strong>Direction, not restriction</strong><span>You can follow several Paths and still browse every eligible project.</span></div><div><strong>One project, many contexts</strong><span>The same canonical project can contribute to more than one professional direction.</span></div><div><strong>Progress from work</strong><span>Completion comes from project participation. Verified Proof stays a distinct evidence signal.</span></div></section><MemberCapabilityPathsPanel paths={progress} availablePaths={(publishedPaths||[]) as PublishedPath[]}/><style>{`.memberPathsPage{width:min(100%,1240px);margin:0;min-width:0;color:#111318}.memberPathsPrinciples{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px}.memberPathsPrinciples div{display:grid;gap:4px;padding:13px 14px;border:1px solid #d8dde3;border-radius:11px;background:#fff;min-width:0}.memberPathsPrinciples strong{font-size:12px}.memberPathsPrinciples span{color:#59636f;font-size:11px;line-height:1.5}@media(max-width:780px){.memberPathsPrinciples{grid-template-columns:1fr}}`}</style></div>;
}
