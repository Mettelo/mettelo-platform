'use client';

import {type FormEvent,type KeyboardEvent,useEffect,useMemo,useRef,useState} from 'react';
import type {CatalogueFacet,ProjectCatalogueSort} from '@/lib/project-catalogue-filtering';

type PathOption={slug:string;label:string};
type Values={q:string;role:string;skill:string;domain:string;tool:string;commitment:string;working:string;type:string;stage:string;duration:string;path:string;sort:ProjectCatalogueSort};
type Props={values:Values;activeCount:number;resultCount:number;roles:CatalogueFacet[];capabilities:CatalogueFacet[];domains:CatalogueFacet[];tools:CatalogueFacet[];commitments:CatalogueFacet[];workingModels:CatalogueFacet[];types:CatalogueFacet[];stages:CatalogueFacet[];durations:CatalogueFacet[];paths:PathOption[]};
type FacetKey='role'|'skill'|'domain'|'tool'|'commitment'|'working'|'type'|'stage'|'duration'|'path';
type AnalyticsEvent='filter_opened'|'facet_applied'|'facet_removed'|'sort_selected'|'zero_result'|'project_opened'|'pagination_used'|'filters_cleared';
type AnalyticsDetail={event:AnalyticsEvent;surface:'public';facet?:FacetKey;sort?:ProjectCatalogueSort;result_count?:number;active_count?:number};

const sortLabels:Record<ProjectCatalogueSort,string>={recent:'Recently added',closing:'Closing soon','duration-short':'Shortest duration','duration-long':'Longest duration'};
const facetKeys:FacetKey[]=['role','skill','domain','tool','commitment','working','type','stage','duration','path'];

function facetLabel(options:{slug:string;label:string}[],slug:string){return slug==='all'?null:options.find(item=>item.slug===slug)?.label||slug}
function emitCatalogueAnalytics(detail:AnalyticsDetail){window.dispatchEvent(new CustomEvent('mettelo:catalogue-analytics',{detail}))}

export default function PublicProjectFilters({values,activeCount,resultCount,roles,capabilities,domains,tools,commitments,workingModels,types,stages,durations,paths}:Props){
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const closeButton=useRef<HTMLButtonElement>(null);
  const capabilityInput=useRef<HTMLInputElement>(null);
  const [capabilitySlug,setCapabilitySlug]=useState(values.skill);
  const initialCapability=capabilities.find(item=>item.slug===values.skill)?.label||'';
  const [capabilityQuery,setCapabilityQuery]=useState(initialCapability);
  const matches=useMemo(()=>{const q=capabilityQuery.trim().toLowerCase();return capabilities.filter(item=>!q||[item.label,item.slug,...(item.aliases||[])].join(' ').toLowerCase().includes(q)).slice(0,12)},[capabilities,capabilityQuery]);
  const [capabilityOpen,setCapabilityOpen]=useState(false);
  const [capabilityIndex,setCapabilityIndex]=useState(0);

  const activeFilters=useMemo(()=>[
    {key:'role' as const,label:'Role',value:facetLabel(roles,values.role)},
    {key:'skill' as const,label:'Skill',value:facetLabel(capabilities,values.skill)},
    {key:'domain' as const,label:'Domain',value:facetLabel(domains,values.domain)},
    {key:'tool' as const,label:'Tool',value:facetLabel(tools,values.tool)},
    {key:'commitment' as const,label:'Commitment',value:facetLabel(commitments,values.commitment)},
    {key:'working' as const,label:'Working model',value:facetLabel(workingModels,values.working)},
    {key:'type' as const,label:'Project type',value:facetLabel(types,values.type)},
    {key:'stage' as const,label:'Project stage',value:facetLabel(stages,values.stage)},
    {key:'duration' as const,label:'Duration',value:facetLabel(durations,values.duration)},
    {key:'path' as const,label:'Capability Path',value:facetLabel(paths,values.path)}
  ].filter(item=>item.value) as {key:FacetKey;label:string;value:string}[],[values,roles,capabilities,domains,tools,commitments,workingModels,types,stages,durations,paths]);

  function stateHref(next:Values){
    const query=new URLSearchParams();
    if(next.q.trim())query.set('q',next.q.trim());
    for(const key of facetKeys)if(next[key]&&next[key]!=='all')query.set(key,next[key]);
    if(next.sort!=='recent')query.set('sort',next.sort);
    return `/projects${query.size?`?${query.toString()}`:''}#projects`;
  }
  function removeHref(key:FacetKey){return stateHref({...values,[key]:'all'})}
  function openFilters(){dialog.current?.showModal();emitCatalogueAnalytics({event:'filter_opened',surface:'public',active_count:activeCount,result_count:resultCount});requestAnimationFrame(()=>closeButton.current?.focus())}
  function closeFilters(){setCapabilityOpen(false);dialog.current?.close()}
  function chooseCapability(item:CatalogueFacet){setCapabilitySlug(item.slug);setCapabilityQuery(item.label);setCapabilityOpen(false);setCapabilityIndex(0);requestAnimationFrame(()=>capabilityInput.current?.focus())}
  function clearCapability(){setCapabilitySlug('all');setCapabilityQuery('');setCapabilityOpen(false);setCapabilityIndex(0);requestAnimationFrame(()=>capabilityInput.current?.focus())}
  function changeCapability(value:string){setCapabilityQuery(value);setCapabilitySlug('all');setCapabilityOpen(true);setCapabilityIndex(0)}
  function onCapabilityKeyDown(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==='Escape'&&capabilityOpen){event.preventDefault();event.stopPropagation();setCapabilityOpen(false);return}
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(!capabilityOpen){setCapabilityOpen(true);setCapabilityIndex(0)}
      else if(matches.length)setCapabilityIndex(index=>Math.min(matches.length-1,index+1));
      return;
    }
    if(event.key==='ArrowUp'){
      event.preventDefault();
      if(!capabilityOpen){setCapabilityOpen(true);setCapabilityIndex(Math.max(0,matches.length-1))}
      else if(matches.length)setCapabilityIndex(index=>Math.max(0,index-1));
      return;
    }
    if(event.key==='Enter'&&capabilityOpen&&matches[capabilityIndex]){event.preventDefault();chooseCapability(matches[capabilityIndex])}
  }
  function trackSubmit(event:FormEvent<HTMLFormElement>){
    const formData=new FormData(event.currentTarget);
    for(const key of facetKeys){
      const current=values[key]||'all';
      const next=String(formData.get(key)||'all');
      if(current!==next)emitCatalogueAnalytics({event:next==='all'?'facet_removed':'facet_applied',surface:'public',facet:key,active_count:activeCount,result_count:resultCount});
    }
    const nextSort=String(formData.get('sort')||'recent') as ProjectCatalogueSort;
    if(nextSort!==values.sort)emitCatalogueAnalytics({event:'sort_selected',surface:'public',sort:nextSort,active_count:activeCount,result_count:resultCount});
  }

  useEffect(()=>{if(resultCount===0)emitCatalogueAnalytics({event:'zero_result',surface:'public',active_count:activeCount,result_count:0})},[resultCount,activeCount]);
  useEffect(()=>{
    function onDocumentClick(event:MouseEvent){
      const target=event.target instanceof Element?event.target:null;
      const link=target?.closest('a') as HTMLAnchorElement|null;
      if(!link||!link.getAttribute('href'))return;
      if(link.closest('.pagination')){emitCatalogueAnalytics({event:'pagination_used',surface:'public',active_count:activeCount,result_count:resultCount});return}
      if(link.closest('.projectBriefCard')&&link.pathname.startsWith('/projects/')&&!link.hash.includes('interest'))emitCatalogueAnalytics({event:'project_opened',surface:'public',active_count:activeCount,result_count:resultCount});
    }
    document.addEventListener('click',onDocumentClick);
    return()=>document.removeEventListener('click',onDocumentClick);
  },[activeCount,resultCount]);

  return <form className="publicCatalogueControls" method="get" action="/projects#projects" onSubmit={trackSubmit}>
    <div className="publicCatalogueSearchRow">
      <label className="publicCatalogueSearch" htmlFor="project-search"><span>Search projects</span><span className="publicCatalogueSearchField"><span aria-hidden="true">⌕</span><input id="project-search" name="q" defaultValue={values.q} placeholder="Project, role, skill, tool or domain" autoComplete="off"/></span></label>
      <button ref={trigger} className="publicFilterTrigger" type="button" onClick={openFilters} aria-haspopup="dialog">Filters · {activeCount}</button>
      <label className="publicSortControl"><span>Sort</span><select name="sort" defaultValue={values.sort} onChange={event=>event.currentTarget.form?.requestSubmit()}>{Object.entries(sortLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button className="publicSearchSubmit" type="submit">Search</button>
    </div>
    {(activeFilters.length>0||values.q.trim()||values.sort!=='recent')&&<div className="publicActiveFilters" aria-label="Current project filters">
      {activeFilters.map(item=><a key={item.key} className="publicFilterChip" href={removeHref(item.key)} onClick={()=>emitCatalogueAnalytics({event:'facet_removed',surface:'public',facet:item.key,active_count:activeCount,result_count:resultCount})} aria-label={`Remove ${item.label}: ${item.value} filter`}><span>{item.label}: {item.value}</span><b aria-hidden="true">×</b></a>)}
      <a className="publicClearAll" href="/projects#projects" onClick={()=>emitCatalogueAnalytics({event:'filters_cleared',surface:'public',active_count:activeCount,result_count:resultCount})}>Clear all</a>
    </div>}

    <dialog ref={dialog} className="publicFilterDialog" onClose={()=>{setCapabilityOpen(false);requestAnimationFrame(()=>trigger.current?.focus())}} aria-labelledby="public-filter-title" aria-describedby="public-filter-description">
      <section className="publicFilterPanel">
        <div className="publicFilterHead"><div><div className="eyebrow">REFINE CATALOGUE</div><h2 id="public-filter-title">Filter projects</h2></div><button ref={closeButton} type="button" className="publicFilterClose" onClick={closeFilters} aria-label="Close project filters">×</button></div>
        <p id="public-filter-description">Narrow the public project catalogue by the work, format and direction that matter to you.</p>

        <fieldset><legend>Project fit</legend><div className="publicFilterGrid">
          <label><span>Role</span><select name="role" defaultValue={values.role}><option value="all">All roles</option>{roles.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          <div className="publicCapabilityField"><label htmlFor="public-capability-filter">Skill / capability</label><div className="publicCapabilityWrap"><input ref={capabilityInput} id="public-capability-filter" type="search" role="combobox" autoComplete="off" value={capabilityQuery} placeholder="Search capabilities" aria-autocomplete="list" aria-expanded={capabilityOpen} aria-controls="public-capability-options" aria-activedescendant={capabilityOpen&&matches[capabilityIndex]?`public-capability-option-${matches[capabilityIndex].slug}`:undefined} onFocus={()=>{setCapabilityOpen(true);setCapabilityIndex(0)}} onChange={event=>changeCapability(event.target.value)} onKeyDown={onCapabilityKeyDown} onBlur={()=>requestAnimationFrame(()=>{if(document.activeElement!==capabilityInput.current)setCapabilityOpen(false)})}/>{capabilitySlug!=='all'&&<button type="button" onMouseDown={event=>event.preventDefault()} onClick={clearCapability} aria-label="Clear skill filter">×</button>}{capabilityOpen&&<div id="public-capability-options" className="publicCapabilityOptions" role="listbox" aria-label="Skill and capability options">{matches.length?matches.map((item,index)=><button id={`public-capability-option-${item.slug}`} key={item.slug} type="button" role="option" aria-selected={capabilitySlug===item.slug} className={index===capabilityIndex?'isActive':undefined} tabIndex={-1} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setCapabilityIndex(index)} onClick={()=>chooseCapability(item)}>{item.label}</button>):<p>No capabilities match</p>}</div>}</div><input type="hidden" name="skill" value={capabilitySlug}/></div>
          <label><span>Domain</span><select name="domain" defaultValue={values.domain}><option value="all">All domains</option>{domains.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          <label><span>Tool / technology</span><select name="tool" defaultValue={values.tool}><option value="all">All tools</option>{tools.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
        </div></fieldset>

        <fieldset><legend>Project format</legend><div className="publicFilterGrid">
          <label><span>Project type</span><select name="type" defaultValue={values.type}><option value="all">Any project type</option>{types.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          <label><span>Working model</span><select name="working" defaultValue={values.working}><option value="all">Any working model</option>{workingModels.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          <label><span>Commitment</span><select name="commitment" defaultValue={values.commitment}><option value="all">Any commitment</option>{commitments.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          <label><span>Duration</span><select name="duration" defaultValue={values.duration}><option value="all">Any duration</option>{durations.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
        </div></fieldset>

        <fieldset><legend>Availability and direction</legend><div className="publicFilterGrid">
          <label><span>Project stage</span><select name="stage" defaultValue={values.stage}><option value="all">Any project stage</option>{stages.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
          <label><span>Capability Path</span><select id="path-filter" name="path" defaultValue={values.path}><option value="all">All Capability Paths</option>{paths.map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
        </div></fieldset>

        <div className="publicFilterActions"><a href="/projects#projects" className="button ghost" onClick={()=>emitCatalogueAnalytics({event:'filters_cleared',surface:'public',active_count:activeCount,result_count:resultCount})}>Clear all</a><button className="button dark" type="submit">Show {resultCount} project{resultCount===1?'':'s'}</button></div>
      </section>
    </dialog>
    <style jsx global>{`
      .publicCatalogueControls{margin:20px 0 10px}.publicCatalogueSearchRow{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:end}.publicCatalogueSearch{display:grid;gap:7px;font-size:12px;font-weight:800}.publicCatalogueSearchField{position:relative;display:block}.publicCatalogueSearchField>span{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#69727d}.publicCatalogueSearch input{width:100%;min-height:52px;border:1px solid #c9ced4;border-radius:12px;padding:0 14px 0 42px;font:inherit;font-size:15px;background:#fff}.publicFilterTrigger,.publicSearchSubmit{min-height:52px;border:1px solid #111318;border-radius:12px;padding:0 18px;font-weight:850}.publicFilterTrigger{background:#111318;color:#fff}.publicSearchSubmit{background:#fff;color:#111318}.publicSortControl{display:grid;gap:7px;font-size:12px;font-weight:800}.publicSortControl select{min-height:52px;border:1px solid #c9ced4;border-radius:12px;background:#fff;padding:0 36px 0 12px;font-weight:750}.publicActiveFilters{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin-top:10px;min-width:0}.publicFilterChip{min-height:34px;max-width:100%;border:1px solid #dcc9aa;border-radius:999px;background:#f7f1e7;color:#694613;padding:0 10px;display:inline-flex;align-items:center;gap:7px;text-decoration:none;font-size:11px;font-weight:800}.publicFilterChip span{min-width:0;overflow-wrap:anywhere}.publicFilterChip b{font-size:15px}.publicClearAll{min-height:34px;display:inline-flex;align-items:center;padding:0 6px;color:#59636f;text-decoration:underline;text-underline-offset:3px;font-size:11px;font-weight:800}.publicFilterDialog{width:min(760px,calc(100vw - 32px));max-height:min(820px,calc(100vh - 40px));padding:0;border:0;border-radius:18px;background:#fff;color:#111318;box-shadow:0 24px 70px #0003}.publicFilterDialog::backdrop{background:#11182780}.publicFilterPanel{padding:24px;overflow:auto;max-height:inherit}.publicFilterHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.publicFilterHead h2{margin:4px 0 0;font-size:28px}.publicFilterPanel>p{color:#68727d;line-height:1.5}.publicFilterClose{width:44px;height:44px;border:1px solid #d4d8dd;border-radius:10px;background:#fff;font-size:24px}.publicFilterPanel fieldset{border:0;border-top:1px solid #e1e4e8;margin:20px 0 0;padding:18px 0 0}.publicFilterPanel legend{font-family:var(--font-plex-mono),ui-monospace,monospace;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.1em;color:#72551e}.publicFilterGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}.publicFilterGrid label,.publicCapabilityField{display:grid;gap:7px;font-size:12px;font-weight:800;min-width:0}.publicFilterGrid select,.publicCapabilityWrap>input{width:100%;min-height:46px;border:1px solid #c9ced4;border-radius:10px;background:#fff;padding:0 12px;font:inherit}.publicCapabilityWrap{position:relative}.publicCapabilityWrap>button{position:absolute;right:8px;top:7px;width:32px;height:32px;border:0;background:transparent;font-size:20px}.publicCapabilityOptions{position:absolute;z-index:4;left:0;right:0;top:50px;max-height:250px;overflow:auto;border:1px solid #c9ced4;border-radius:10px;background:#fff;box-shadow:0 12px 30px #0002;padding:6px}.publicCapabilityOptions button{width:100%;min-height:42px;border:0;background:#fff;text-align:left;padding:0 10px;border-radius:7px}.publicCapabilityOptions button:hover,.publicCapabilityOptions button:focus-visible,.publicCapabilityOptions button.isActive,.publicCapabilityOptions button[aria-selected="true"]{background:#f3f5f7}.publicCapabilityOptions p{padding:10px;margin:0;color:#68727d}.publicFilterActions{position:sticky;bottom:-24px;background:#fff;border-top:1px solid #e1e4e8;margin:22px -24px -24px;padding:14px 24px;display:flex;justify-content:space-between;gap:10px}.publicFilterTrigger:focus-visible,.publicSearchSubmit:focus-visible,.publicSortControl select:focus-visible,.publicCatalogueSearch input:focus-visible,.publicFilterClose:focus-visible,.publicFilterGrid select:focus-visible,.publicCapabilityWrap input:focus-visible,.publicCapabilityOptions button:focus-visible,.publicFilterChip:focus-visible,.publicClearAll:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
      @media(max-width:760px){.publicCatalogueSearchRow{grid-template-columns:1fr 1fr}.publicCatalogueSearch{grid-column:1/-1}.publicSortControl{grid-column:1/2}.publicFilterTrigger{grid-column:2/3;grid-row:2}.publicSearchSubmit{grid-column:1/-1}.publicFilterDialog{width:100vw;max-width:none;max-height:88vh;margin:auto 0 0;border-radius:18px 18px 0 0}.publicFilterPanel{padding:20px 16px}.publicFilterGrid{grid-template-columns:1fr}.publicFilterActions{margin-left:-16px;margin-right:-16px;margin-bottom:-20px;padding:12px 16px}.publicFilterActions>*{flex:1}.publicCatalogueSearch input,.publicFilterTrigger,.publicSearchSubmit,.publicSortControl select{min-height:48px}.publicCapabilityOptions{position:relative;top:auto;margin-top:5px;max-height:190px}}
      @media(max-width:420px){.publicCatalogueSearchRow{grid-template-columns:1fr}.publicSortControl,.publicFilterTrigger,.publicSearchSubmit{grid-column:1}.publicFilterTrigger{grid-row:auto}}
    `}</style>
  </form>;
}
