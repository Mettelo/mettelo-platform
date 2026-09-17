'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import type {MemberCapabilityPathProgress} from '@/lib/member-capability-paths';

type Continuation={completedProjects:number;verifiedProof:number;completedAsLead:number};

export default function MemberProjectsCapabilityPathStrip(){
  const pathname=usePathname();
  const [primary,setPrimary]=useState<MemberCapabilityPathProgress|null>(null);
  const [continuation,setContinuation]=useState<Continuation|null>(null);

  useEffect(()=>{
    if(pathname!=='/member/projects')return;
    let active=true;
    Promise.all([
      fetch('/api/member/capability-paths',{cache:'no-store'}).then(async response=>response.ok?response.json():{items:[]}),
      fetch('/api/member/project-continuation',{cache:'no-store'}).then(async response=>response.ok?response.json():null)
    ]).then(([pathBody,continuationBody])=>{
      if(!active)return;
      const items=Array.isArray(pathBody.items)?pathBody.items as MemberCapabilityPathProgress[]:[];
      setPrimary(items.find(item=>item.isPrimary)||null);
      setContinuation(continuationBody&&typeof continuationBody.completedProjects==='number'?continuationBody:null);
    }).catch(()=>{if(active){setPrimary(null);setContinuation(null)}});
    return()=>{active=false};
  },[pathname]);

  if(pathname!=='/member/projects')return null;
  const hasCompleted=Boolean(continuation?.completedProjects);
  if(!primary&&!hasCompleted)return null;
  const state=primary?(primary.pathStatus==='archived'?'Historical Path':primary.followStatus==='paused'?'Path paused':primary.nextProject?`Next in Path: Project ${primary.nextProject.position} · ${primary.nextProject.projectTitle}`:'Visible Path projects complete'):null;

  return <div className="mppContinuation">
    {primary&&<aside className="mppStrip" aria-label="Primary Capability Path"><div><span>PRIMARY DIRECTION</span><strong>{primary.name}</strong><p>{primary.completedProjects} of {primary.totalProjects} projects completed · {primary.verifiedProjects} with Verified Proof{primary.currentStage?` · ${primary.currentStage}`:''}</p></div><div><small>{state}</small><Link href="/member/paths">Continue capability path →</Link></div></aside>}
    {hasCompleted&&<aside className="mppNext" aria-labelledby="project-continuation-title"><div><span>WHAT COMES NEXT</span><strong id="project-continuation-title">Turn completed work into your next useful step.</strong><p>No automatic enrolment. Choose the action that fits your goals now.</p></div><nav aria-label="After project completion"><Link href="/member/profile">Update profile</Link><Link href="/member/discover">Find next project</Link><Link href="/opportunities">Explore opportunities</Link>{Boolean(continuation?.verifiedProof)&&<Link href="/member/proof">View Verified Proof</Link>}{Boolean(continuation?.completedAsLead)&&<Link href="/member/proof">Review leadership evidence</Link>}{primary&&<Link href="/member/paths">Advance capability path</Link>}</nav></aside>}
    <style jsx global>{`.mppContinuation{display:grid;gap:10px}.mppStrip,.mppNext{width:100%;margin:18px 0 0;padding:12px 15px;border:1px solid #d8dde3;border-left:3px solid #c6892a;border-radius:11px;background:#fbf7ee;color:#111318;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;min-width:0;box-sizing:border-box}.mppNext{margin-top:0;background:#fff}.mppStrip span,.mppNext span{display:block;font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.09em;color:#8b5a17}.mppStrip strong,.mppNext strong{display:block;margin-top:3px;font-size:13px}.mppStrip p,.mppNext p{margin:2px 0 0;color:#59636f;font-size:11px;overflow-wrap:anywhere}.mppStrip>div:last-of-type{display:grid;justify-items:end;gap:4px;text-align:right;min-width:0}.mppStrip small{color:#59636f;overflow-wrap:anywhere;max-width:680px}.mppStrip a,.mppNext a{min-height:44px;padding:0 10px;border-radius:8px;color:#8b5a17;display:inline-flex;align-items:center;font-size:11px;font-weight:800;text-decoration:none}.mppNext nav{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.mppNext a{border:1px solid #d8dde3;background:#fff}.mppStrip a:focus-visible,.mppNext a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:680px){.mppStrip,.mppNext{grid-template-columns:1fr;margin-top:14px}.mppNext{margin-top:0}.mppStrip>div:last-of-type{justify-items:start;text-align:left}.mppStrip a{padding-left:0}.mppNext nav{justify-content:flex-start}}@media(max-width:360px){.mppNext nav{display:grid;grid-template-columns:1fr;width:100%}.mppNext a{width:100%;box-sizing:border-box;justify-content:center}}`}</style>
  </div>;
}
