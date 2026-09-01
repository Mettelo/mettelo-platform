import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberCapabilityPathsPanel from '@/components/MemberCapabilityPathsPanel';
import {getMemberCapabilityPathProgress} from '@/lib/member-capability-paths';

export const dynamic='force-dynamic';
type PublishedPath={id:string;slug:string;name:string;target_role:string;target_outcome:string};

export default async function MemberPathsPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=%2Fmember%2Fpaths');

  const [progress,{data:publishedPaths}]=await Promise.all([
    getMemberCapabilityPathProgress(supabase,user.id),
    supabase.from('capability_paths').select('id,slug,name,target_role,target_outcome').eq('status','published').order('sort_order').order('name').limit(100)
  ]);

  return <div className="memberPathsPage">
    <header className="memberPathsHero">
      <div className="memberPathsHeroCopy">
        <div className="memberPathsEyebrow">DIRECTION &amp; DISCOVERY · CAPABILITY PATHS</div>
        <h1>Build with direction through real work</h1>
        <p>Choose where you want to develop, then use real Mettelo projects to build toward that capability. Follow more than one Path, keep one primary for guidance, and move through projects as teams become available.</p>
      </div>
      <div className="memberPathsHeroActions">
        <a className="mdButton mdButtonPrimary" href="#explore-capability-paths">Explore Paths</a>
        <Link className="mdButton" href="/member/discover">Browse all projects</Link>
      </div>
    </header>

    <MemberCapabilityPathsPanel paths={progress} availablePaths={(publishedPaths||[]) as PublishedPath[]}/>

    <details className="memberPathsHow">
      <summary>How Capability Paths work</summary>
      <div className="memberPathsPrinciples">
        <article><span>01</span><strong>Multiple directions</strong><p>Follow several Paths if they are useful. One primary Path guides recommendations only.</p></article>
        <article><span>02</span><strong>Team projects stay team projects</strong><p>A Path recommends projects, but applications and team formation still use Mettelo&apos;s existing lifecycle.</p></article>
        <article><span>03</span><strong>One project, many contexts</strong><p>Complete a project once and it can contribute wherever that same canonical project legitimately appears.</p></article>
        <article><span>04</span><strong>Proof stays evidence-led</strong><p>Path progress and Verified Proof remain separate. Verified Proof still requires reviewed contribution evidence.</p></article>
      </div>
    </details>

    <style>{`
      .memberPathsPage{width:min(100%,1280px);margin:0;min-width:0;color:#10131d}.memberPathsHero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:28px;align-items:end;padding:8px 0 24px;border-bottom:1px solid #e7e1d6}.memberPathsHeroCopy{min-width:0}.memberPathsEyebrow{font:800 10px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.13em;color:#8b5a17}.memberPathsHero h1{margin:8px 0 12px;font:780 clamp(40px,5vw,64px)/.98 var(--font-space-grotesk),Inter,sans-serif;letter-spacing:-.055em;overflow-wrap:anywhere}.memberPathsHero p{max-width:790px;margin:0;color:#5b6472;font-size:15px;line-height:1.65}.memberPathsHeroActions{display:flex;gap:8px;flex-wrap:wrap}.memberPathsHow{margin:22px 0 30px;border:1px solid #e7e1d6;border-radius:14px;background:#fff;padding:0 17px}.memberPathsHow summary{cursor:pointer;min-height:50px;display:flex;align-items:center;font-size:13px;font-weight:850}.memberPathsHow summary:focus-visible{outline:3px solid #e0ad59;outline-offset:3px}.memberPathsPrinciples{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:0 0 17px}.memberPathsPrinciples article{border-top:2px solid #e7e1d6;padding:12px 2px 0;min-width:0}.memberPathsPrinciples span{display:block;font:800 9px var(--font-plex-mono),ui-monospace,monospace;color:#c6892a;letter-spacing:.08em}.memberPathsPrinciples strong{display:block;margin-top:5px;font-size:12px}.memberPathsPrinciples p{margin:5px 0 0;color:#5b6472;font-size:11.5px;line-height:1.5}@media(max-width:900px){.memberPathsHero{grid-template-columns:1fr}.memberPathsHeroActions{justify-content:flex-start}.memberPathsPrinciples{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.memberPathsPage{width:100%}.memberPathsHero{padding-top:2px;gap:16px}.memberPathsHero h1{font-size:36px;line-height:1.02}.memberPathsHero p{font-size:13.5px}.memberPathsHeroActions{display:grid;grid-template-columns:1fr 1fr}.memberPathsHeroActions .mdButton{width:100%}.memberPathsPrinciples{grid-template-columns:1fr}.memberPathsHow{padding:0 14px}}@media(max-width:390px){.memberPathsHeroActions{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.memberPathsPage *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
    `}</style>
  </div>;
}