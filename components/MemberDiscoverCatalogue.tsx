'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import SaveProjectButton from '@/components/SaveProjectButton';
import type {MemberProjectState} from '@/lib/member-project-journey';

type PathContext={name:string;position:number;stage:string;isPrimary:boolean};
type ProjectItem={id:string;title:string;summary:string;state:MemberProjectState;stateLabel:string;action:{label:string;href:string};saved:boolean;workingModel:string|null;durationWeeks:number|null;commitment:string|null;deadline:string|null;createdAt:string;roles:string[];skills:string[];pathContext?:PathContext|null};
type Props={projects:ProjectItem[]};

function formatDeadline(value:string|null){return value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'No fixed deadline'}
function statusClass(state:MemberProjectState){if(['confirmed','active','completed'].includes(state))return'mdStatusMember';if(['application_submitted','application_action_required','application_in_review','team_forming'].includes(state))return'mdStatusApplied';if(state==='open_eligible')return'mdStatusOpen';return'mdStatusQuiet'}

export default function MemberDiscoverCatalogue({projects}:Props){
  const [query,setQuery]=useState('');
  const [role,setRole]=useState('all');
  const [skill,setSkill]=useState('all');
  const [commitment,setCommitment]=useState('all');
  const [workingModel,setWorkingModel]=useState('all');
  const [sort,setSort]=useState<'recent'|'closing'>('recent');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const filterDialog=useRef<HTMLDialogElement>(null);
  const closeFilterButton=useRef<HTMLButtonElement>(null);
  const filterTrigger=useRef<HTMLButtonElement>(null);

  const roles=useMemo(()=>[...new Set(projects.flatMap(item=>item.roles))].sort((a,b)=>a.localeCompare(b)),[projects]);
  const skills=useMemo(()=>[...new Set(projects.flatMap(item=>item.skills))].sort((a,b)=>a.localeCompare(b)),[projects]);
  const commitments=useMemo(()=>[...new Set(projects.map(item=>item.commitment).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b)),[projects]);
  const workingModels=useMemo(()=>[...new Set(projects.map(item=>item.workingModel).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b)),[projects]);

  const filterPairs=[
    {key:'role',label:'Role',value:role==='all'?null:role},
    {key:'skill',label:'Skill',value:skill==='all'?null:skill},
    {key:'commitment',label:'Commitment',value:commitment==='all'?null:commitment},
    {key:'workingModel',label:'Location',value:workingModel==='all'?null:workingModel}
  ].filter(item=>item.value) as {key:string;label:string;value:string}[];
  const activeCount=filterPairs.length;

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const filtered=projects.filter(item=>{
      const pathText=item.pathContext?`${item.pathContext.name} ${item.pathContext.stage}`:'';
      const text=[item.title,item.summary,pathText,...item.roles,...item.skills,item.workingModel||'',item.commitment||''].join(' ').toLowerCase();
      return(!q||text.includes(q))
        &&(role==='all'||item.roles.includes(role))
        &&(skill==='all'||item.skills.includes(skill))
        &&(commitment==='all'||item.commitment===commitment)
        &&(workingModel==='all'||item.workingModel===workingModel);
    });
    return[...filtered].sort((a,b)=>sort==='closing'
      ?(a.deadline?new Date(a.deadline).getTime():Number.MAX_SAFE_INTEGER)-(b.deadline?new Date(b.deadline).getTime():Number.MAX_SAFE_INTEGER)
      :new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
  },[projects,query,role,skill,commitment,workingModel,sort]);

  useEffect(()=>{
    const dialog=filterDialog.current;
    if(!dialog)return;
    if(filtersOpen&&!dialog.open){dialog.showModal();requestAnimationFrame(()=>closeFilterButton.current?.focus())}
    if(!filtersOpen&&dialog.open)dialog.close();
  },[filtersOpen]);

  function clear(){setQuery('');setRole('all');setSkill('all');setCommitment('all');setWorkingModel('all');setSort('recent')}
  function clearFilters(){setRole('all');setSkill('all');setCommitment('all');setWorkingModel('all');setSort('recent')}
  function remove(key:string){if(key==='role')setRole('all');if(key==='skill')setSkill('all');if(key==='commitment')setCommitment('all');if(key==='workingModel')setWorkingModel('all')}
  function closeFilters(){setFiltersOpen(false);requestAnimationFrame(()=>filterTrigger.current?.focus())}

  return <>
    <section className="mdControlsV2" aria-label="Project search and filters">
      <div className="mdSearchRowV2">
        <label className="mdSearchWrapV2">
          <span className="mdSrOnly">Search projects</span>
          <input className="mdSearchV2" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search projects, skills, tools or topics"/>
          <span className="mdSearchGlyphV2" aria-hidden="true">⌕</span>
        </label>
        <button ref={filterTrigger} className="mdButton mdButtonPrimary mdFilterTriggerV2" type="button" onClick={()=>setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}>Filters · {activeCount}</button>
      </div>
      <div className="mdFilterSummaryV2" aria-label="Current catalogue refinements">
        {filterPairs.map(item=><button className="mdActiveChipV2" key={item.key} type="button" onClick={()=>remove(item.key)} aria-label={`Remove ${item.label}: ${item.value} filter`}><span>{item.label}: {item.value}</span><b aria-hidden="true">×</b></button>)}
        <button className="mdPassiveChipV2" type="button" onClick={()=>setFiltersOpen(true)}>Sort: {sort==='recent'?'Recently added':'Closing soon'}</button>
        {activeCount>0&&<button className="mdClearInlineV2" type="button" onClick={clearFilters}>Clear filters</button>}
      </div>
    </section>

    <div className="mdCatalogueHead"><strong>{visible.length} {visible.length===1?'project':'projects'} shown</strong><span>Discover is broad. Recommended is personalised.</span></div>

    {visible.length?<section className="mdProjectGrid" aria-label="Discover projects">
      {visible.map(item=><article className={`mdProjectCard ${item.state==='open_eligible'?'mdCardOpen':''}`} key={item.id}>
        <div className="mdCardTop"><span className={`mdStatus ${statusClass(item.state)}`}>{item.stateLabel}</span><SaveProjectButton projectId={item.id} initialSaved={item.saved} compact/></div>
        {item.pathContext&&<div className="mdPathContext" aria-label={`Capability Path context: ${item.pathContext.name}, Project ${item.pathContext.position}, ${item.pathContext.stage}`}><span>{item.pathContext.isPrimary?'PRIMARY PATH':'PATH'}</span><strong>{item.pathContext.name}</strong><b aria-hidden="true">·</b><span>Project {item.pathContext.position}</span><b aria-hidden="true">·</b><span>{item.pathContext.stage}</span></div>}
        <h2>{item.title}</h2><p>{item.summary}</p>
        <div className="mdFacts">{item.workingModel&&<div><small>Working model</small><strong>{item.workingModel}</strong></div>}{item.durationWeeks&&<div><small>Duration</small><strong>{item.durationWeeks} {item.durationWeeks===1?'week':'weeks'}</strong></div>}{item.commitment&&<div><small>Commitment</small><strong>{item.commitment}</strong></div>}</div>
        {item.roles.length>0&&<div className="mdGroup"><span className="mdLabel">{['confirmed','active','completed'].includes(item.state)?'Project roles':'Open roles'}</span><div className="mdTags">{item.roles.slice(0,4).map(value=><span className="mdTag" key={value}>{value}</span>)}</div></div>}
        {item.skills.length>0&&<div className="mdGroup"><span className="mdLabel">Skills</span><div className="mdTags">{item.skills.slice(0,5).map(value=><span className="mdTag mdSkill" key={value}>{value}</span>)}</div></div>}
        <div className="mdDeadline"><small>{['open_eligible','ineligible'].includes(item.state)?'Applications close':'Your status'}</small><strong>{['open_eligible','ineligible'].includes(item.state)?formatDeadline(item.deadline):item.stateLabel}</strong></div>
        <div className="mdCardActions"><Link className="mdButton mdButtonPrimary" href={item.action.href}>{item.action.label}</Link></div>
      </article>)}
    </section>:<section className="mdEmpty" role="status"><h2>No projects match these filters</h2><p>Try changing your search or removing a filter.</p><button className="mdButton mdButtonPrimary" type="button" onClick={clear}>Clear search and filters</button></section>}

    <section className="mdRecommended" id="recommended"><div><div className="mdEyebrow">WANT A SHORTER LIST?</div><h2>See projects matched to you</h2><p>Recommended uses your profile and primary Capability Path where relevant. Discover stays broad so a Path never restricts what you can explore.</p></div><Link className="mdButton mdButtonPrimary" href="/member/recommended">View Recommended</Link></section>

    <dialog className="mdFilterDialogV2" ref={filterDialog} onClose={()=>{setFiltersOpen(false);requestAnimationFrame(()=>filterTrigger.current?.focus())}} aria-labelledby="member-filter-title" aria-describedby="member-filter-description">
      <section className="mdFilterPanelV2">
        <div className="mdGrabberV2" aria-hidden="true"/>
        <div className="mdFilterHeadV2">
          <div><div className="mdEyebrow">Refine catalogue</div><h2 id="member-filter-title">Filter projects</h2></div>
          <button ref={closeFilterButton} className="mdIconButtonV2" type="button" onClick={closeFilters} aria-label="Close project filters">×</button>
        </div>
        <p id="member-filter-description" className="mdFilterIntroV2">Choose only what helps narrow the catalogue. Capability Path context is managed separately.</p>
        <div className="mdFilterGridV2">
          <label><span>Role</span><select className="mdSelectV2" value={role} onChange={event=>setRole(event.target.value)}><option value="all">All roles</option>{roles.map(value=><option key={value}>{value}</option>)}</select></label>
          <label><span>Skill</span><select className="mdSelectV2" value={skill} onChange={event=>setSkill(event.target.value)}><option value="all">All skills</option>{skills.map(value=><option key={value}>{value}</option>)}</select></label>
          <label><span>Commitment</span><select className="mdSelectV2" value={commitment} onChange={event=>setCommitment(event.target.value)}><option value="all">Any commitment</option>{commitments.map(value=><option key={value}>{value}</option>)}</select></label>
          <label><span>Location / working model</span><select className="mdSelectV2" value={workingModel} onChange={event=>setWorkingModel(event.target.value)}><option value="all">Any location</option>{workingModels.map(value=><option key={value}>{value}</option>)}</select></label>
          <label><span>Sort by</span><select className="mdSelectV2" value={sort} onChange={event=>setSort(event.target.value as 'recent'|'closing')}><option value="recent">Recently added</option><option value="closing">Closing soon</option></select></label>
        </div>
        <div className="mdFilterActionsV2"><button className="mdButton" type="button" onClick={clearFilters}>Clear all</button><button className="mdButton mdButtonPrimary" type="button" onClick={closeFilters}>Show {visible.length} {visible.length===1?'project':'projects'}</button></div>
      </section>
    </dialog>
    <style jsx global>{styles}</style>
  </>;
}

const styles=`
.mdSrOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.mdEyebrow,.mdLabel{font-family:var(--font-plex-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.11em}.mdEyebrow{font-size:10px;color:#72551e;font-weight:700}.mdButton{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;font-size:13px;font-weight:800}.mdButtonPrimary{background:#111318;border-color:#111318;color:#fff}.mdButton:focus-visible,.mdSelectV2:focus-visible,.mdSearchV2:focus-visible,.mdActiveChipV2:focus-visible,.mdPassiveChipV2:focus-visible,.mdClearInlineV2:focus-visible,.mdIconButtonV2:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
.mdControlsV2{margin:8px 0 18px;display:grid;gap:10px}.mdSearchRowV2{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.mdSearchWrapV2{position:relative;min-width:0}.mdSearchV2{width:100%;height:52px;border:1px solid #b8c0c9;border-radius:12px;background:#fff;padding:0 46px 0 14px;color:#111318;font-size:16px}.mdSearchV2::placeholder{color:#7a838e}.mdSearchGlyphV2{position:absolute;right:15px;top:50%;transform:translateY(-50%);color:#68727d}.mdFilterTriggerV2{min-width:128px;height:52px}.mdFilterSummaryV2{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-height:36px}.mdActiveChipV2,.mdPassiveChipV2{min-height:34px;border:1px solid #d8dde3;border-radius:999px;background:#fff;padding:0 10px;color:#46515e;font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;gap:7px}.mdActiveChipV2{background:#f7f1e7;border-color:#dcc9aa;color:#694613}.mdActiveChipV2 b{font-size:14px}.mdClearInlineV2{min-height:34px;border:0;background:transparent;color:#59636f;text-decoration:underline;text-underline-offset:3px;font-size:10.5px;font-weight:800;padding:0 6px}
.mdCatalogueHead{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:20px 0 12px}.mdCatalogueHead strong{font-size:13px}.mdCatalogueHead span{font-size:11px;color:#68727d}.mdProjectGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mdProjectCard{background:#fff;border:1px solid #d8dde3;border-radius:16px;padding:18px;display:flex;flex-direction:column;min-height:340px;min-width:0}.mdCardOpen{background:linear-gradient(135deg,#fff,#fffaf0)}.mdCardTop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.mdStatus{display:inline-flex;align-items:center;width:max-content;max-width:100%;min-height:30px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:850}.mdStatus::before{margin-right:6px}.mdStatusOpen{background:#edf8f1;color:#185b3c}.mdStatusOpen::before{content:'✓'}.mdStatusApplied{background:#eef4fb;color:#244f8f}.mdStatusApplied::before{content:'●'}.mdStatusMember{background:#eef7f1;color:#205c40}.mdStatusMember::before{content:'✓'}.mdStatusQuiet{background:#f2f3f4;color:#505a65}.mdStatusQuiet::before{content:'—'}.mdPathContext{margin-top:11px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;color:#5b6472;font-size:10px;line-height:1.4}.mdPathContext>span:first-child{font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.08em;color:#8b5a17}.mdPathContext strong{color:#2a2f52;font-size:10.5px}.mdPathContext b{font-weight:400;color:#a3a8af}.mdProjectCard h2{margin:9px 0 7px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px;line-height:1.15;letter-spacing:-.025em;overflow-wrap:anywhere}.mdProjectCard>p{margin:0;color:#68727d;font-size:12.7px;line-height:1.58}.mdFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.mdFacts>div{border:1px solid #e3e6e9;border-radius:10px;background:#f8f8f6;padding:9px;min-width:0}.mdFacts small,.mdLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#737e89;font-weight:700}.mdFacts strong{display:block;margin-top:3px;font-size:11.5px;overflow-wrap:anywhere}.mdGroup{margin-top:14px}.mdTags{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.mdTag{padding:6px 9px;border-radius:999px;background:#eef1f4;color:#46515e;font-size:10px;font-weight:800}.mdSkill{background:#f5f1e8;color:#5f5645}.mdDeadline{margin-top:14px;padding-top:13px;border-top:1px solid #d8dde3;display:flex;align-items:center;justify-content:space-between;gap:12px}.mdDeadline small{color:#68727d;font-size:10px}.mdDeadline strong{font-size:11.5px;text-align:right}.mdCardActions{margin-top:auto;padding-top:15px;display:flex}.mdCardActions .mdButton{flex:1}.mdEmpty{margin-top:20px;background:#fff;border:1px dashed #b8c0c9;border-radius:14px;padding:22px}.mdEmpty h2{margin:0 0 6px;font-size:18px}.mdEmpty p{margin:0 0 14px;color:#68727d}.mdRecommended{margin-top:32px;background:#e9e3d7;border:1px solid #d6cebd;border-radius:16px;padding:20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center}.mdRecommended h2{margin:5px 0;font-size:23px}.mdRecommended p{margin:0;color:#59636f;font-size:12.5px;line-height:1.55}
.mdFilterDialogV2{width:min(760px,calc(100vw - 32px));max-width:none;border:0;padding:0;background:transparent;overflow:visible}.mdFilterDialogV2::backdrop{background:rgba(22,28,39,.46);backdrop-filter:blur(1px)}.mdFilterPanelV2{background:#fff;border:1px solid #d8dde3;border-radius:18px;padding:18px;box-shadow:0 22px 60px rgba(17,19,24,.2)}.mdGrabberV2{display:none}.mdFilterHeadV2{display:flex;justify-content:space-between;gap:14px;align-items:center}.mdFilterHeadV2 h2{margin:3px 0 0;font-size:22px;letter-spacing:-.025em}.mdIconButtonV2{width:44px;height:44px;border:1px solid #b8c0c9;border-radius:11px;background:#fff;font-size:20px;font-weight:800}.mdFilterIntroV2{margin:7px 0 16px;color:#68727d;font-size:12px}.mdFilterGridV2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.mdFilterGridV2 label{display:grid;gap:6px;min-width:0}.mdFilterGridV2 label>span{font-size:10px;font-weight:800;color:#59636f}.mdFilterGridV2 label:last-child{grid-column:1/-1}.mdSelectV2{width:100%;height:46px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;padding:0 10px;font-size:16px}.mdFilterActionsV2{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}
@media(max-width:820px){.mdProjectGrid{grid-template-columns:1fr}.mdRecommended{grid-template-columns:1fr}.mdRecommended .mdButton{justify-self:start}}
@media(max-width:680px){.mdControlsV2{margin-top:7px}.mdSearchRowV2{grid-template-columns:minmax(0,1fr) auto;gap:8px}.mdSearchV2{height:48px;font-size:16px;padding-left:12px}.mdFilterTriggerV2{height:48px;min-width:94px;padding:0 11px;font-size:11.5px}.mdFilterSummaryV2{flex-wrap:nowrap;overflow-x:auto;padding:1px 0 3px;scrollbar-width:none}.mdFilterSummaryV2::-webkit-scrollbar{display:none}.mdActiveChipV2,.mdPassiveChipV2{flex:none}.mdClearInlineV2{flex:none}.mdCatalogueHead{margin-top:17px}.mdCatalogueHead span{display:none}.mdFacts{grid-template-columns:repeat(2,minmax(0,1fr))}.mdFilterDialogV2{width:100%;max-width:none;height:100%;max-height:none;margin:0;padding:0;border:0;background:transparent}.mdFilterDialogV2::backdrop{background:rgba(28,36,51,.68)}.mdFilterPanelV2{position:absolute;left:0;right:0;bottom:0;border:0;border-top:1px solid #d8dde3;border-radius:22px 22px 0 0;padding:12px 16px calc(18px + env(safe-area-inset-bottom));max-height:min(88vh,760px);overflow:auto;box-shadow:0 -18px 48px rgba(17,19,24,.22)}.mdGrabberV2{display:block;width:42px;height:4px;border-radius:999px;background:#c9ced4;margin:0 auto 13px}.mdFilterHeadV2 h2{font-size:23px}.mdFilterIntroV2{font-size:12px;margin-bottom:15px}.mdFilterGridV2{grid-template-columns:1fr;gap:11px}.mdFilterGridV2 label:last-child{grid-column:auto}.mdSelectV2{height:48px;font-size:16px}.mdFilterActionsV2{display:grid;grid-template-columns:1fr 1.35fr;position:sticky;bottom:-1px;background:#fff;padding-top:14px;margin-top:4px}.mdFilterActionsV2 .mdButton{min-height:48px}.mdRecommended{margin-top:24px;padding:17px}.mdProjectCard{padding:16px;min-height:0}}
@media(max-width:380px){.mdFilterTriggerV2{min-width:86px;padding:0 9px}.mdSearchV2::placeholder{font-size:12.5px}.mdFacts{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.mdFilterDialogV2::backdrop{backdrop-filter:none}.mdSearchGlyphV2,.mdFilterPanelV2,.mdActiveChipV2,.mdPassiveChipV2,.mdButton{transition:none!important;animation:none!important}}
`;