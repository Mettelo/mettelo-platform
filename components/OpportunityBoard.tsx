'use client';

import { useMemo,useState } from 'react';

type Opportunity={id:string;title:string;organisation:string|null;opportunity_type:string;summary:string|null;location:string|null;eligibility:string|null;source_url:string|null;official_application_url:string|null;closes_at:string|null;published_at:string|null;data_ai_relevance_score:number|null;remote_scope:string|null;source_organisation:string|null};

const PAGE_SIZE=10;
function cleanText(value:string|null){if(!value)return '';let text=value;for(let i=0;i<2;i++)text=text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');return text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function short(value:string|null,max=180){const text=cleanText(value);return text.length>max?`${text.slice(0,max).trim()}…`:text;}

export default function OpportunityBoard({items}:{items:Opportunity[]}){
  const [query,setQuery]=useState('');const [type,setType]=useState('all');const [location,setLocation]=useState('all');const [sort,setSort]=useState('newest');const [page,setPage]=useState(1);
  const locations=useMemo(()=>Array.from(new Set(items.map(item=>item.location).filter(Boolean) as string[])).sort(),[items]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const rows=items.filter(item=>{
      const hay=[item.title,item.organisation,item.location,item.summary].filter(Boolean).join(' ').toLowerCase();
      const typeOk=type==='all'||item.opportunity_type===type;
      const locationOk=location==='all'||(location==='remote'?Boolean(item.remote_scope||item.location?.toLowerCase().includes('remote')):item.location===location);
      return (!q||hay.includes(q))&&typeOk&&locationOk;
    });
    rows.sort((a,b)=>sort==='oldest'?new Date(a.published_at||0).getTime()-new Date(b.published_at||0).getTime():new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime());
    return rows;
  },[items,query,type,location,sort]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const safePage=Math.min(page,totalPages);const visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
  function resetPage(){setPage(1);}
  return <div className="opportunityBoard">
    <div className="opportunityToolbar">
      <div className="opportunitySearch"><label htmlFor="opportunity-search">Search opportunities</label><input id="opportunity-search" value={query} onChange={e=>{setQuery(e.target.value);resetPage();}} placeholder="Search role, company, skill or location"/></div>
      <div><label htmlFor="opportunity-type">Type</label><select id="opportunity-type" value={type} onChange={e=>{setType(e.target.value);resetPage();}}><option value="all">All types</option><option value="job">Jobs</option><option value="volunteer">Volunteer</option><option value="fellowship">Fellowships</option><option value="internship">Internships</option></select></div>
      <div><label htmlFor="opportunity-location">Location</label><select id="opportunity-location" value={location} onChange={e=>{setLocation(e.target.value);resetPage();}}><option value="all">All locations</option><option value="remote">Remote</option>{locations.slice(0,30).map(item=><option key={item} value={item}>{item}</option>)}</select></div>
      <div><label htmlFor="opportunity-sort">Sort</label><select id="opportunity-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
    </div>
    <div className="opportunityResultsBar"><strong>{filtered.length} Data & AI opportunit{filtered.length===1?'y':'ies'}</strong><span>Showing {filtered.length?((safePage-1)*PAGE_SIZE)+1:0}–{Math.min(safePage*PAGE_SIZE,filtered.length)} of {filtered.length}</span></div>
    {visible.length?<div className="opportunityList">{visible.map(item=>{
      const apply=item.official_application_url||item.source_url;return <article className="opportunityCard" key={item.id}>
        <div className="opportunityCardMain"><div className="opportunityTopline"><span className="chip">{item.opportunity_type.toUpperCase()}</span>{item.data_ai_relevance_score&&<span className="metaPill">Data/AI {item.data_ai_relevance_score}/100</span>}</div><h3>{item.title}</h3><div className="opportunityCompany"><strong>{item.organisation||'Organisation'}</strong>{item.location&&<span>· {item.location}</span>}</div>{item.summary&&<p>{short(item.summary)}</p>}<div className="metaRow">{item.remote_scope&&<span className="metaPill">Remote</span>}{item.closes_at&&<span className="metaPill">Closes {new Date(item.closes_at).toLocaleDateString('en-GB')}</span>}{item.source_organisation&&<span className="metaPill">Source: {item.source_organisation}</span>}</div></div>
        <div className="opportunityCardAction">{item.published_at&&<small>Added {new Date(item.published_at).toLocaleDateString('en-GB')}</small>}{apply?<a className="button dark" href={apply} target="_blank" rel="noopener noreferrer">Apply / view role →</a>:<span className="chip">Source unavailable</span>}</div>
      </article>})}</div>:<div className="panel emptyState"><h3>No matching opportunities.</h3><p>Try a broader search or reset the filters.</p></div>}
    {totalPages>1&&<nav className="opportunityPagination" aria-label="Opportunity pages"><button className="button ghost" type="button" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>← Previous</button><span>Page {safePage} of {totalPages}</span><button className="button ghost" type="button" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}>Next →</button></nav>}
  </div>;
}
