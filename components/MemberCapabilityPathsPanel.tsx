'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useMemo,useState} from 'react';
import type {MemberCapabilityPathProgress} from '@/lib/member-capability-paths';

type AvailablePath={id:string;slug:string;name:string;target_role:string;target_outcome:string};
type Props={paths:MemberCapabilityPathProgress[];availablePaths:AvailablePath[]};
type Mutate=(action:string,pathId:string)=>Promise<void>;

export default function MemberCapabilityPathsPanel({paths,availablePaths}:Props){
  const router=useRouter();
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [query,setQuery]=useState('');
  const followedIds=useMemo(()=>new Set(paths.map(item=>item.pathId)),[paths]);
  const primary=paths.find(item=>item.isPrimary)||paths[0]||null;
  const otherPaths=primary?paths.filter(item=>item.pathId!==primary.pathId):paths;
  const followable=useMemo(()=>availablePaths.filter(item=>!followedIds.has(item.id)),[availablePaths,followedIds]);
  const visibleAvailable=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return followable;
    return followable.filter(item=>[item.name,item.target_role,item.target_outcome].join(' ').toLowerCase().includes(q));
  },[followable,query]);

  async function mutate(action:string,pathId:string){
    setBusy(`${action}:${pathId}`);setError('');
    try{
      const response=await fetch('/api/member/capability-paths',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,path_id:pathId})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to update your Capability Path.');
      router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:'Unable to update your Capability Path.');}
    finally{setBusy(null)}
  }

  async function unfollow(pathId:string,name:string){
    if(!window.confirm(`Stop following ${name}? Your project work and Verified Proof will remain unchanged.`))return;
    await mutate('unfollow',pathId);
  }

  return <section className="mcpPanel" aria-label="Capability Path management">
    {error&&<p className="mcpError" role="alert">{error}</p>}

    <section className="mcpSection" aria-labelledby="primary-direction-heading">
      <div className="mcpSectionHead">
        <div><span className="mcpEyebrow">PRIMARY DIRECTION</span><h2 id="primary-direction-heading">The Path guiding your recommendations</h2><p>Your primary Path gives Mettelo direction. It does not replace applications, team formation, project work or Verified Proof.</p></div>
        {primary&&<Link className="mcpTextLink" href="/member/recommended">See recommendations →</Link>}
      </div>
      {primary?<PrimaryDirection path={primary} busy={busy} mutate={mutate} unfollow={unfollow}/>:<EmptyDirection/>}
    </section>

    {otherPaths.length>0&&<section className="mcpSection" aria-labelledby="other-directions-heading">
      <div className="mcpSectionHead"><div><span className="mcpEyebrow">YOUR PATHS</span><h2 id="other-directions-heading">Other directions you follow</h2><p>Keep several professional directions without fragmenting your project history.</p></div><span className="mcpCountLabel">{otherPaths.length} {otherPaths.length===1?'Path':'Paths'}</span></div>
      <div className="mcpOtherGrid">{otherPaths.map(path=><SecondaryPath key={path.pathId} path={path} busy={busy} mutate={mutate} unfollow={unfollow}/>)}</div>
    </section>}

    <section className="mcpSection mcpExplore" id="explore-capability-paths" aria-labelledby="explore-paths-heading">
      <div className="mcpExploreHead">
        <div><span className="mcpEyebrow">EXPLORE CAPABILITY PATHS</span><h2 id="explore-paths-heading">Find another professional direction</h2><p>Browse by capability or target role. Following a Path changes guidance, not your existing work, applications or Proof.</p></div>
        <Link className="mcpButton mcpSoft" href="/projects/paths">View public Path library</Link>
      </div>
      {followable.length>0?<>
        <label className="mcpSearch"><span className="mcpSrOnly">Search Capability Paths</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by capability or target role"/></label>
        {visibleAvailable.length>0?<div className="mcpPathGrid">{visibleAvailable.map(path=><AvailablePathCard key={path.id} path={path} busy={busy} mutate={mutate}/>)}</div>:<div className="mcpSearchEmpty" role="status"><strong>No Paths match that search.</strong><span>Try a broader capability or role term.</span><button type="button" onClick={()=>setQuery('')}>Clear search</button></div>}
      </>:<div className="mcpAllFollowed"><strong>You follow every currently published Capability Path.</strong><span>You can manage primary direction, pause or unfollow Paths above.</span></div>}
    </section>

    {primary&&<p className="mcpFoot">Primary direction guides recommendations only. Changing it does not remove project work, applications, memberships, completed work or Verified Proof from another Path.</p>}
    <style jsx global>{styles}</style>
  </section>;
}

function PrimaryDirection({path,busy,mutate,unfollow}:{path:MemberCapabilityPathProgress;busy:string|null;mutate:Mutate;unfollow:(pathId:string,name:string)=>Promise<void>}){
  const next=path.nextProject;
  const actionable=path.nextAvailableProject;
  const archived=path.pathStatus==='archived';
  const paused=path.followStatus==='paused';
  const complete=path.totalProjects>0&&path.completedProjects===path.totalProjects;
  const progress=Math.round(path.completionRatio*100);
  const status=archived?'Historical':paused?'Paused':'Following';
  const availability=next?.availabilityLabel||(complete?'Complete':'No next project yet');

  return <div className="mcpDirectionGrid">
    <article className="mcpPrimaryCard" aria-labelledby={`primary-path-${path.pathId}`}>
      <div className="mcpPrimaryTop">
        <div><span className="mcpEyebrow">{path.name}</span><h3 id={`primary-path-${path.pathId}`}>{path.targetRole}</h3><p>{path.targetOutcome}</p></div>
        <span className="mcpStatusPill">{status}</span>
      </div>
      <div className="mcpProgressRow"><div className="mcpProgress" role="progressbar" aria-valuemin={0} aria-valuemax={path.totalProjects||1} aria-valuenow={path.completedProjects} aria-label={`${path.completedProjects} of ${path.totalProjects} Path projects completed`}><span style={{width:`${progress}%`}}/></div><strong>{path.completedProjects} / {path.totalProjects} completed</strong></div>
      <div className="mcpMetrics"><div><small>Current stage</small><strong>{path.currentStage||'Not started'}</strong></div><div><small>Verified Proof</small><strong>{path.verifiedProjects} {path.verifiedProjects===1?'project':'projects'}</strong></div><div><small>Path status</small><strong>{status}</strong></div></div>

      {archived?<Notice title="Historical Path" text="Your completed work and Verified Proof remain preserved, but this Path no longer guides new recommendations."/>:paused?<Notice title="Path paused" text="Your progress is preserved. Resume this Path when you want it to guide recommendations again."/>:complete?<Notice title="Visible Path projects completed" text="Path completion reflects completed project work. Verified Proof remains a separate reviewed evidence signal."/>:next?<div className="mcpNextCard"><div className="mcpNextTop"><span className="mcpEyebrow">NEXT · PROJECT {next.position}</span><span className={`mcpAvailability ${next.available?'isAvailable':''}`}>{availability}</span></div><h4>{next.projectTitle||'Upcoming project'}</h4><p>{next.capabilityBuilt}</p>{!next.available&&actionable&&actionable.projectId!==next.projectId&&<small>Nearest available in this Path: Project {actionable.position} · {actionable.projectTitle}</small>}<div className="mcpPrimaryActions">{actionable&&!archived&&!paused&&<Link className="mcpButton mcpDark" href={`/member/discover?path=${encodeURIComponent(path.slug)}`}>View Path projects</Link>}<Link className="mcpButton" href={`/projects/paths/${path.slug}`}>View full roadmap</Link><ManageMenu path={path} busy={busy} mutate={mutate} unfollow={unfollow}/></div></div>:<div className="mcpPrimaryActions"><Link className="mcpButton" href={`/projects/paths/${path.slug}`}>View full roadmap</Link><ManageMenu path={path} busy={busy} mutate={mutate} unfollow={unfollow}/></div>}
    </article>

    <aside className="mcpJourney" aria-labelledby="path-progress-explainer">
      <span className="mcpEyebrow">HOW PROGRESS WORKS</span><h3 id="path-progress-explainer">Direction, not a course.</h3><p>Your Path recommends useful work. The existing Mettelo lifecycle still decides when a project can start.</p>
      <ol><li><span>01</span><div><strong>Choose direction</strong><small>Follow one or several professional Paths.</small></div></li><li><span>02</span><div><strong>Join real work</strong><small>Use the normal application and team-formation process.</small></div></li><li><span>03</span><div><strong>Contribute with a team</strong><small>Work starts only when required team composition is ready.</small></div></li><li><span>04</span><div><strong>Build credible Proof</strong><small>Reviewed contribution remains the evidence layer.</small></div></li></ol>
    </aside>
  </div>;
}

function SecondaryPath({path,busy,mutate,unfollow}:{path:MemberCapabilityPathProgress;busy:string|null;mutate:Mutate;unfollow:(pathId:string,name:string)=>Promise<void>}){
  const progress=Math.round(path.completionRatio*100);
  const paused=path.followStatus==='paused';
  const archived=path.pathStatus==='archived';
  return <article className="mcpSecondary"><div className="mcpSecondaryTop"><div><span className="mcpEyebrow">{archived?'HISTORICAL':paused?'PAUSED':'SECONDARY PATH'}</span><h3>{path.name}</h3><p>{path.targetRole}</p></div><Link className="mcpTextLink" href={`/projects/paths/${path.slug}`}>Open →</Link></div><div className="mcpMiniProgress"><span style={{width:`${progress}%`}}/></div><div className="mcpSecondaryMeta"><span>{path.completedProjects} of {path.totalProjects} completed</span><span>{path.currentStage||'Not started'}</span></div><ManageMenu path={path} busy={busy} mutate={mutate} unfollow={unfollow} compact/></article>;
}

function AvailablePathCard({path,busy,mutate}:{path:AvailablePath;busy:string|null;mutate:Mutate}){
  return <article className="mcpAvailable"><span className="mcpEyebrow">PROFESSIONAL DIRECTION</span><h3>{path.name}</h3><strong>{path.target_role}</strong><p>{path.target_outcome}</p><div className="mcpAvailableActions"><Link className="mcpTextLink" href={`/projects/paths/${path.slug}`}>View roadmap</Link><button className="mcpButton" type="button" disabled={Boolean(busy)} onClick={()=>mutate('follow',path.id)}>{busy===`follow:${path.id}`?'Following…':'Follow'}</button></div></article>;
}

function EmptyDirection(){return <div className="mcpEmpty"><div><span className="mcpEyebrow">START WITH DIRECTION</span><h3>No Capability Path followed yet</h3><p>Projects remain available without a Path. Follow one when you want a professional direction to guide what Mettelo recommends next.</p></div><a className="mcpButton mcpDark" href="#explore-capability-paths">Explore Capability Paths</a></div>}

function ManageMenu({path,busy,mutate,unfollow,compact=false}:{path:MemberCapabilityPathProgress;busy:string|null;mutate:Mutate;unfollow:(pathId:string,name:string)=>Promise<void>;compact?:boolean}){
  const paused=path.followStatus==='paused';
  const archived=path.pathStatus==='archived';
  return <details className={`mcpManage ${compact?'isCompact':''}`}><summary className={compact?'mcpTextButton':'mcpButton'} aria-label={`Manage ${path.name}`}>Manage</summary><div className="mcpManageMenu">{!path.isPrimary&&!paused&&!archived&&<button type="button" disabled={Boolean(busy)} onClick={()=>mutate('set_primary',path.pathId)}>Make primary</button>}{paused&&!archived&&<button type="button" disabled={Boolean(busy)} onClick={()=>mutate('resume',path.pathId)}>Resume Path</button>}{!paused&&!archived&&<button type="button" disabled={Boolean(busy)} onClick={()=>mutate('pause',path.pathId)}>Pause Path</button>}<button className="danger" type="button" disabled={Boolean(busy)} onClick={()=>unfollow(path.pathId,path.name)}>Unfollow Path</button></div></details>;
}

function Notice({title,text}:{title:string;text:string}){return <div className="mcpNotice"><strong>{title}</strong><span>{text}</span></div>}

const styles=`
.mcpPanel{margin:0;color:#10131d;min-width:0}.mcpSection{margin-top:28px}.mcpSectionHead,.mcpExploreHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:12px}.mcpSectionHead h2,.mcpExploreHead h2{margin:5px 0 4px;font:760 clamp(23px,3vw,29px)/1.12 var(--font-space-grotesk),Inter,sans-serif;letter-spacing:-.035em}.mcpSectionHead p,.mcpExploreHead p{margin:0;max-width:780px;color:#5b6472;font-size:12.5px;line-height:1.55}.mcpEyebrow{font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.1em;color:#8b5a17;text-transform:uppercase}.mcpTextLink{color:#2a2f52;font-size:11.5px;font-weight:850;text-decoration:none;min-height:40px;display:inline-flex;align-items:center}.mcpCountLabel{color:#68727d;font-size:11px}.mcpDirectionGrid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(280px,.7fr);gap:16px}.mcpPrimaryCard{border:1px solid #dcccae;border-left:5px solid #c6892a;border-radius:18px;background:linear-gradient(140deg,#fff 0%,#fff 66%,#fbf5e9 100%);padding:22px;box-shadow:0 14px 38px rgba(16,19,29,.06);min-width:0}.mcpPrimaryTop{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.mcpPrimaryTop h3{margin:6px 0 5px;font:780 clamp(25px,3.3vw,36px)/1.06 var(--font-space-grotesk),Inter,sans-serif;letter-spacing:-.04em;overflow-wrap:anywhere}.mcpPrimaryTop p{margin:0;max-width:760px;color:#5b6472;font-size:12.5px;line-height:1.55}.mcpStatusPill{background:#edf6f0;color:#1f6b49;font-size:10px;font-weight:850;padding:7px 10px;border-radius:999px;white-space:nowrap}.mcpProgressRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;margin-top:20px}.mcpProgress{height:9px;border-radius:999px;background:#ece7dc;overflow:hidden}.mcpProgress span{display:block;height:100%;background:#c6892a;border-radius:inherit}.mcpProgressRow>strong{font-size:11px;color:#5b6472}.mcpMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.mcpMetrics>div{padding:11px;border:1px solid #ece8df;border-radius:11px;background:#f8f7f3;min-width:0}.mcpMetrics small{display:block;color:#8b93a1;font:800 8.5px var(--font-plex-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.07em}.mcpMetrics strong{display:block;margin-top:4px;font-size:11.5px;overflow-wrap:anywhere}.mcpNextCard{margin-top:16px;padding:15px;border:1px solid #e1d5bf;border-radius:13px;background:#fbf7ee}.mcpNextTop{display:flex;justify-content:space-between;gap:12px;align-items:center}.mcpAvailability{padding:6px 9px;border:1px solid #e7e1d6;border-radius:999px;background:#fff;color:#59636f;font-size:9.5px;font-weight:850;white-space:nowrap}.mcpAvailability.isAvailable{background:#edf6f0;color:#1f6b49;border-color:#cde4d5}.mcpNextCard h4{margin:7px 0 5px;font-size:17px;line-height:1.3}.mcpNextCard p{margin:0;color:#5b6472;font-size:12px;line-height:1.52}.mcpNextCard>small{display:block;margin-top:7px;color:#8b5a17;font-size:10px}.mcpPrimaryActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-items:flex-start}.mcpButton{min-height:44px;padding:0 14px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#10131d;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:11.5px;font-weight:850;cursor:pointer}.mcpDark{background:#10131d;border-color:#10131d;color:#fff}.mcpSoft{background:#fbf7ee;border-color:#ddcfb3;color:#8b5a17}.mcpJourney{border-radius:18px;background:#10131d;color:#fff;padding:21px;min-width:0}.mcpJourney .mcpEyebrow{color:#e0ad59}.mcpJourney h3{margin:6px 0 7px;font-size:22px;letter-spacing:-.025em}.mcpJourney>p{margin:0;color:#c4cad3;font-size:12px;line-height:1.55}.mcpJourney ol{list-style:none;padding:0;margin:17px 0 0;display:grid;gap:11px}.mcpJourney li{display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px}.mcpJourney li>span{width:30px;height:30px;border:1px solid #50586b;border-radius:8px;display:grid;place-items:center;color:#e0ad59;font-size:9px;font-weight:900}.mcpJourney li strong{display:block;font-size:12px}.mcpJourney li small{display:block;margin-top:2px;color:#aeb6c1;font-size:10.5px;line-height:1.4}.mcpOtherGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.mcpSecondary{border:1px solid #e7e1d6;border-radius:14px;background:#fff;padding:15px;min-width:0}.mcpSecondaryTop{display:flex;justify-content:space-between;gap:12px}.mcpSecondary h3{margin:5px 0 3px;font-size:17px}.mcpSecondary p{margin:0;color:#5b6472;font-size:11.5px}.mcpMiniProgress{height:6px;border-radius:999px;background:#ede9e0;margin-top:13px;overflow:hidden}.mcpMiniProgress span{display:block;height:100%;background:#373e70}.mcpSecondaryMeta{display:flex;justify-content:space-between;gap:10px;margin-top:8px;color:#5b6472;font-size:10.5px}.mcpSecondary>.mcpManage{margin-top:11px}.mcpExplore{border:1px solid #e7e1d6;border-radius:18px;background:#fff;padding:20px}.mcpSearch{display:block;margin-top:14px}.mcpSearch input{width:100%;height:46px;border:1px solid #cbd1d8;border-radius:10px;background:#fff;padding:0 13px;color:#10131d}.mcpPathGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:14px}.mcpAvailable{display:flex;flex-direction:column;min-height:190px;border:1px solid #e7e1d6;border-radius:13px;padding:15px;background:#fff;min-width:0}.mcpAvailable h3{margin:7px 0 3px;font-size:17px}.mcpAvailable>strong{font-size:11.5px;color:#2a2f52}.mcpAvailable p{margin:7px 0 0;color:#5b6472;font-size:11.5px;line-height:1.5}.mcpAvailableActions{margin-top:auto;padding-top:13px;display:flex;justify-content:space-between;gap:10px;align-items:center}.mcpManage{position:relative;width:max-content}.mcpManage summary{list-style:none;cursor:pointer}.mcpManage summary::-webkit-details-marker{display:none}.mcpTextButton{border:0;background:transparent;color:#2a2f52;padding:0;font-size:10.5px;font-weight:850;min-height:36px;display:inline-flex;align-items:center}.mcpManageMenu{position:absolute;z-index:20;left:0;top:calc(100% + 5px);width:190px;padding:6px;border:1px solid #d8dde3;border-radius:10px;background:#fff;box-shadow:0 12px 30px rgba(16,19,29,.14);display:grid;gap:3px}.mcpManageMenu button{min-height:40px;border:0;border-radius:7px;background:#fff;text-align:left;padding:0 9px;color:#10131d;font-size:11px;font-weight:750}.mcpManageMenu button:hover{background:#f5f3ed}.mcpManageMenu .danger{color:#7b2921}.mcpNotice,.mcpEmpty,.mcpAllFollowed,.mcpSearchEmpty{padding:16px;border:1px solid #e7e1d6;border-radius:13px;background:#fff}.mcpNotice{display:grid;gap:4px;margin-top:15px;background:#fbf7ee;border-color:#ddcfb3}.mcpNotice strong,.mcpEmpty h3{font-size:14px}.mcpNotice span,.mcpEmpty p,.mcpAllFollowed span,.mcpSearchEmpty span{color:#5b6472;font-size:11.5px;line-height:1.5}.mcpEmpty{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center}.mcpEmpty h3{margin:5px 0}.mcpEmpty p{margin:0}.mcpAllFollowed,.mcpSearchEmpty{display:grid;gap:4px;margin-top:14px}.mcpSearchEmpty button{width:max-content;margin-top:6px;border:0;background:transparent;padding:0;color:#2a2f52;font-weight:850}.mcpFoot{margin:13px 0 0;color:#5b6472;font-size:10.5px}.mcpError{margin:18px 0 0;padding:10px 12px;background:#fff0ef;border:1px solid #e1b7b2;border-radius:9px;color:#7b2921;font-size:12px}.mcpSrOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.mcpButton:focus-visible,.mcpTextLink:focus-visible,.mcpManage summary:focus-visible,.mcpManageMenu button:focus-visible,.mcpSearch input:focus-visible,.mcpSearchEmpty button:focus-visible{outline:3px solid #e0ad59;outline-offset:3px}.mcpButton:disabled,.mcpManageMenu button:disabled{opacity:.5;cursor:not-allowed}@media(max-width:1040px){.mcpDirectionGrid{grid-template-columns:1fr}.mcpJourney{display:none}.mcpPathGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.mcpSection{margin-top:22px}.mcpSectionHead,.mcpExploreHead{align-items:flex-start;flex-direction:column;gap:7px}.mcpPrimaryCard{padding:16px;border-radius:15px}.mcpPrimaryTop{display:grid}.mcpStatusPill{width:max-content}.mcpPrimaryTop h3{font-size:24px}.mcpMetrics{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.mcpMetrics>div{padding:9px 8px}.mcpNextTop{align-items:flex-start}.mcpPrimaryActions{display:grid;grid-template-columns:1fr 1fr}.mcpPrimaryActions>.mcpButton,.mcpPrimaryActions>.mcpManage{width:100%}.mcpPrimaryActions>.mcpManage>.mcpButton{width:100%}.mcpManageMenu{position:static;width:100%;box-shadow:none;margin-top:5px}.mcpOtherGrid,.mcpPathGrid{grid-template-columns:1fr}.mcpExplore{padding:15px}.mcpAvailable{min-height:0}.mcpEmpty{grid-template-columns:1fr}.mcpEmpty>.mcpButton{width:100%}}@media(max-width:430px){.mcpMetrics{grid-template-columns:1fr 1fr}.mcpMetrics>div:last-child{grid-column:1/-1}.mcpProgressRow{grid-template-columns:1fr}.mcpPrimaryActions{grid-template-columns:1fr}.mcpSecondaryMeta{display:grid;gap:3px}.mcpExploreHead>.mcpButton{width:100%}}@media(prefers-reduced-motion:reduce){.mcpPanel *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;
