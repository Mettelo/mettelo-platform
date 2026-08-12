'use client';

import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';

const groups=[
  {key:'overview',label:'Overview',description:'Status, progress and the next place to work.',areas:[]},
  {key:'plan',label:'Plan',description:'Define the problem and governed data sources.',areas:[['problem','Problem'],['data-sources','Data']]},
  {key:'work',label:'Work',description:'Organise workstreams, tasks and reviewed deliverables.',areas:[['workstreams','Workstreams'],['delivery','Tasks'],['deliverables','Deliverables']]},
  {key:'team',label:'Team',description:'Collaborate with the team and share project resources.',areas:[['team','Members'],['discussion','Discussion'],['resources','Resources']]},
  {key:'events',label:'Events',description:'Run working sessions, reviews and final presentations.',areas:[['meetings','Schedule & sessions'],['presentation','Final presentation']]},
  {key:'finish',label:'Finish',description:'Complete verified Proof and project close-out.',areas:[['proof','Proof'],['completion','Completion']]},
] as const;

const ids=groups.flatMap(group=>group.areas.map(([id])=>id));
type GroupKey=(typeof groups)[number]['key'];

function groupForArea(area:string){return groups.find(group=>group.areas.some(([id])=>id===area));}

export default function WorkspaceRouteTabs({preview=false}:{preview?:boolean}={}){
  const pathname=usePathname();
  const params=useSearchParams();
  const isWorkspace=preview||/^\/member\/projects\/[^/]+$/.test(pathname);
  const rawView=params.get('view')||'overview';
  const legacyGroup=groupForArea(rawView);
  const recognisedGroup=groups.find(group=>group.key===rawView);
  const activeGroup=legacyGroup||recognisedGroup||groups[0];
  const groupKey=activeGroup.key as GroupKey;
  const requestedArea=params.get('area')||legacyGroup?.areas.find(([id])=>id===rawView)?.[0];
  const activeArea=activeGroup.areas.some(([id])=>id===requestedArea)?requestedArea:activeGroup.areas[0]?.[0];
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef<HTMLDivElement>(null);

  const hrefFor=(key:GroupKey,area?:string)=>{
    const next=new URLSearchParams(params.toString());
    next.set('view',key);
    if(area)next.set('area',area);else next.delete('area');
    return `${pathname}?${next.toString()}`;
  };

  useEffect(()=>{
    if(!isWorkspace)return;
    const originalNav=document.querySelector<HTMLElement>('.workspaceNav');
    if(originalNav)originalNav.style.display='none';
    const blocks=ids.map(id=>document.getElementById(id)).filter(Boolean) as HTMLElement[];
    blocks.forEach(node=>{node.style.display=groupKey!=='overview'&&node.id===activeArea?'':'none';});
    return()=>{
      if(originalNav)originalNav.style.display='';
      blocks.forEach(node=>node.style.display='');
    };
  },[activeArea,groupKey,isWorkspace]);

  useEffect(()=>{setMenuOpen(false)},[groupKey,activeArea,pathname]);
  useEffect(()=>{
    function closeOutside(event:PointerEvent){if(!menuRef.current?.contains(event.target as Node))setMenuOpen(false)}
    function closeOnEscape(event:KeyboardEvent){if(event.key==='Escape')setMenuOpen(false)}
    document.addEventListener('pointerdown',closeOutside);
    document.addEventListener('keydown',closeOnEscape);
    return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',closeOnEscape)};
  },[]);

  if(!isWorkspace)return null;
  return <>
    <nav className="routedWorkspaceNav" aria-label="Project workspace sections">
      {groups.map(group=><Link aria-current={groupKey===group.key?'page':undefined} className={groupKey===group.key?'active':''} href={hrefFor(group.key,group.areas[0]?.[0])} key={group.key}>{group.label}</Link>)}
    </nav>
    <div className="workspaceMobileMenu" ref={menuRef}>
      <button type="button" className="workspaceMobileTrigger" aria-expanded={menuOpen} aria-controls="workspace-mobile-sections" onClick={()=>setMenuOpen(open=>!open)}>
        <span><small>PROJECT WORKSPACE</small><strong>{activeGroup.label}{activeArea?` · ${activeGroup.areas.find(([id])=>id===activeArea)?.[1]||''}`:''}</strong></span>
        <span aria-hidden="true">{menuOpen?'×':'⌄'}</span>
      </button>
      {menuOpen&&<nav id="workspace-mobile-sections" className="workspaceMobilePanel" aria-label="Choose a workspace section">
        {groups.map(group=><Link aria-current={groupKey===group.key?'page':undefined} className={groupKey===group.key?'active':''} href={hrefFor(group.key,group.areas[0]?.[0])} onClick={()=>setMenuOpen(false)} key={group.key}><span><strong>{group.label}</strong><small>{group.description}</small></span><span aria-hidden="true">→</span></Link>)}
      </nav>}
    </div>
    {groupKey!=='overview'&&activeGroup.areas.length>1&&<nav className="workspaceAreaNav" aria-label={`${activeGroup.label} areas`}>
      {activeGroup.areas.map(([key,label])=><Link aria-current={activeArea===key?'page':undefined} className={activeArea===key?'active':''} href={hrefFor(activeGroup.key,key)} key={key}>{label}</Link>)}
    </nav>}
    {groupKey==='overview'&&<section className="panel routedWorkspaceOverview">
      <div className="panelHead">
        <div><span className="cardNumber">PROJECT WORKSPACE</span><h3 style={{marginTop:8}}>Move through the project with confidence.</h3></div>
        <span className="chip">5 WORK AREAS</span>
      </div>
      <p className="routedWorkspaceIntro">Start with the plan, organise the work, collaborate with the team, run project events and finish with verified Proof.</p>
      <div className="routedWorkspaceGrid">{groups.slice(1).map(group=><Link className="workspaceOverviewCard" href={hrefFor(group.key,group.areas[0]?.[0])} key={group.key}><span className="workspaceCardIndex">0{groups.findIndex(item=>item.key===group.key)}</span><span><strong>{group.label}</strong><small>{group.description}</small></span><span className="workspaceCardArrow" aria-hidden="true">→</span></Link>)}</div>
    </section>}
    <style jsx>{`
      .routedWorkspaceNav{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:0 0 14px;padding:7px;border:1px solid rgba(16,19,29,.09);border-radius:14px;background:#fff}
      .routedWorkspaceNav :global(a){min-height:44px;display:grid;place-items:center;padding:8px 10px;border-radius:9px;font-size:.76rem;font-weight:760;color:#596371;text-align:center}
      .routedWorkspaceNav :global(a:hover){background:#f2f4f7;color:#10131d}.routedWorkspaceNav :global(a.active){background:#10131d;color:#fff}
      .workspaceMobileMenu{display:none;position:relative;margin-bottom:12px}.workspaceMobileTrigger{width:100%;min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border:1px solid rgba(16,19,29,.11);border-radius:13px;background:#fff;color:#10131d;text-align:left}.workspaceMobileTrigger span:first-child{display:grid;gap:2px}.workspaceMobileTrigger small{font-size:.58rem;letter-spacing:.1em;color:#8b641f;font-weight:800}.workspaceMobileTrigger strong{font-size:.84rem}.workspaceMobileTrigger>span:last-child{font-size:1.25rem}
      .workspaceMobilePanel{position:absolute;z-index:55;top:calc(100% + 7px);left:0;right:0;display:grid;gap:4px;padding:8px;border:1px solid rgba(16,19,29,.1);border-radius:15px;background:#fff;box-shadow:0 20px 50px rgba(16,19,29,.18)}.workspaceMobilePanel :global(a){min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 11px;border-radius:10px;color:#505966}.workspaceMobilePanel :global(a>span:first-child){display:grid;gap:2px}.workspaceMobilePanel :global(a strong){font-size:.78rem;color:#10131d}.workspaceMobilePanel :global(a small){font-size:.65rem;color:#747d89}.workspaceMobilePanel :global(a.active){background:#f7efdd;color:#10131d}
      .workspaceAreaNav{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 18px;padding:3px}.workspaceAreaNav::-webkit-scrollbar{display:none}.workspaceAreaNav :global(a){flex:0 0 auto;min-height:40px;display:grid;place-items:center;padding:8px 12px;border-radius:999px;border:1px solid rgba(16,19,29,.09);background:#fff;color:#596371;font-size:.72rem;font-weight:750;white-space:nowrap}.workspaceAreaNav :global(a.active){border-color:#d2aa5d;background:#f7efdd;color:#10131d}
      .routedWorkspaceOverview{margin-bottom:18px}.routedWorkspaceIntro{max-width:70ch}.routedWorkspaceGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:20px}.routedWorkspaceGrid :global(.workspaceOverviewCard){min-height:112px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:13px;padding:18px;border:1px solid rgba(16,19,29,.1);border-radius:16px;background:#fff;color:#10131d}.routedWorkspaceGrid :global(.workspaceOverviewCard:hover){border-color:#d2aa5d;background:#fffcf6}.routedWorkspaceGrid :global(.workspaceOverviewCard>span:nth-child(2)){display:grid;gap:6px}.routedWorkspaceGrid :global(.workspaceOverviewCard strong){font-size:.9rem}.routedWorkspaceGrid :global(.workspaceOverviewCard small){color:#69727e;font-size:.72rem;line-height:1.45}.routedWorkspaceGrid :global(.workspaceCardIndex){font:700 .63rem var(--font-space);color:#9b6b1e}.routedWorkspaceGrid :global(.workspaceCardArrow){font-weight:800}
      @media(max-width:900px){.routedWorkspaceNav{display:none}.workspaceMobileMenu{display:block}.routedWorkspaceOverview{padding:18px}.routedWorkspaceOverview :global(.panelHead){display:block}.routedWorkspaceOverview :global(.panelHead .chip){display:none}.routedWorkspaceIntro{margin:8px 0 16px;font-size:.86rem;line-height:1.55}.routedWorkspaceGrid{grid-template-columns:1fr;gap:8px;margin-top:14px}.routedWorkspaceGrid :global(.workspaceOverviewCard){min-height:82px;padding:14px}}
    `}</style>
  </>;
}
