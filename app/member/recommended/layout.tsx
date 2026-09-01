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
  const progressLabel=primary?`${primary.completedProjects}/${primary.totalProjects} completed`:'';
  const nextStatus=paused?'Paused':next?.available?'Available now':next?'Not currently joinable':'Path complete';

  return <>{primary&&<section className="mprBanner" aria-labelledby="path-recommendation-title">
    <div className="mprIdentity">
      <div className="mprEyebrow">YOUR DIRECTION</div>
      <h2 id="path-recommendation-title">{primary.name}</h2>
      <div className="mprMetaRow"><span>{progressLabel}</span><span aria-hidden="true">·</span><span>{primary.verifiedProjects} Verified Proof</span></div>
    </div>
    <div className="mprNext">
      <small>{paused?'PATH PAUSED':next?`NEXT · PROJECT ${next.position}`:'PATH PROGRESS'}</small>
      <strong>{paused?'Recommendations are not currently guided by this Path':next?.projectTitle||'You have completed the visible Path projects'}</strong>
      <span className={`mprStatus ${next?.available&&!paused?'available':''}`}>{nextStatus}</span>
    </div>
    <div className="mprActions">
      {actionable&&!paused&&<Link className="primary" href={`/member/discover?path=${encodeURIComponent(primary.slug)}`}>View Path projects</Link>}
      <Link href="/member/paths">Manage Path</Link>
    </div>
    <style>{`.mprBanner{margin:0 0 18px;padding:14px 16px;border:1px solid #d5cab7;border-left:3px solid #c6892a;border-radius:12px;background:#fbf7ee;display:grid;grid-template-columns:minmax(180px,.7fr) minmax(280px,1.45fr) auto;gap:18px;align-items:center;min-width:0}.mprIdentity,.mprNext{min-width:0}.mprEyebrow{font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.1em;color:#8b5a17}.mprBanner h2{margin:4px 0 5px;font:760 18px/1.15 var(--font-space-grotesk),Inter,sans-serif;overflow-wrap:anywhere}.mprMetaRow{display:flex;gap:6px;flex-wrap:wrap;color:#68727d;font-size:10.5px}.mprNext{padding-left:16px;border-left:1px solid #ddd4c2;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 12px;align-items:center}.mprNext small{grid-column:1/-1;font:800 9px var(--font-plex-mono),ui-monospace,monospace;color:#8b5a17;letter-spacing:.07em}.mprNext strong{font-size:13px;line-height:1.35;overflow-wrap:anywhere}.mprStatus{display:inline-flex;align-items:center;justify-content:center;min-height:26px;padding:4px 9px;border-radius:999px;background:#f0eee8;color:#59636f;font-size:9.5px;font-weight:800;white-space:nowrap}.mprStatus.available{background:#edf8f1;color:#185b3c}.mprActions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.mprActions a{min-height:40px;padding:0 12px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:10.5px;font-weight:800;white-space:nowrap}.mprActions a.primary{background:#111318;color:#fff;border-color:#111318}.mprActions a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:980px){.mprBanner{grid-template-columns:minmax(0,1fr) auto}.mprNext{grid-column:1/-1;grid-row:2;padding:10px 0 0;border-left:0;border-top:1px solid #ddd4c2}.mprActions{grid-column:2;grid-row:1}}@media(max-width:680px){.mprBanner{grid-template-columns:1fr}.mprActions{grid-column:1;grid-row:auto;display:grid;justify-content:stretch}.mprActions a{width:100%}.mprNext{grid-column:1;grid-row:auto;grid-template-columns:1fr}.mprStatus{justify-self:start}}`}</style>
  </section>}{children}</>;
}
