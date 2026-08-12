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
        <div><span className="cardNumber">PROJECT WORKSPACE</span><h3 style={{marginTop:8}}>Choose a workspace area.</h3></div>
        <span className="chip">FOCUSED VIEW</span>
      </div>
      <p className="routedWorkspaceIntro">Move directly to the team area, discussion, delivery, meetings, resources, Proof, presentation or completion.</p>
      <div className="grid4 routedWorkspaceGrid">{views.slice(1).map(([key,label])=><Link className="card" href={hrefFor(key)} key={key}><strong>{label}</strong><span className="linkArrow">Open →</span></Link>)}</div>
    </section>}
    <style jsx>{`.routedWorkspaceNav{display:flex;gap:7px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scrollbar-width:none;margin:0 0 18px;padding:8px;border:1px solid rgba(16,19,29,.09);border-radius:12px;background:#fff}.routedWorkspaceNav::-webkit-scrollbar{display:none}.routedWorkspaceNav :global(a){flex:0 0 auto;white-space:nowrap;scroll-snap-align:start;padding:8px 11px;border-radius:8px;font-size:.74rem;font-weight:750;color:#596371}.routedWorkspaceNav :global(a:hover){background:#f2f4f7;color:#10131d}.routedWorkspaceNav :global(a.active){background:#10131d;color:#fff}.routedWorkspaceOverview{margin-bottom:18px}.routedWorkspaceOverview :global(.card){display:grid;gap:8px;min-height:100px}.routedWorkspaceIntro{max-width:70ch}@media(max-width:900px){.routedWorkspaceOverview{padding:18px}.routedWorkspaceOverview :global(.panelHead){display:block}.routedWorkspaceOverview :global(.panelHead .chip){display:none}.routedWorkspaceIntro{margin:8px 0 16px;font-size:.86rem;line-height:1.55}.routedWorkspaceOverview :global(.routedWorkspaceGrid){grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.routedWorkspaceOverview :global(.card){min-height:72px;padding:13px}.routedWorkspaceOverview :global(.card strong){font-size:.82rem}.routedWorkspaceOverview :global(.linkArrow){font-size:.72rem}}`}</style>
  </>;
}
