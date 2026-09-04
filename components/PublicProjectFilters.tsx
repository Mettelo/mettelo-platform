'use client';

import {type FormEvent,type KeyboardEvent,useEffect,useMemo,useRef,useState} from 'react';
import type {CatalogueFacet,ProjectCatalogueSort} from '@/lib/project-catalogue-filtering';

type PathOption={slug:string;label:string};
type Values={q:string;role:string;experience:string;format:string;skill:string;domain:string;tool:string;commitment:string;working:string;type:string;availability:string;stage:string;duration:string;path:string;sort:ProjectCatalogueSort};
type Props={values:Values;activeCount:number;resultCount:number;roles:CatalogueFacet[];experiences:CatalogueFacet[];formats:CatalogueFacet[];capabilities:CatalogueFacet[];domains:CatalogueFacet[];tools:CatalogueFacet[];commitments:CatalogueFacet[];workingModels:CatalogueFacet[];types:CatalogueFacet[];availabilities:CatalogueFacet[];stages:CatalogueFacet[];durations:CatalogueFacet[];paths:PathOption[]};
type FacetKey='role'|'experience'|'format'|'skill'|'domain'|'tool'|'commitment'|'working'|'type'|'availability'|'stage'|'duration'|'path';
type AnalyticsEvent='filter_opened'|'facet_applied'|'facet_removed'|'sort_selected'|'zero_result'|'project_opened'|'pagination_used'|'filters_cleared';
type AnalyticsDetail={event:AnalyticsEvent;surface:'public';facet?:FacetKey;sort?:ProjectCatalogueSort;result_count?:number;active_count?:number};

const sortLabels:Record<ProjectCatalogueSort,string>={recommended:'Recommended',newest:'Newest',closing:'Closing soon','duration-short':'Shortest project','commitment-low':'Lowest weekly commitment'};
const facetKeys:FacetKey[]=['role','experience','format','skill','domain','tool','commitment','working','type','availability','stage','duration','path'];
function facetLabel(options:{slug:string;label:string}[],slug:string){return slug==='all'?null:options.find(item=>item.slug===slug)?.label||slug}
function emitCatalogueAnalytics(detail:AnalyticsDetail){window.dispatchEvent(new CustomEvent('mettelo:catalogue-analytics',{detail}))}

export default function PublicProjectFilters({values,activeCount,resultCount,roles,experiences,formats,capabilities,domains,tools,commitments,workingModels,types,availabilities,stages,durations,paths}:Props){
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const capabilityInput=useRef<HTMLInputElement>(null);
  const [capabilitySlug,setCapabilitySlug]=useState(values.skill);
  const [capabilityQuery,setCapabilityQuery]=useState(capabilities.find(item=>item.slug===values.skill)?.label||'');
  const [capabilityOpen,setCapabilityOpen]=useState(false);
  const [capabilityIndex,setCapabilityIndex]=useState(0);
  const matches=useMemo(()=>{const q=capabilityQuery.trim().toLowerCase();return capabilities.filter(item=>!q||[item.label,item.slug,...(item.aliases||[])].join(' ').toLowerCase().includes(q)).slice(0,16)},[capabilities,capabilityQuery]);
  const activeFilters=useMemo(()=>[
    {key:'role' as const,label:'Career',value:facetLabel(roles,values.role)},
    {key:'experience' as const,label:'Experience',value:facetLabel(experiences,values.experience)},
    {key:'format' as const,label:'Format',value:facetLabel(formats,values.format)},
    {key:'skill' as const,label:'Skill',value:facetLabel(capabilities,values.skill)},
    {key:'domain' as const,label:'Industry',value:facetLabel(domains,values.domain)},
    {key:'tool' as const,label:'Tool',value:facetLabel(tools,values.tool)},
    {key:'commitment' as const,label:'Commitment',value:facetLabel(commitments,values.commitment)},
    {key:'working' as const,label:'Working model',value:facetLabel(workingModels,values.working)},
    {key:'type' as const,label:'Project source',value:facetLabel(types,values.type)},
    {key:'availability' as const,label:'Availability',value:facetLabel(availabilities,values.availability)},
    {key:'duration' as const,label:'Length',value:facetLabel(durations,values.duration)},
    {key:'path' as const,label:'Capability Path',value:facetLabel(paths,values.path)}
  ].filter(item=>item.value) as {key:FacetKey;label:string;value:string}[],[values,roles,experiences,formats,capabilities,domains,tools,commitments,workingModels,types,availabilities,durations,paths]);

  function stateHref(next:Values){const query=new URLSearchParams();if(next.q.trim())query.set('q',next.q.trim());for(const key of facetKeys)if(next[key]&&next[key]!=='all')query.set(key,next[key]);if(next.sort!=='recommended')query.set('sort',next.sort);return `/projects${query.size?`?${query.toString()}`:''}#projects`}
  function navigate(next:Values){window.location.assign(stateHref(next))}
  function removeHref(key:FacetKey){return stateHref({...values,[key]:'all'})}
  function openFilters(){dialog.current?.showModal();document.body.style.overflow='hidden';emitCatalogueAnalytics({event:'filter_opened',surface:'public',active_count:activeCount,result_count:resultCount});requestAnimationFrame(()=>closeButton.current?.focus())}
  function closeFilters(){setCapabilityOpen(false);dialog.current?.close()}
  function chooseCapability(item:CatalogueFacet){setCapabilitySlug(item.slug);setCapabilityQuery(item.label);setCapabilityOpen(false);setCapabilityIndex(0);requestAnimationFrame(()=>capabilityInput.current?.focus())}
  function clearCapability(){setCapabilitySlug('all');setCapabilityQuery('');setCapabilityOpen(false);setCapabilityIndex(0);requestAnimationFrame(()=>capabilityInput.current?.focus())}
  function changeCapability(value:string){setCapabilityQuery(value);setCapabilitySlug('all');setCapabilityOpen(true);setCapabilityIndex(0)}
  function onCapabilityKeyDown(event:KeyboardEvent<HTMLInputElement>){if(event.key==='Escape'&&capabilityOpen){event.preventDefault();event.stopPropagation();setCapabilityOpen(false);return}if(event.key==='ArrowDown'){event.preventDefault();if(!capabilityOpen){setCapabilityOpen(true);setCapabilityIndex(0)}else if(matches.length)setCapabilityIndex(index=>Math.min(matches.length-1,index+1));return}if(event.key==='ArrowUp'){event.preventDefault();if(!capabilityOpen){setCapabilityOpen(true);setCapabilityIndex(Math.max(0,matches.length-1))}else if(matches.length)setCapabilityIndex(index=>Math.max(0,index-1));return}if(event.key==='Enter'&&capabilityOpen&&matches[capabilityIndex]){event.preventDefault();chooseCapability(matches[capabilityIndex])}}
  function trackSubmit(event:FormEvent<HTMLFormElement>){const formData=new FormData(event.currentTarget);for(const key of facetKeys){const current=values[key]||'all';const next=String(formData.get(key)||'all');if(current!==next)emitCatalogueAnalytics({event:next==='all'?'facet_removed':'facet_applied',surface:'public',facet:key,active_count:activeCount,result_count:resultCount})}}

  useEffect(()=>{if(resultCount===0)emitCatalogueAnalytics({event:'zero_result',surface:'public',active_count:activeCount,result_count:0})},[resultCount,activeCount]);
  useEffect(()=>{function onDocumentClick(event:MouseEvent){const target=event.target instanceof Element?event.target:null;const link=target?.closest('a') as HTMLAnchorElement|null;if(!link||!link.getAttribute('href'))return;if(link.closest('.pagination')){emitCatalogueAnalytics({event:'pagination_used',surface:'public',active_count:activeCount,result_count:resultCount});return}if(link.closest('.projectBriefCard')&&link.pathname.startsWith('/projects/')&&!link.hash.includes('interest'))emitCatalogueAnalytics({event:'project_opened',surface:'public',active_count:activeCount,result_count:resultCount})}document.addEventListener('click',onDocumentClick);return()=>document.removeEventListener('click',onDocumentClick)},[activeCount,resultCount]);

  const quick=(key:'role'|'experience'|'format',value:string)=>navigate({...values,[key]:value});
  return <form className="pfShell" method="get" action="/projects#projects" onSubmit={trackSubmit}>
    <div className="pfSearchRow">
      <label className="pfSearchLabel"><span>Search projects</span><span className="pfSearchBox"><b aria-hidden="true">⌕</b><input type="search" name="q" defaultValue={values.q} placeholder="Search projects, roles, skills, tools or industries" autoComplete="off"/></span></label>
      <label className="pfSort"><span>Sort</span><select value={values.sort} onChange={event=>{const sort=event.target.value as ProjectCatalogueSort;emitCatalogueAnalytics({event:'sort_selected',surface:'public',sort,active_count:activeCount,result_count:resultCount});navigate({...values,sort})}}>{Object.entries(sortLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <input type="hidden" name="sort" value={values.sort}/>
    <div className="pfDesktopQuick">
      <select aria-label="Career or role" value={values.role} onChange={e=>quick('role',e.target.value)}><option value="all">Career / Role</option>{roles.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select>
      <select aria-label="Experience level" value={values.experience} onChange={e=>quick('experience',e.target.value)}><option value="all">Experience Level</option>{experiences.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select>
      <select aria-label="Work format" value={values.format} onChange={e=>quick('format',e.target.value)}><option value="all">Solo / Team</option>{formats.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select>
      <button ref={trigger} className="pfMore" type="button" onClick={openFilters} aria-haspopup="dialog"><span>More filters</span><b>{activeCount}</b></button>
    </div>
    <div className="pfMobileControls"><button ref={trigger} className="pfMobileTrigger" type="button" onClick={openFilters} aria-haspopup="dialog">Filters · {activeCount}</button><select className="pfMobileSort" aria-label="Sort projects" value={values.sort} onChange={event=>navigate({...values,sort:event.target.value as ProjectCatalogueSort})}>{Object.entries(sortLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    {activeFilters.length>0&&<div className="pfActive" aria-label="Active filters">{activeFilters.map(item=><a key={item.key} className="pfChip" href={removeHref(item.key)} aria-label={`Remove ${item.label}: ${item.value} filter`}><span>{item.label}: {item.value}</span><b aria-hidden="true">×</b></a>)}<a className="pfClear" href="/projects#projects">Clear all</a></div>}

    <dialog ref={dialog} className="pfDrawer" onClose={()=>{document.body.style.overflow='';setCapabilityOpen(false);requestAnimationFrame(()=>trigger.current?.focus())}} onClick={event=>{if(event.target===dialog.current)closeFilters()}} aria-labelledby="pf-title" aria-describedby="pf-description">
      <div className="pfDrawerInner">
        <header className="pfDrawerHead"><div><div className="eyebrow">REFINE CATALOGUE</div><h2 id="pf-title">Filter projects</h2><p id="pf-description">Narrow the catalogue by the direction, work format and context that matter to you.</p></div><button ref={closeButton} className="pfClose" type="button" onClick={closeFilters} aria-label="Close filters">×</button></header>
        <div className="pfDrawerBody">
          <fieldset><legend>Career fit</legend><div className="pfGrid">
            <label><span>Career / Role</span><select name="role" defaultValue={values.role}><option value="all">All roles</option>{roles.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Experience level</span><select name="experience" defaultValue={values.experience}><option value="all">Any level</option>{experiences.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Capability Path</span><select name="path" defaultValue={values.path}><option value="all">All paths</option>{paths.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <div className="pfCapability"><label htmlFor="pf-skill">Skills you want to build</label><div className="pfCapabilityWrap"><input ref={capabilityInput} id="pf-skill" type="search" role="combobox" autoComplete="off" value={capabilityQuery} placeholder="e.g. SQL, Python, RAG" aria-expanded={capabilityOpen} aria-controls="pf-skill-options" onFocus={()=>setCapabilityOpen(true)} onChange={e=>changeCapability(e.target.value)} onKeyDown={onCapabilityKeyDown}/>{capabilitySlug!=='all'&&<button type="button" onClick={clearCapability} aria-label="Clear skill">×</button>}{capabilityOpen&&<div id="pf-skill-options" className="pfOptions" role="listbox">{matches.length?matches.map((item,index)=><button key={item.slug} type="button" role="option" aria-selected={capabilitySlug===item.slug} className={index===capabilityIndex?'isActive':''} onMouseDown={e=>e.preventDefault()} onMouseEnter={()=>setCapabilityIndex(index)} onClick={()=>chooseCapability(item)}>{item.label}</button>):<p>No capabilities match</p>}</div>}</div><input type="hidden" name="skill" value={capabilitySlug}/></div>
          </div></fieldset>
          <fieldset><legend>How you want to work</legend><div className="pfGrid">
            <label><span>Project format</span><select name="format" defaultValue={values.format}><option value="all">Solo or Team</option>{formats.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Weekly commitment</span><select name="commitment" defaultValue={values.commitment}><option value="all">Any commitment</option>{commitments.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Project length</span><select name="duration" defaultValue={values.duration}><option value="all">Any duration</option>{durations.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Working model</span><select name="working" defaultValue={values.working}><option value="all">Any working model</option>{workingModels.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          </div></fieldset>
          <fieldset><legend>What you want to work on</legend><div className="pfGrid">
            <label><span>Industry</span><select name="domain" defaultValue={values.domain}><option value="all">All industries</option>{domains.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Tools &amp; technologies</span><select name="tool" defaultValue={values.tool}><option value="all">All tools</option>{tools.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          </div></fieldset>
          <fieldset><legend>Opportunity</legend><div className="pfGrid">
            <label><span>Project source</span><select name="type" defaultValue={values.type}><option value="all">All project sources</option>{types.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
            <label><span>Availability</span><select name="availability" defaultValue={values.availability}><option value="all">Any availability</option>{availabilities.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          </div></fieldset>
          <input type="hidden" name="stage" value={values.stage}/>
        </div>
        <footer className="pfActions"><a href="/projects#projects" className="pfGhost">Clear all</a><button className="pfDark" type="submit">Show {resultCount} project{resultCount===1?'':'s'}</button></footer>
      </div>
    </dialog>
    <style jsx global>{`
      .pfShell{background:#fff;border:1px solid #d8d0c2;box-shadow:0 12px 30px rgba(16,19,29,.04);padding:18px;margin:20px 0 10px}.pfSearchRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end}.pfSearchLabel,.pfSort{display:grid;gap:8px;font-size:.76rem;font-weight:800;color:#2f3742}.pfSearchBox{display:flex;align-items:center;min-height:56px;border:1px solid #bbb4a8;border-radius:12px;background:#fff;padding:0 16px;gap:10px}.pfSearchBox:focus-within{outline:3px solid rgba(198,137,42,.22);border-color:#c6892a}.pfSearchBox b{font-size:1.25rem;color:#2a2f52}.pfSearchBox input{width:100%;border:0;outline:0;background:transparent;font-size:.95rem}.pfSort{min-width:190px}.pfSort select,.pfDesktopQuick select,.pfMobileTrigger,.pfMobileSort{width:100%;min-height:52px;border:1px solid #c8c1b5;border-radius:12px;background:#fff;color:#10131d;padding:0 42px 0 14px;font-weight:750}.pfDesktopQuick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;padding-top:14px;margin-top:14px;border-top:1px solid #e7e1d6}.pfMore{min-height:54px;border:1px solid #10131d;border-radius:12px;background:#10131d;color:#fff;padding:0 16px;display:flex;align-items:center;justify-content:space-between;font-weight:850}.pfMore b{min-width:26px;height:26px;display:grid;place-items:center;border-radius:999px;background:rgba(255,255,255,.12);font-size:.72rem}.pfMobileControls{display:none}.pfActive{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px}.pfChip{display:inline-flex;align-items:center;gap:8px;min-height:34px;border:1px solid #dcc9aa;border-radius:999px;background:#f7efdd;color:#694613;padding:0 11px;font-size:.72rem;font-weight:800;text-decoration:none}.pfChip b{font-size:1rem}.pfClear{color:#70470f;text-decoration:underline;text-underline-offset:3px;font-size:.75rem;font-weight:800}.pfDrawer{position:fixed;inset:0 0 0 auto;margin:0;width:min(520px,92vw);max-width:none;height:100dvh;max-height:none;border:0;padding:0;background:transparent;overflow:visible}.pfDrawer::backdrop{background:rgba(16,19,29,.35)}.pfDrawerInner{height:100%;background:#fcfbf7;box-shadow:-24px 0 60px rgba(16,19,29,.18);display:flex;flex-direction:column}.pfDrawerHead{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #e7e1d6;background:#fbf7ee}.pfDrawerHead h2{font-family:var(--font-space-grotesk),Inter,sans-serif;margin:6px 0 4px;font-size:1.7rem;letter-spacing:-.03em}.pfDrawerHead p{margin:0;color:#5b6472;font-size:.82rem;line-height:1.5}.pfClose{min-width:42px;height:42px;border:1px solid #d8d0c2;border-radius:999px;background:#fff;color:#10131d;font-size:1.3rem}.pfDrawerBody{overflow:auto;padding:20px 24px 110px}.pfDrawer fieldset{border:0;border-bottom:1px solid #e7e1d6;padding:0 0 22px;margin:0 0 22px}.pfDrawer fieldset:last-of-type{border-bottom:0}.pfDrawer legend{font-size:.82rem;font-weight:800;margin:0 0 12px;color:#10131d}.pfGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pfGrid label,.pfCapability{display:grid;gap:7px;color:#303845;font-size:.72rem;font-weight:800;min-width:0}.pfGrid select,.pfCapabilityWrap>input{width:100%;min-height:48px;border:1px solid #c8c1b5;border-radius:10px;background:#fff;padding:0 12px;color:#10131d}.pfCapabilityWrap{position:relative}.pfCapabilityWrap>button{position:absolute;right:7px;top:7px;width:34px;height:34px;border:0;background:transparent;font-size:1.1rem}.pfOptions{position:absolute;z-index:70;top:52px;left:0;right:0;max-height:240px;overflow:auto;border:1px solid #c8c1b5;border-radius:10px;background:#fff;box-shadow:0 12px 30px rgba(16,19,29,.12);padding:6px}.pfOptions button{display:block;width:100%;min-height:40px;border:0;border-radius:7px;background:#fff;text-align:left;padding:0 10px}.pfOptions button:hover,.pfOptions button.isActive,.pfOptions button[aria-selected=true]{background:#f7efdd}.pfOptions p{margin:0;padding:10px;color:#5b6472}.pfActions{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:auto 1fr;gap:10px;padding:14px 24px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #e7e1d6;background:rgba(252,251,247,.96);backdrop-filter:blur(10px)}.pfGhost,.pfDark{min-height:50px;border-radius:11px;padding:0 18px;font-weight:850;display:flex;align-items:center;justify-content:center;text-decoration:none}.pfGhost{border:1px solid #d8d0c2;background:#fff;color:#10131d}.pfDark{border:1px solid #10131d;background:#10131d;color:#fff}.pfShell select:focus-visible,.pfShell input:focus-visible,.pfShell button:focus-visible,.pfShell a:focus-visible,.pfDrawer select:focus-visible,.pfDrawer input:focus-visible,.pfDrawer button:focus-visible,.pfDrawer a:focus-visible{outline:3px solid rgba(198,137,42,.3);outline-offset:2px}
      @media(max-width:860px){.pfSearchRow{display:block}.pfSort,.pfDesktopQuick{display:none}.pfMobileControls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.pfMobileTrigger{background:#10131d;color:#fff;border-color:#10131d;padding:0 14px;font-weight:850}.pfActive{overflow-x:auto;flex-wrap:nowrap;margin-left:-2px;padding-bottom:4px;scrollbar-width:none}.pfActive::-webkit-scrollbar{display:none}.pfChip{flex:0 0 auto}}
      @media(max-width:560px){.pfShell{margin-inline:-2px;padding:14px}.pfSearchBox{min-height:52px}.pfMobileControls{grid-template-columns:1.08fr .92fr}.pfDrawer{width:100%;height:92dvh;inset:auto 0 0 0;border-radius:22px 22px 0 0}.pfDrawerInner{border-radius:22px 22px 0 0}.pfDrawerHead{padding:20px;border-radius:22px 22px 0 0}.pfDrawerBody{padding:18px 20px 118px}.pfActions{padding-left:20px;padding-right:20px}.pfGrid{grid-template-columns:1fr}}
    `}</style>
  </form>;
}
