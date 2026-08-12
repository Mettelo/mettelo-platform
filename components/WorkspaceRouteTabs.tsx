'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect} from 'react';

const views=[['overview','Overview'],['team','Team'],['discussion','Discussion'],['delivery','Delivery'],['meetings','Meetings'],['resources','Resources'],['proof','Proof'],['presentation','Presentation'],['completion','Completion']] as const;
const ids=['team','discussion','delivery','meetings','resources','proof','presentation','completion'];

export default function WorkspaceRouteTabs(){
  const pathname=usePathname();
  const params=useSearchParams();
  const isWorkspace=/^\/member\/projects\/[^/]+$/.test(pathname);
  const view=params.get('view')||'overview';
  const hrefFor=(key:string)=>{
    const next=new URLSearchParams(params.toString());
    next.set('view',key);
    return `${pathname}?${next.toString()}`;
  };

  useEffect(()=>{
    if(!isWorkspace)return;
    const originalNav=document.querySelector<HTMLElement>('.workspaceNav');
    if(originalNav)originalNav.style.display='none';
    const blocks=ids.map(id=>document.getElementById(id)).filter(Boolean) as HTMLElement[];
    blocks.forEach(node=>{node.style.display=node.id===view?'':'none';});
    return()=>{
      if(originalNav)originalNav.style.display='';
      blocks.forEach(node=>node.style.display='');
    };
  },[isWorkspace,view]);

  if(!isWorkspace)return null;

  return <>
    <nav className="routedWorkspaceNav" aria-label="Project workspace views">
      {views.map(([key,label])=><Link className={view===key?'active':''} href={hrefFor(key)} key={key}>{label}</Link>)}
    </nav>
    {view==='overview'&&<section className="panel routedWorkspaceOverview">
      <div className="panelHead">
        <div><span className="cardNumber">PROJECT WORKSPACE</span><h3 style={{marginTop:8}}>Choose the area you need.</h3></div>
        <span className="chip">FOCUSED VIEW</span>
      </div>
      <p>Use the workspace navigation above to move between the team, discussion, delivery, meetings, resources, Proof, presentation and completion controls without one long scrolling page.</p>
      <div className="grid4">{views.slice(1).map(([key,label])=><Link className="card" href={hrefFor(key)} key={key}><strong>{label}</strong><span className="linkArrow">Open →</span></Link>)}</div>
    </section>}
    <style jsx>{`.routedWorkspaceNav{display:flex;gap:7px;overflow:auto;margin:0 0 18px;padding:8px;border:1px solid rgba(16,19,29,.09);border-radius:12px;background:#fff}.routedWorkspaceNav :global(a){white-space:nowrap;padding:8px 11px;border-radius:8px;font-size:.74rem;font-weight:750;color:#596371}.routedWorkspaceNav :global(a:hover){background:#f2f4f7;color:#10131d}.routedWorkspaceNav :global(a.active){background:#10131d;color:#fff}.routedWorkspaceOverview{margin-bottom:18px}.routedWorkspaceOverview :global(.card){display:grid;gap:8px;min-height:100px}`}</style>
  </>;
}
