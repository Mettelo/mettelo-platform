'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import type {MemberCapabilityPathProgress} from '@/lib/member-capability-paths';

export default function MemberProjectsCapabilityPathStrip(){
  const pathname=usePathname();const [primary,setPrimary]=useState<MemberCapabilityPathProgress|null>(null);
  useEffect(()=>{if(pathname!=='/member/projects')return;let active=true;fetch('/api/member/capability-paths',{cache:'no-store'}).then(async response=>response.ok?response.json():{items:[]}).then(body=>{if(!active)return;const items=Array.isArray(body.items)?body.items as MemberCapabilityPathProgress[]:[];setPrimary(items.find(item=>item.isPrimary)||null)}).catch(()=>{if(active)setPrimary(null)});return()=>{active=false}},[pathname]);
  if(pathname!=='/member/projects'||!primary)return null;
  const state=primary.pathStatus==='archived'?'Historical Path':primary.followStatus==='paused'?'Path paused':primary.nextProject?`Next in Path: Project ${primary.nextProject.position} · ${primary.nextProject.projectTitle}`:'Visible Path projects complete';
  return <aside className="mppStrip" aria-label="Primary Capability Path"><div><span>PRIMARY DIRECTION</span><strong>{primary.name}</strong><p>{primary.completedProjects} of {primary.totalProjects} projects completed · {primary.verifiedProjects} with Verified Proof{primary.currentStage?` · ${primary.currentStage}`:''}</p></div><div><small>{state}</small><Link href="/member/paths">View Path →</Link></div><style jsx global>{`.mppStrip{width:100%;margin:18px 0 0;padding:12px 15px;border:1px solid #d8dde3;border-left:3px solid #c6892a;border-radius:11px;background:#fbf7ee;color:#111318;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;min-width:0;box-sizing:border-box}.mppStrip span{display:block;font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.09em;color:#8b5a17}.mppStrip strong{display:block;margin-top:3px;font-size:13px}.mppStrip p{margin:2px 0 0;color:#59636f;font-size:11px;overflow-wrap:anywhere}.mppStrip>div:last-of-type{display:grid;justify-items:end;gap:4px;text-align:right;min-width:0}.mppStrip small{color:#59636f;overflow-wrap:anywhere;max-width:680px}.mppStrip a{min-height:44px;padding:0 10px;border-radius:8px;color:#8b5a17;display:inline-flex;align-items:center;font-size:11px;font-weight:800;text-decoration:none}.mppStrip a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:680px){.mppStrip{grid-template-columns:1fr;margin-top:14px}.mppStrip>div:last-of-type{justify-items:start;text-align:left}.mppStrip a{padding-left:0}}`}</style></aside>;
}
