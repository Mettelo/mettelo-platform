'use client';

import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import type {MemberCapabilityPathProgress} from '@/lib/member-capability-paths';

export default function MetteloLabCapabilityPathContext(){
  const params=useParams<{id:string}>();const projectId=String(params?.id||'');const [paths,setPaths]=useState<MemberCapabilityPathProgress[]>([]);
  useEffect(()=>{let active=true;fetch('/api/member/capability-paths',{cache:'no-store'}).then(async response=>response.ok?response.json():{items:[]}).then(body=>{if(active)setPaths(Array.isArray(body.items)?body.items:[])}).catch(()=>{if(active)setPaths([])});return()=>{active=false}},[]);
  const match=useMemo(()=>paths.flatMap(path=>path.placements.filter(item=>item.projectId===projectId).map(item=>({path,item}))).sort((a,b)=>Number(b.path.isPrimary)-Number(a.path.isPrimary))[0]||null,[paths,projectId]);
  if(!match)return null;
  return <aside className="mlCapabilityContext" aria-label="Why this project matters in your Capability Path">
    <div><span>WHY THIS PROJECT MATTERS</span><strong>{match.path.name} · Project {match.item.position} · {match.item.stageName}</strong><p>{match.item.capabilityBuilt}{match.item.competencyFocus?` · Focus: ${match.item.competencyFocus}`:''}</p></div>
    <div><small>{match.item.completed?'Completed in this Path':'Part of your followed Path'}{match.item.verified?' · Verified Proof exists':''}</small><Link href={`/projects/paths/${match.path.slug}`}>View Path roadmap →</Link></div>
    <style jsx global>{`.mlCapabilityContext{margin:0 0 14px;padding:12px 14px;border:1px solid #d8dde3;border-left:3px solid #c6892a;border-radius:11px;background:#fbf7ee;color:#111318;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;min-width:0}.mlCapabilityContext span{display:block;font:800 9px var(--font-plex-mono),monospace;letter-spacing:.09em;color:#8b5a17}.mlCapabilityContext strong{display:block;margin-top:4px;font-size:13px;overflow-wrap:anywhere}.mlCapabilityContext p{margin:3px 0 0;color:#59636f;font-size:11px;line-height:1.5}.mlCapabilityContext>div:last-of-type{display:grid;justify-items:end;gap:4px;text-align:right}.mlCapabilityContext small{color:#59636f}.mlCapabilityContext a{color:#8b5a17;font-size:11px;font-weight:800}.mlCapabilityContext a:focus-visible{outline:3px solid #e0ad59;outline-offset:2px}@media(max-width:680px){.mlCapabilityContext{grid-template-columns:1fr}.mlCapabilityContext>div:last-of-type{justify-items:start;text-align:left}}`}</style>
  </aside>;
}
