import Link from 'next/link';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {getMemberCapabilityPathProgress} from '@/lib/member-capability-paths';

export default async function RecommendedLayout({children}:{children:React.ReactNode}){
  const db=await createServerSupabaseClient();
  const {data:{user}}=await db.auth.getUser();
  const progress=user?await getMemberCapabilityPathProgress(db,user.id):[];
  const primary=progress.find(item=>item.isPrimary&&item.pathStatus==='published')||null;
  const next=primary?.nextProject||null;
  const actionable=primary?.nextAvailableProject||null;
  const paused=primary?.followStatus==='paused';

  return <>{primary&&<section className="mprBanner" aria-labelledby="path-recommendation-title">
    <div className="mprCopy"><div className="mprEyebrow">RECOMMENDED FOR YOUR DIRECTION</div><h2 id="path-recommendation-title">{paused?`${primary.name} is paused`:`Continue ${primary.name}`}</h2>
      {paused?<p>Your Path progress is preserved, but it is not currently guiding new project recommendations. Resume it from Capability Paths when you want sequence-based guidance again.</p>:next?<><div className="mprNext"><small>NEXT IN PRIMARY PATH · PROJECT {next.position}</small><strong>{next.projectTitle||'Next Path project'}</strong><span>Builds: {next.capabilityBuilt}</span></div>{!next.available&&<p>{actionable&&actionable.projectId!==next.projectId?`The next project in sequence is not currently joinable. Project ${actionable.position}, ${actionable.projectTitle}, is the nearest currently available project in this Path.`:'The next project in sequence is not currently joinable. Broader profile recommendations remain available below.'}</p>}</>:<p>Your visible projects in this Path are complete. Broader recommendations can still help you find additional work, while Verified Proof remains a separate evidence signal.</p>}
      <small className="mprMeta">{primary.completedProjects} of {primary.totalProjects} projects completed · {primary.verifiedProjects} with Verified Proof</small>
    </div>
    <div className="mprActions">{actionable&&!paused&&<Link className="primary" href={`/member/discover?path=${encodeURIComponent(primary.slug)}`}>Explore Path projects</Link>}<Link href="/member/paths">Manage Paths</Link></div>
    <style>{`.mprBanner{margin:0 0 20px;padding:20px;border:1px solid #d5cab7;border-left:4px solid #c6892a;border-radius:14px;background:#fbf7ee;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;min-width:0}.mprCopy{min-width:0}.mprEyebrow{font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.1em;color:#8b5a17}.mprBanner h2{margin:5px 0 8px;font:760 23px/1.15 var(--font-space-grotesk),Inter,sans-serif;overflow-wrap:anywhere}.mprBanner p{margin:8px 0;color:#59636f;font-size:12.5px;line-height:1.55}.mprNext{display:grid;gap:3px;padding:11px 12px;border:1px solid #ddd4c2;border-radius:9px;background:#fff}.mprNext small{font:800 9px var(--font-plex-mono),ui-monospace,monospace;color:#8b5a17;letter-spacing:.06em}.mprNext strong{font-size:14px;overflow-wrap:anywhere}.mprNext span,.mprMeta{color:#68727d;font-size:11px}.mprActions{display:flex;gap:8px;flex-wrap:wrap}.mprActions a{min-height:44px;padding:0 13px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:11px;font-weight:800}.mprActions a.primary{background:#111318;color:#fff;border-color:#111318}.mprActions a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:760px){.mprBanner{grid-template-columns:1fr}.mprActions{display:grid}.mprActions a{width:100%}}`}</style>
  </section>}{children}</>;
}
