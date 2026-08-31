'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';

export type CareerDiscoveryRole={
 id:string;
 slug:string;
 title:string;
 team:string|null;
 employment_type:string;
 location:string|null;
 work_arrangement:string|null;
 salary_text:string|null;
 summary:string;
 closes_at:string|null;
 published_at:string|null;
};

const PAGE_SIZE=9;

function clean(value:string|null|undefined){return (value||'').trim()}
function normal(value:string|null|undefined){return clean(value).toLowerCase()}
function shortSummary(value:string){const text=value.replace(/\\n/g,' ').replace(/\s+/g,' ').trim();return text.length>168?`${text.slice(0,165).trimEnd()}…`:text}
function roleMark(team:string|null){const value=normal(team);if(value.includes('engineering'))return'DEV';if(value.includes('marketing'))return'SOC';if(value.includes('community'))return'COM';if(value.includes('learning'))return'EDU';if(value.includes('growth'))return'GRW';if(value.includes('lab'))return'LAB';if(value.includes('data'))return'DAT';return'MET'}
function formatType(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}
function formatDate(value:string){return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function daysUntil(value:string|null){if(!value)return null;return Math.ceil((new Date(value).getTime()-Date.now())/86400000)}
function pageNumbers(current:number,total:number){if(total<=5)return Array.from({length:total},(_,i)=>i+1);const values=new Set([1,total,current,current-1,current+1]);return Array.from(values).filter(value=>value>0&&value<=total).sort((a,b)=>a-b)}

export default function CareersDiscovery({roles}:{roles:CareerDiscoveryRole[]}){
 const [query,setQuery]=useState('');
 const [team,setTeam]=useState('');
 const [type,setType]=useState('');
 const [working,setWorking]=useState('');
 const [location,setLocation]=useState('');
 const [sort,setSort]=useState<'featured'|'newest'|'closing'>('featured');
 const [page,setPage]=useState(1);
 const [filtersOpen,setFiltersOpen]=useState(false);

 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  setQuery(params.get('q')||'');setTeam(params.get('team')||'');setType(params.get('type')||'');setWorking(params.get('working')||'');setLocation(params.get('location')||'');
  const nextSort=params.get('sort');if(nextSort==='newest'||nextSort==='closing')setSort(nextSort);
  const nextPage=Number(params.get('page')||'1');if(Number.isFinite(nextPage)&&nextPage>0)setPage(nextPage);
 },[]);

 useEffect(()=>{
  const params=new URLSearchParams();
  if(query)params.set('q',query);if(team)params.set('team',team);if(type)params.set('type',type);if(working)params.set('working',working);if(location)params.set('location',location);if(sort!=='featured')params.set('sort',sort);if(page>1)params.set('page',String(page));
  const next=params.toString()?`${window.location.pathname}?${params.toString()}#open-roles`:`${window.location.pathname}#open-roles`;
  window.history.replaceState(null,'',next);
 },[query,team,type,working,location,sort,page]);

 const teams=useMemo(()=>Array.from(new Set(roles.map(role=>clean(role.team)).filter(Boolean))).sort(),[roles]);
 const types=useMemo(()=>Array.from(new Set(roles.map(role=>clean(role.employment_type)).filter(Boolean))).sort(),[roles]);
 const workings=useMemo(()=>Array.from(new Set(roles.map(role=>clean(role.work_arrangement)).filter(Boolean))).sort(),[roles]);
 const locations=useMemo(()=>Array.from(new Set(roles.map(role=>clean(role.location)).filter(Boolean))).sort(),[roles]);

 const filtered=useMemo(()=>{
  const q=normal(query);
  const items=roles.filter(role=>{
   const haystack=[role.title,role.team,role.summary,role.employment_type,role.location,role.work_arrangement,role.salary_text].map(normal).join(' ');
   return (!q||haystack.includes(q))&&(!team||role.team===team)&&(!type||role.employment_type===type)&&(!working||role.work_arrangement===working)&&(!location||role.location===location);
  });
  return [...items].sort((a,b)=>{
   if(sort==='closing'){
    if(!a.closes_at&&!b.closes_at)return 0;if(!a.closes_at)return 1;if(!b.closes_at)return -1;return new Date(a.closes_at).getTime()-new Date(b.closes_at).getTime();
   }
   if(sort==='newest')return new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime();
   const aClosing=daysUntil(a.closes_at);const bClosing=daysUntil(b.closes_at);
   const aUrgent=aClosing!==null&&aClosing>=0&&aClosing<=14?1:0;const bUrgent=bClosing!==null&&bClosing>=0&&bClosing<=14?1:0;
   if(aUrgent!==bUrgent)return bUrgent-aUrgent;
   return new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime();
  });
 },[roles,query,team,type,working,location,sort]);

 const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
 const visible=filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
 const start=filtered.length?(page-1)*PAGE_SIZE+1:0;
 const end=Math.min(page*PAGE_SIZE,filtered.length);
 const activeFilters=[team,type,working,location].filter(Boolean).length+(query?1:0);
 const reset=()=>{setQuery('');setTeam('');setType('');setWorking('');setLocation('');setSort('featured');setPage(1)};
 const changeFilter=(setter:(value:string)=>void,value:string)=>{setter(value);setPage(1)};

 return <div className="careersDiscovery">
  <div className="careersDiscoveryTop">
   <div><span className="careersResultKicker">Role discovery</span><strong>{filtered.length} {filtered.length===1?'opportunity':'opportunities'}</strong></div>
   <label className="careersSort">Sort by<select value={sort} onChange={event=>{setSort(event.target.value as typeof sort);setPage(1)}}><option value="featured">Featured</option><option value="newest">Newest</option><option value="closing">Closing soon</option></select></label>
  </div>

  <div className="careersSearchRow">
   <label className="careersSearch"><span aria-hidden="true">⌕</span><span className="srOnly">Search open roles</span><input value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="Search role, team, skill or keyword" /></label>
   <button className="careersMobileFilterButton" type="button" onClick={()=>setFiltersOpen(value=>!value)} aria-expanded={filtersOpen} aria-controls="career-filters">Filters{activeFilters?` ${activeFilters}`:''}</button>
  </div>

  <div id="career-filters" className={`careersFilters${filtersOpen?' isOpen':''}`}>
   <label>Team<select value={team} onChange={event=>changeFilter(setTeam,event.target.value)}><option value="">All teams</option>{teams.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
   <label>Role type<select value={type} onChange={event=>changeFilter(setType,event.target.value)}><option value="">All types</option>{types.map(value=><option value={value} key={value}>{formatType(value)}</option>)}</select></label>
   <label>Working model<select value={working} onChange={event=>changeFilter(setWorking,event.target.value)}><option value="">Any model</option>{workings.map(value=><option value={value} key={value}>{formatType(value)}</option>)}</select></label>
   <label>Location<select value={location} onChange={event=>changeFilter(setLocation,event.target.value)}><option value="">Any location</option>{locations.map(value=><option value={value} key={value}>{value}</option>)}</select></label>
   {activeFilters>0&&<button className="careersClear" type="button" onClick={reset}>Clear all</button>}
  </div>

  {activeFilters>0&&<div className="careersActiveFilters" aria-label="Active role filters">
   {query&&<button type="button" onClick={()=>changeFilter(setQuery,'')}>Search: {query} ×</button>}
   {team&&<button type="button" onClick={()=>changeFilter(setTeam,'')}>{team} ×</button>}
   {type&&<button type="button" onClick={()=>changeFilter(setType,'')}>{formatType(type)} ×</button>}
   {working&&<button type="button" onClick={()=>changeFilter(setWorking,'')}>{formatType(working)} ×</button>}
   {location&&<button type="button" onClick={()=>changeFilter(setLocation,'')}>{location} ×</button>}
  </div>}

  <div className="careersResultSummary" role="status" aria-live="polite">{filtered.length?`Showing ${start}–${end} of ${filtered.length} roles`:'No roles match your search and filters.'}</div>

  {visible.length?<div className="careersGrid">{visible.map(role=>{
   const remaining=daysUntil(role.closes_at);const closingSoon=remaining!==null&&remaining>=0&&remaining<=14;
   const locationLabel=clean(role.location);const workingLabel=clean(role.work_arrangement);
   const showWorking=workingLabel&&normal(workingLabel)!==normal(locationLabel)&&!normal(locationLabel).includes(normal(workingLabel));
   return <article className="careerCard" key={role.id}>
    <div className="careerCardTop"><div className="careerRoleMark" aria-hidden="true">{roleMark(role.team)}</div><span className={closingSoon?'careerClosingSoon':'careerOpen'}><i/>{closingSoon?`Closing soon${remaining!==null?` · ${remaining}d`:''}`:'Open'}</span></div>
    <div className="careerCardBody"><p className="careerTeam">{role.team||'Mettelo'}</p><h3><Link href={`/careers/${role.slug}`}>{role.title}</Link></h3><p className="careerSummary">{shortSummary(role.summary)}</p><div className="careerFacts"><span>{formatType(role.employment_type)}</span>{showWorking&&<span>{formatType(workingLabel)}</span>}</div>{locationLabel&&<p className="careerLocation">{locationLabel}</p>}{role.salary_text&&<p className="careerComp">{role.salary_text}</p>}</div>
    <div className="careerCardFoot"><span>{role.closes_at?`Closes ${formatDate(role.closes_at)}`:'Open until filled'}</span><Link className="careerView" href={`/careers/${role.slug}`}>View role <span aria-hidden="true">→</span></Link></div>
   </article>})}</div>:<div className="careersEmpty careersNoResults"><h3>No roles match those filters.</h3><p>Try broadening your search or clear the current filters to see all open opportunities.</p><button className="button ghost" type="button" onClick={reset}>Clear filters</button></div>}

  {filtered.length>PAGE_SIZE&&<nav className="careersPagination" aria-label="Open roles pages">
   <span>Showing {start}–{end} of {filtered.length}</span><div><button type="button" disabled={page===1} onClick={()=>setPage(value=>Math.max(1,value-1))}>← Previous</button>{pageNumbers(page,totalPages).map((value,index,array)=><span key={value}>{index>0&&value-array[index-1]>1&&<i aria-hidden="true">…</i>}<button type="button" className={page===value?'isCurrent':''} aria-current={page===value?'page':undefined} onClick={()=>setPage(value)}>{value}</button></span>)}<button type="button" disabled={page===totalPages} onClick={()=>setPage(value=>Math.min(totalPages,value+1))}>Next →</button></div>
  </nav>}
 </div>
}
