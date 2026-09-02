'use client';

import Link from 'next/link';
import {type KeyboardEvent,useEffect,useMemo,useRef,useState} from 'react';
import SaveProjectButton from '@/components/SaveProjectButton';
import type {MemberProjectState} from '@/lib/member-project-journey';
import {
  DEFAULT_PROJECT_CATALOGUE_FILTERS,
  activeProjectCatalogueFilterCount,
  catalogueFacetOptions,
  catalogueSingleFacetOptions,
  filterAndSortProjectCatalogue,
  type CatalogueFacet,
  type ProjectCatalogueFilterable,
  type ProjectCatalogueFilters,
  type ProjectCatalogueSort
} from '@/lib/project-catalogue-filtering';

type PathContext={name:string;position:number;stage:string;isPrimary:boolean};
type ProjectItem=ProjectCatalogueFilterable&{id:string;state:MemberProjectState;stateLabel:string;action:{label:string;href:string};saved:boolean;workingModel:string|null;commitment:string|null;roles:string[];pathContext?:PathContext|null};
type Props={projects:ProjectItem[]};
type FacetKey='role'|'capability'|'domain'|'tool'|'commitment'|'workingModel'|'projectType'|'stage';

const sortLabels:Record<ProjectCatalogueSort,string>={recent:'Recently added',closing:'Closing soon','duration-short':'Shortest duration','duration-long':'Longest duration'};
const stageOrder=['pilot','recruiting','open','forming','active','review','completed'];
const workingModelOrder=['remote','hybrid','onsite'];
const projectTypeOrder=['open','partner'];

function formatDeadline(value:string|null){return value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'No fixed deadline'}
function statusClass(state:MemberProjectState){if(['confirmed','active','completed'].includes(state))return'mdStatusMember';if(['application_submitted','application_action_required','application_in_review','team_forming'].includes(state))return'mdStatusApplied';if(state==='open_eligible')return'mdStatusOpen';return'mdStatusQuiet'}
function labelFor(options:CatalogueFacet[],slug:string){return options.find(item=>item.slug===slug)?.label||slug}
function ordered(options:CatalogueFacet[],order:string[]){return[...options].sort((a,b)=>{const ai=order.indexOf(a.slug),bi=order.indexOf(b.slug);if(ai===-1&&bi===-1)return a.label.localeCompare(b.label);if(ai===-1)return 1;if(bi===-1)return-1;return ai-bi})}

export default function MemberDiscoverCatalogue({projects}:Props){
  const [filters,setFilters]=useState<ProjectCatalogueFilters>(DEFAULT_PROJECT_CATALOGUE_FILTERS);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [capabilityOpen,setCapabilityOpen]=useState(false);
  const [capabilitySearch,setCapabilitySearch]=useState('');
  const [capabilityIndex,setCapabilityIndex]=useState(0);
  const filterDialog=useRef<HTMLDialogElement>(null);
  const closeFilterButton=useRef<HTMLButtonElement>(null);
  const filterTrigger=useRef<HTMLButtonElement>(null);
  const capabilityInput=useRef<HTMLInputElement>(null);

  const roleOptions=useMemo(()=>catalogueFacetOptions(projects,'roleFamilies'),[projects]);
  const capabilityOptions=useMemo(()=>catalogueFacetOptions(projects,'capabilities'),[projects]);
  const domainOptions=useMemo(()=>catalogueFacetOptions(projects,'domains'),[projects]);
  const toolOptions=useMemo(()=>catalogueFacetOptions(projects,'tools'),[projects]);
  const commitmentOptions=useMemo(()=>catalogueSingleFacetOptions(projects,'commitmentFacet'),[projects]);
  const workingModelOptions=useMemo(()=>ordered(catalogueSingleFacetOptions(projects,'workingModelFacet'),workingModelOrder),[projects]);
  const projectTypeOptions=useMemo(()=>ordered(catalogueSingleFacetOptions(projects,'projectTypeFacet'),projectTypeOrder),[projects]);
  const stageOptions=useMemo(()=>ordered(catalogueSingleFacetOptions(projects,'stageFacet'),stageOrder),[projects]);

  const selectedCapability=capabilityOptions.find(item=>item.slug===filters.capability)||null;
  const capabilityMatches=useMemo(()=>{
    const q=capabilitySearch.trim().toLowerCase();
    if(!q)return capabilityOptions;
    return capabilityOptions.filter(item=>[item.label,item.slug,...(item.aliases||[])].join(' ').toLowerCase().includes(q));
  },[capabilityOptions,capabilitySearch]);

  const visible=useMemo(()=>filterAndSortProjectCatalogue(projects,filters),[projects,filters]);
  const activeCount=activeProjectCatalogueFilterCount(filters);

  const filterPairs=[
    {key:'role' as const,label:'Role',value:filters.role==='all'?null:labelFor(roleOptions,filters.role)},
    {key:'capability' as const,label:'Skill',value:filters.capability==='all'?null:labelFor(capabilityOptions,filters.capability)},
    {key:'domain' as const,label:'Domain',value:filters.domain==='all'?null:labelFor(domainOptions,filters.domain)},
    {key:'tool' as const,label:'Tool',value:filters.tool==='all'?null:labelFor(toolOptions,filters.tool)},
    {key:'commitment' as const,label:'Commitment',value:filters.commitment==='all'?null:labelFor(commitmentOptions,filters.commitment)},
    {key:'workingModel' as const,label:'Working model',value:filters.workingModel==='all'?null:labelFor(workingModelOptions,filters.workingModel)},
    {key:'projectType' as const,label:'Project type',value:filters.projectType==='all'?null:labelFor(projectTypeOptions,filters.projectType)},
    {key:'stage' as const,label:'Stage',value:filters.stage==='all'?null:labelFor(stageOptions,filters.stage)}
  ].filter(item=>item.value) as {key:FacetKey;label:string;value:string}[];

  useEffect(()=>{
    const dialog=filterDialog.current;
    if(!dialog)return;
    if(filtersOpen&&!dialog.open){
      dialog.showModal();
      const current=capabilityOptions.find(item=>item.slug===filters.capability);
      setCapabilitySearch(current?.label||'');
      requestAnimationFrame(()=>closeFilterButton.current?.focus());
    }
    if(!filtersOpen&&dialog.open)dialog.close();
  },[filtersOpen,capabilityOptions,filters.capability]);

  useEffect(()=>{
    window.dispatchEvent(new CustomEvent('mettelo:discover-refinement-change',{detail:{count:visible.length}}));
  },[filters,visible.length]);

  function updateFacet(key:FacetKey,value:string){setFilters(current=>({...current,[key]:value}))}
  function clearFilters(){setFilters(current=>({...DEFAULT_PROJECT_CATALOGUE_FILTERS,query:current.query}));setCapabilitySearch('');setCapabilityOpen(false)}
  function clearSearchAndFilters(){setFilters(DEFAULT_PROJECT_CATALOGUE_FILTERS);setCapabilitySearch('');setCapabilityOpen(false)}
  function remove(key:FacetKey){updateFacet(key,'all');if(key==='capability'){setCapabilitySearch('');setCapabilityOpen(false)}}
  function closeFilters(){setCapabilityOpen(false);setFiltersOpen(false);requestAnimationFrame(()=>filterTrigger.current?.focus())}
  function chooseCapability(option:CatalogueFacet){setFilters(current=>({...current,capability:option.slug}));setCapabilitySearch(option.label);setCapabilityOpen(false);setCapabilityIndex(0);requestAnimationFrame(()=>capabilityInput.current?.focus())}
  function onCapabilityChange(value:string){setCapabilitySearch(value);setCapabilityOpen(true);setCapabilityIndex(0);if(selectedCapability&&value!==selectedCapability.label)setFilters(current=>({...current,capability:'all'}))}
  function onCapabilityKeyDown(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==='Escape'&&capabilityOpen){event.preventDefault();event.stopPropagation();setCapabilityOpen(false);return}
    if(event.key==='ArrowDown'){
      event.preventDefault();
      if(!capabilityOpen){setCapabilityOpen(true);setCapabilityIndex(0)}
      else setCapabilityIndex(index=>Math.min(Math.max(0,capabilityMatches.length-1),index+1));
      return;
    }
    if(event.key==='ArrowUp'){
      event.preventDefault();
      if(!capabilityOpen){setCapabilityOpen(true);setCapabilityIndex(Math.max(0,capabilityMatches.length-1))}
      else setCapabilityIndex(index=>Math.max(0,index-1));
      return;
    }
    if(event.key==='Enter'&&capabilityOpen&&capabilityMatches[capabilityIndex]){event.preventDefault();chooseCapability(capabilityMatches[capabilityIndex])}
  }

  return <>
    <section className="mdControlsV2" aria-label="Project search and filters">
      <div className="mdSearchRowV2">
        <label className="mdSearchWrapV2">
          <span className="mdSrOnly">Search projects</span>
          <input className="mdSearchV2" type="search" value={filters.query} onChange={event=>setFilters(current=>({...current,query:event.target.value}))} placeholder="Search projects, skills or topics"/>
          <span className="mdSearchGlyphV2" aria-hidden="true">⌕</span>
        </label>
        <button ref={filterTrigger} className="mdButton mdButtonPrimary mdFilterTriggerV2" type="button" onClick={()=>setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}>Filters · {activeCount}</button>
      </div>
      <div className="mdFilterSummaryV2" aria-label="Current catalogue refinements">
        {filterPairs.map(item=><button className="mdActiveChipV2" key={item.key} type="button" onClick={()=>remove(item.key)} aria-label={`Remove ${item.label}: ${item.value} filter`}><span>{item.label}: {item.value}</span><b aria-hidden="true">×</b></button>)}
        <button className="mdPassiveChipV2" type="button" onClick={()=>setFiltersOpen(true)}>Sort: {sortLabels[filters.sort]}</button>
        {(activeCount>0||filters.sort!=='recent')&&<button className="mdClearInlineV2" type="button" onClick={clearFilters}>Clear filters</button>}
      </div>
    </section>

    <div className="mdCatalogueHead"><strong aria-live="polite" aria-atomic="true">{visible.length} {visible.length===1?'project':'projects'} shown</strong><span>Discover is broad. Recommended is personalised.</span></div>

    {visible.length?<section className="mdProjectGrid" aria-label="Discover projects">
      {visible.map(item=><article className={`mdProjectCard ${item.state==='open_eligible'?'mdCardOpen':''}`} key={item.id}>
        <div className="mdCardTop"><span className={`mdStatus ${statusClass(item.state)}`}>{item.stateLabel}</span><SaveProjectButton projectId={item.id} initialSaved={item.saved} compact/></div>
        {item.pathContext&&<div className="mdPathContext" aria-label={`Capability Path context: ${item.pathContext.name}, Project ${item.pathContext.position}, ${item.pathContext.stage}`}><span>{item.pathContext.isPrimary?'PRIMARY PATH':'PATH'}</span><strong>{item.pathContext.name}</strong><b aria-hidden="true">·</b><span>Project {item.pathContext.position}</span><b aria-hidden="true">·</b><span>{item.pathContext.stage}</span></div>}
        <h2>{item.title}</h2><p>{item.summary}</p>
        <div className="mdFacts">{(item.workingModelFacet?.label||item.workingModel)&&<div><small>Working model</small><strong>{item.workingModelFacet?.label||item.workingModel}</strong></div>}{item.durationWeeks&&<div><small>Duration</small><strong>{item.durationWeeks} {item.durationWeeks===1?'week':'weeks'}</strong></div>}{item.commitment&&<div><small>Commitment</small><strong>{item.commitment}</strong></div>}</div>
        {item.roles.length>0&&<div className="mdGroup"><span className="mdLabel">{['confirmed','active','completed'].includes(item.state)?'Project roles':'Open roles'}</span><div className="mdTags">{item.roles.slice(0,4).map(value=><span className="mdTag" key={value}>{value}</span>)}</div></div>}
        {item.capabilities.length>0&&<div className="mdGroup"><span className="mdLabel">Skills / capabilities</span><div className="mdTags">{item.capabilities.slice(0,5).map(value=><span className="mdTag mdSkill" key={value.slug}>{value.label}</span>)}</div></div>}
        <div className="mdDeadline"><small>{['open_eligible','ineligible'].includes(item.state)?'Applications close':'Your status'}</small><strong>{['open_eligible','ineligible'].includes(item.state)?formatDeadline(item.deadline):item.stateLabel}</strong></div>
        <div className="mdCardActions"><Link className="mdButton mdButtonPrimary" href={item.action.href}>{item.action.label}</Link></div>
      </article>)}
    </section>:<section className="mdEmpty" role="status"><h2>No projects match these refinements</h2><p>Try changing your search or removing one of the active filters.</p><button className="mdButton mdButtonPrimary" type="button" onClick={clearSearchAndFilters}>Clear search and filters</button></section>}

    <section className="mdRecommended" id="recommended"><div><div className="mdEyebrow">WANT A SHORTER LIST?</div><h2>See projects matched to you</h2><p>Recommended uses your profile and primary Capability Path where relevant. Discover stays broad so a Path never restricts what you can explore.</p></div><Link className="mdButton mdButtonPrimary" href="/member/recommended">View Recommended</Link></section>

    <dialog className="mdFilterDialogV2" ref={filterDialog} onClose={()=>{setCapabilityOpen(false);setFiltersOpen(false);requestAnimationFrame(()=>filterTrigger.current?.focus())}} aria-labelledby="member-filter-title" aria-describedby="member-filter-description">
      <section className="mdFilterPanelV2">
        <div className="mdGrabberV2" aria-hidden="true"/>
        <div className="mdFilterHeadV2">
          <div><div className="mdEyebrow">Refine catalogue</div><h2 id="member-filter-title">Filter projects</h2></div>
          <button ref={closeFilterButton} className="mdIconButtonV2" type="button" onClick={closeFilters} aria-label="Close project filters">×</button>
        </div>
        <p id="member-filter-description" className="mdFilterIntroV2">Choose only what helps narrow the catalogue. Capability Path context is managed separately.</p>

        <fieldset className="mdFilterGroupV2">
          <legend>What you want to work on</legend>
          <div className="mdFilterGridV2">
            <label><span>Role</span><select className="mdSelectV2" value={filters.role} onChange={event=>updateFacet('role',event.target.value)}><option value="all">All roles</option>{roleOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
            <div className="mdComboFieldV2">
              <label htmlFor="member-capability-filter">Skill / capability</label>
              <div className="mdComboWrapV2">
                <input ref={capabilityInput} id="member-capability-filter" className="mdSelectV2 mdComboInputV2" type="search" role="combobox" autoComplete="off" value={capabilitySearch} placeholder="Search capabilities" aria-autocomplete="list" aria-expanded={capabilityOpen} aria-controls="member-capability-options" aria-activedescendant={capabilityOpen&&capabilityMatches[capabilityIndex]?`member-capability-option-${capabilityMatches[capabilityIndex].slug}`:undefined} onFocus={()=>setCapabilityOpen(true)} onChange={event=>onCapabilityChange(event.target.value)} onKeyDown={onCapabilityKeyDown} onBlur={()=>requestAnimationFrame(()=>{if(document.activeElement!==capabilityInput.current)setCapabilityOpen(false)})}/>
                {filters.capability!=='all'&&<button className="mdComboClearV2" type="button" aria-label={`Clear Skill: ${labelFor(capabilityOptions,filters.capability)} filter`} onMouseDown={event=>event.preventDefault()} onClick={()=>remove('capability')}>×</button>}
                {capabilityOpen&&<div id="member-capability-options" className="mdComboListV2" role="listbox" aria-label="Skill and capability options">
                  {capabilityMatches.length?capabilityMatches.map((option,index)=><button id={`member-capability-option-${option.slug}`} key={option.slug} type="button" role="option" aria-selected={filters.capability===option.slug} className={`mdComboOptionV2 ${index===capabilityIndex?'isActive':''}`} tabIndex={-1} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setCapabilityIndex(index)} onClick={()=>chooseCapability(option)}>{option.label}</button>):<p className="mdComboEmptyV2">No capabilities match</p>}
                </div>}
              </div>
            </div>
            <label><span>Domain</span><select className="mdSelectV2" value={filters.domain} onChange={event=>updateFacet('domain',event.target.value)}><option value="all">All domains</option>{domainOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
            <label><span>Tool / technology</span><select className="mdSelectV2" value={filters.tool} onChange={event=>updateFacet('tool',event.target.value)}><option value="all">All tools</option>{toolOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
          </div>
        </fieldset>

        <fieldset className="mdFilterGroupV2">
          <legend>How you want to work</legend>
          <div className="mdFilterGridV2">
            <label><span>Commitment</span><select className="mdSelectV2" value={filters.commitment} onChange={event=>updateFacet('commitment',event.target.value)}><option value="all">Any commitment</option>{commitmentOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
            <label><span>Working model</span><select className="mdSelectV2" value={filters.workingModel} onChange={event=>updateFacet('workingModel',event.target.value)}><option value="all">Any working model</option>{workingModelOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
            <label><span>Project type</span><select className="mdSelectV2" value={filters.projectType} onChange={event=>updateFacet('projectType',event.target.value)}><option value="all">Any project type</option>{projectTypeOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
            <label><span>Project stage</span><select className="mdSelectV2" value={filters.stage} onChange={event=>updateFacet('stage',event.target.value)}><option value="all">Any project stage</option>{stageOptions.map(value=><option key={value.slug} value={value.slug}>{value.label}</option>)}</select></label>
          </div>
        </fieldset>

        <fieldset className="mdFilterGroupV2 mdSortGroupV2">
          <legend>Sort results</legend>
          <label><span className="mdSrOnly">Sort projects</span><select className="mdSelectV2" value={filters.sort} onChange={event=>setFilters(current=>({...current,sort:event.target.value as ProjectCatalogueSort}))}><option value="recent">Recently added</option><option value="closing">Closing soon</option><option value="duration-short">Shortest duration</option><option value="duration-long">Longest duration</option></select></label>
        </fieldset>

        <div className="mdFilterActionsV2"><button className="mdButton" type="button" onClick={clearFilters}>Clear all</button><button className="mdButton mdButtonPrimary" type="button" onClick={closeFilters}>Show {visible.length} {visible.length===1?'project':'projects'}</button></div>
      </section>
    </dialog>
    <style jsx global>{styles}</style>
  </>;
}

const styles=`
.mdSrOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.mdEyebrow,.mdLabel{font-family:var(--font-plex-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.11em}.mdEyebrow{font-size:10px;color:#72551e;font-weight:700}.mdButton{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;font-size:13px;font-weight:800}.mdButtonPrimary{background:#111318;border-color:#111318;color:#fff}.mdButton:focus-visible,.mdSelectV2:focus-visible,.mdSearchV2:focus-visible,.mdActiveChipV2:focus-visible,.mdPassiveChipV2:focus-visible,.mdClearInlineV2:focus-visible,.mdIconButtonV2:focus-visible,.mdComboClearV2:focus-visible,.mdComboOptionV2:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
.mdControlsV2{margin:8px 0 18px;display:grid;gap:10px}.mdSearchRowV2{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}.mdSearchWrapV2{position:relative;min-width:0}.mdSearchV2{width:100%;height:52px;border:1px solid #b8c0c9;border-radius:12px;background:#fff;padding:0 46px 0 14px;color:#111318;font-size:16px}.mdSearchV2::placeholder{color:#7a838e}.mdSearchGlyphV2{position:absolute;right:15px;top:50%;transform:translateY(-50%);color:#68727d}.mdFilterTriggerV2{min-width:128px;height:52px}.mdFilterSummaryV2{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-height:36px}.mdActiveChipV2,.mdPassiveChipV2{min-height:34px;border:1px solid #d8dde3;border-radius:999px;background:#fff;padding:0 10px;color:#46515e;font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;gap:7px}.mdActiveChipV2{background:#f7f1e7;border-color:#dcc9aa;color:#694613}.mdActiveChipV2 b{font-size:14px}.mdClearInlineV2{min-height:34px;border:0;background:transparent;color:#59636f;text-decoration:underline;text-underline-offset:3px;font-size:10.5px;font-weight:800;padding:0 6px}
.mdCatalogueHead{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:20px 0 12px;scroll-margin-top:18px}.mdCatalogueHead strong{font-size:13px}.mdCatalogueHead span{font-size:11px;color:#68727d}.mdProjectGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mdProjectCard{background:#fff;border:1px solid #d8dde3;border-radius:16px;padding:18px;display:flex;flex-direction:column;min-height:340px;min-width:0}.mdCardOpen{background:linear-gradient(135deg,#fff,#fffaf0)}.mdCardTop{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.mdStatus{display:inline-flex;align-items:center;width:max-content;max-width:100%;min-height:30px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:850}.mdStatus::before{margin-right:6px}.mdStatusOpen{background:#edf8f1;color:#185b3c}.mdStatusOpen::before{content:'✓'}.mdStatusApplied{background:#eef4fb;color:#244f8f}.mdStatusApplied::before{content:'●'}.mdStatusMember{background:#eef7f1;color:#205c40}.mdStatusMember::before{content:'✓'}.mdStatusQuiet{background:#f2f3f4;color:#505a65}.mdStatusQuiet::before{content:'—'}.mdPathContext{margin-top:11px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;color:#5b6472;font-size:10px;line-height:1.4}.mdPathContext>span:first-child{font:800 9px var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.08em;color:#8b5a17}.mdPathContext strong{color:#2a2f52;font-size:10.5px}.mdPathContext b{font-weight:400;color:#a3a8af}.mdProjectCard h2{margin:9px 0 7px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px;line-height:1.15;letter-spacing:-.025em;overflow-wrap:anywhere}.mdProjectCard>p{margin:0;color:#68727d;font-size:12.7px;line-height:1.58}.mdFacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}.mdFacts>div{border:1px solid #e3e6e9;border-radius:10px;background:#f8f8f6;padding:9px;min-width:0}.mdFacts small,.mdLabel{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#737e89;font-weight:700}.mdFacts strong{display:block;margin-top:3px;font-size:11.5px;overflow-wrap:anywhere}.mdGroup{margin-top:14px}.mdTags{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px}.mdTag{padding:6px 9px;border-radius:999px;background:#eef1f4;color:#46515e;font-size:10px;font-weight:800}.mdSkill{background:#f5f1e8;color:#5f5645}.mdDeadline{margin-top:14px;padding-top:13px;border-top:1px solid #d8dde3;display:flex;align-items:center;justify-content:space-between;gap:12px}.mdDeadline small{color:#68727d;font-size:10px}.mdDeadline strong{font-size:11.5px;text-align:right}.mdCardActions{margin-top:auto;padding-top:15px;display:flex}.mdCardActions .mdButton{flex:1}.mdEmpty{margin-top:20px;background:#fff;border:1px dashed #b8c0c9;border-radius:14px;padding:22px}.mdEmpty h2{margin:0 0 6px;font-size:18px}.mdEmpty p{margin:0 0 14px;color:#68727d}.mdRecommended{margin-top:32px;background:#e9e3d7;border:1px solid #d6cebd;border-radius:16px;padding:20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center}.mdRecommended h2{margin:5px 0;font-size:23px}.mdRecommended p{margin:0;color:#59636f;font-size:12.5px;line-height:1.55}
.mdFilterDialogV2{width:min(820px,calc(100vw - 32px));max-width:none;border:0;padding:0;background:transparent;overflow:visible}.mdFilterDialogV2::backdrop{background:rgba(22,28,39,.46);backdrop-filter:blur(1px)}.mdFilterPanelV2{background:#fff;border:1px solid #d8dde3;border-radius:18px;padding:18px;box-shadow:0 22px 60px rgba(17,19,24,.2)}.mdGrabberV2{display:none}.mdFilterHeadV2{display:flex;justify-content:space-between;gap:14px;align-items:center}.mdFilterHeadV2 h2{margin:3px 0 0;font-size:22px;letter-spacing:-.025em}.mdIconButtonV2{width:44px;height:44px;border:1px solid #b8c0c9;border-radius:11px;background:#fff;font-size:20px;font-weight:800}.mdFilterIntroV2{margin:7px 0 15px;color:#68727d;font-size:12px}.mdFilterGroupV2{margin:0;padding:14px 0;border:0;border-top:1px solid #e5e8eb}.mdFilterGroupV2 legend{padding:0 0 10px;font:800 10px var(--font-plex-mono),ui-monospace,monospace;text-transform:uppercase;letter-spacing:.1em;color:#72551e}.mdFilterGridV2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.mdFilterGridV2 label,.mdComboFieldV2{display:grid;gap:6px;min-width:0}.mdFilterGridV2 label>span,.mdComboFieldV2>label{font-size:10px;font-weight:800;color:#59636f}.mdSelectV2{width:100%;height:46px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;padding:0 10px;font-size:16px}.mdSortGroupV2>label{display:block}.mdComboWrapV2{position:relative}.mdComboInputV2{padding-right:42px}.mdComboClearV2{position:absolute;right:5px;top:5px;width:36px;height:36px;border:0;border-radius:8px;background:#f1f3f5;color:#4f5964;font-size:18px;font-weight:800}.mdComboListV2{position:absolute;z-index:5;left:0;right:0;top:calc(100% + 5px);max-height:230px;overflow:auto;border:1px solid #b8c0c9;border-radius:10px;background:#fff;box-shadow:0 12px 28px rgba(17,19,24,.14);padding:5px}.mdComboOptionV2{display:block;width:100%;min-height:42px;border:0;border-radius:7px;background:#fff;color:#111318;text-align:left;padding:8px 10px;font-size:13px;font-weight:700}.mdComboOptionV2:hover,.mdComboOptionV2.isActive,.mdComboOptionV2[aria-selected="true"]{background:#f4efe5;color:#694613}.mdComboEmptyV2{margin:0;padding:12px 10px;color:#68727d;font-size:12px}.mdFilterActionsV2{display:flex;justify-content:flex-end;gap:9px;margin-top:10px;padding-top:14px;border-top:1px solid #e5e8eb}
@media(max-width:820px){.mdProjectGrid{grid-template-columns:1fr}.mdRecommended{grid-template-columns:1fr}.mdRecommended .mdButton{justify-self:start}}
@media(max-width:680px){.mdControlsV2{margin-top:7px}.mdSearchRowV2{grid-template-columns:minmax(0,1fr) auto;gap:8px}.mdSearchV2{height:48px;font-size:16px;padding-left:12px}.mdFilterTriggerV2{height:48px;min-width:94px;padding:0 11px;font-size:11.5px}.mdFilterSummaryV2{flex-wrap:nowrap;overflow-x:auto;padding:1px 0 3px;scrollbar-width:none}.mdFilterSummaryV2::-webkit-scrollbar{display:none}.mdActiveChipV2,.mdPassiveChipV2{flex:none}.mdClearInlineV2{flex:none}.mdCatalogueHead{margin-top:17px}.mdCatalogueHead span{display:none}.mdFacts{grid-template-columns:repeat(2,minmax(0,1fr))}.mdFilterDialogV2{width:100%;max-width:none;height:100%;max-height:none;margin:0;padding:0;border:0;background:transparent}.mdFilterDialogV2::backdrop{background:rgba(28,36,51,.68)}.mdFilterPanelV2{position:absolute;left:0;right:0;bottom:0;border:0;border-top:1px solid #d8dde3;border-radius:22px 22px 0 0;padding:12px 16px calc(18px + env(safe-area-inset-bottom));max-height:min(90vh,820px);overflow:auto;box-shadow:0 -18px 48px rgba(17,19,24,.22)}.mdGrabberV2{display:block;width:42px;height:4px;border-radius:999px;background:#c9ced4;margin:0 auto 13px}.mdFilterHeadV2 h2{font-size:23px}.mdFilterIntroV2{font-size:12px;margin-bottom:13px}.mdFilterGroupV2{padding:13px 0}.mdFilterGridV2{grid-template-columns:1fr;gap:11px}.mdSelectV2{height:48px;font-size:16px}.mdComboListV2{position:relative;top:auto;margin-top:5px;max-height:190px}.mdFilterActionsV2{display:grid;grid-template-columns:1fr 1.35fr;position:sticky;bottom:-1px;background:#fff;padding-top:14px;margin-top:4px}.mdFilterActionsV2 .mdButton{min-height:48px}.mdRecommended{margin-top:24px;padding:17px}.mdProjectCard{padding:16px;min-height:0}}
@media(max-width:380px){.mdFilterTriggerV2{min-width:86px;padding:0 9px}.mdSearchV2::placeholder{font-size:12.5px}.mdFacts{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.mdFilterDialogV2::backdrop{backdrop-filter:none}.mdSearchGlyphV2,.mdFilterPanelV2,.mdActiveChipV2,.mdPassiveChipV2,.mdButton{transition:none!important;animation:none!important}}
`;
