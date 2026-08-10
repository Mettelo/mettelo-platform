'use client';

import { useMemo,useState } from 'react';

type Opportunity={id:string;title:string;organisation:string|null;opportunity_type:string;summary:string|null;location:string|null;eligibility:string|null;source_url:string|null;official_application_url:string|null;closes_at:string|null;published_at:string|null;data_ai_relevance_score:number|null;remote_scope:string|null;source_organisation:string|null;country_code:string|null;region_code:string|null;applicant_scope:string;work_arrangement:string|null;sponsorship_status:string};

const PAGE_SIZE=10;
const countryLabels:Record<string,string>={GB:'United Kingdom',NG:'Nigeria',IN:'India',US:'United States',CA:'Canada',AU:'Australia',DE:'Germany',FR:'France',NL:'Netherlands',ES:'Spain',IE:'Ireland',IT:'Italy',PL:'Poland',SK:'Slovakia',HU:'Hungary',RO:'Romania',RS:'Serbia',GLOBAL:'Remote / Global'};
const regionLabels:Record<string,string>={UK:'United Kingdom',EUROPE:'Europe',AFRICA:'Africa',ASIA:'Asia',NORTH_AMERICA:'North America',OCEANIA:'Oceania',GLOBAL:'Remote / Global'};
const sponsorshipLabels:Record<string,string>={confirmed:'Sponsorship confirmed',licensed_sponsor:'Licensed sponsor employer',not_offered:'No sponsorship',not_stated:'Sponsorship not stated',unclear:'Sponsorship unclear',unknown:'Sponsorship unknown'};
const scopeLabels:Record<string,string>={worldwide:'Worldwide applicants',international_accepted:'International applicants',country_restricted:'Country restricted',remote_worldwide:'Remote worldwide',unknown:'Eligibility unknown'};
function cleanText(value:string|null){if(!value)return '';let text=value;for(let i=0;i<2;i++)text=text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');return text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function short(value:string|null,max=180){const text=cleanText(value);return text.length>max?`${text.slice(0,max).trim()}…`:text;}

export default function OpportunityBoard({items}:{items:Opportunity[]}){
  const [query,setQuery]=useState('');const [type,setType]=useState('all');const [country,setCountry]=useState('all');const [region,setRegion]=useState('all');const [arrangement,setArrangement]=useState('all');const [sponsorship,setSponsorship]=useState('all');const [scope,setScope]=useState('all');const [sort,setSort]=useState('newest');const [page,setPage]=useState(1);
  const countries=useMemo(()=>Array.from(new Set(items.map(item=>item.country_code).filter(Boolean) as string[])).sort((a,b)=>(countryLabels[a]||a).localeCompare(countryLabels[b]||b)),[items]);
  const regions=useMemo(()=>Array.from(new Set(items.map(item=>item.region_code).filter(Boolean) as string[])).sort((a,b)=>(regionLabels[a]||a).localeCompare(regionLabels[b]||b)),[items]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const rows=items.filter(item=>{
      const hay=[item.title,item.organisation,item.location,item.summary,item.country_code?countryLabels[item.country_code]:null,item.region_code?regionLabels[item.region_code]:null].filter(Boolean).join(' ').toLowerCase();
      const typeOk=type==='all'||item.opportunity_type===type;
      const countryOk=country==='all'||item.country_code===country;
      const regionOk=region==='all'||item.region_code===region;
      const arrangementOk=arrangement==='all'||(arrangement==='remote'?Boolean(item.remote_scope||item.work_arrangement==='remote'):item.work_arrangement===arrangement);
      const sponsorshipOk=sponsorship==='all'||item.sponsorship_status===sponsorship;
      const scopeOk=scope==='all'||(scope==='international'?['worldwide','international_accepted','remote_worldwide'].includes(item.applicant_scope):item.applicant_scope===scope);
      return (!q||hay.includes(q))&&typeOk&&countryOk&&regionOk&&arrangementOk&&sponsorshipOk&&scopeOk;
    });
    rows.sort((a,b)=>sort==='oldest'?new Date(a.published_at||0).getTime()-new Date(b.published_at||0).getTime():new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime());return rows;
  },[items,query,type,country,region,arrangement,sponsorship,scope,sort]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));const safePage=Math.min(page,totalPages);const visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
  function resetPage(){setPage(1);}function clearFilters(){setQuery('');setType('all');setCountry('all');setRegion('all');setArrangement('all');setSponsorship('all');setScope('all');setSort('newest');setPage(1);}
  const hasFilters=Boolean(query||type!=='all'||country!=='all'||region!=='all'||arrangement!=='all'||sponsorship!=='all'||scope!=='all');
  return <div className="opportunityBoard">
    <div className="opportunityToolbar">
      <div className="opportunitySearch"><label htmlFor="opportunity-search">Search opportunities</label><input id="opportunity-search" value={query} onChange={e=>{setQuery(e.target.value);resetPage();}} placeholder="Search role, company, skill or location"/></div>
      <div><label htmlFor="opportunity-type">Type</label><select id="opportunity-type" value={type} onChange={e=>{setType(e.target.value);resetPage();}}><option value="all">All types</option><option value="job">Jobs</option><option value="internship">Internships</option><option value="graduate">Graduate</option><option value="apprenticeship">Apprenticeships</option><option value="volunteer">Volunteer</option><option value="fellowship">Fellowships</option></select></div>
      <div><label htmlFor="opportunity-country">Country</label><select id="opportunity-country" value={country} onChange={e=>{setCountry(e.target.value);resetPage();}}><option value="all">All countries</option>{countries.map(code=><option key={code} value={code}>{countryLabels[code]||code}</option>)}</select></div>
      <div><label htmlFor="opportunity-region">Region</label><select id="opportunity-region" value={region} onChange={e=>{setRegion(e.target.value);resetPage();}}><option value="all">All regions</option>{regions.map(code=><option key={code} value={code}>{regionLabels[code]||code}</option>)}</select></div>
      <div><label htmlFor="opportunity-arrangement">Work style</label><select id="opportunity-arrangement" value={arrangement} onChange={e=>{setArrangement(e.target.value);resetPage();}}><option value="all">Any arrangement</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></div>
      <div><label htmlFor="opportunity-sponsorship">Visa sponsorship</label><select id="opportunity-sponsorship" value={sponsorship} onChange={e=>{setSponsorship(e.target.value);resetPage();}}><option value="all">Any sponsorship status</option><option value="confirmed">Sponsorship confirmed</option><option value="licensed_sponsor">Licensed sponsor employer</option><option value="not_stated">Not stated</option><option value="not_offered">No sponsorship</option></select></div>
      <div><label htmlFor="opportunity-scope">Applicant eligibility</label><select id="opportunity-scope" value={scope} onChange={e=>{setScope(e.target.value);resetPage();}}><option value="all">Any applicant scope</option><option value="international">International / worldwide</option><option value="country_restricted">Country restricted</option><option value="unknown">Unknown</option></select></div>
      <div><label htmlFor="opportunity-sort">Sort</label><select id="opportunity-sort" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
    </div>
    <div className="opportunityResultsBar"><div><strong>{filtered.length} Data & AI opportunit{filtered.length===1?'y':'ies'}</strong><span>Showing {filtered.length?((safePage-1)*PAGE_SIZE)+1:0}–{Math.min(safePage*PAGE_SIZE,filtered.length)} of {filtered.length}</span></div>{hasFilters&&<button className="button ghost" type="button" onClick={clearFilters}>Clear filters</button>}</div>
    {visible.length?<div className="opportunityList">{visible.map(item=>{const apply=item.official_application_url||item.source_url;return <article className="opportunityCard" key={item.id}>
      <div className="opportunityCardMain"><div className="opportunityTopline"><span className="chip">{item.opportunity_type.toUpperCase()}</span>{item.country_code&&<span className="metaPill">{countryLabels[item.country_code]||item.country_code}</span>}{!item.country_code&&item.region_code&&<span className="metaPill">{regionLabels[item.region_code]||item.region_code}</span>}{item.data_ai_relevance_score&&<span className="metaPill">Data/AI {item.data_ai_relevance_score}/100</span>}</div><h3>{item.title}</h3><div className="opportunityCompany"><strong>{item.organisation||'Organisation'}</strong>{item.location&&<span>· {item.location}</span>}</div>{item.summary&&<p>{short(item.summary)}</p>}<div className="metaRow">{item.work_arrangement&&item.work_arrangement!=='unknown'&&<span className="metaPill">{item.work_arrangement==='onsite'?'On-site':item.work_arrangement[0].toUpperCase()+item.work_arrangement.slice(1)}</span>}{item.applicant_scope&&item.applicant_scope!=='unknown'&&<span className="metaPill">{scopeLabels[item.applicant_scope]||item.applicant_scope}</span>}{item.sponsorship_status&&<span className="metaPill">{sponsorshipLabels[item.sponsorship_status]||item.sponsorship_status}</span>}{item.closes_at&&<span className="metaPill">Closes {new Date(item.closes_at).toLocaleDateString('en-GB')}</span>}{item.source_organisation&&<span className="metaPill">Source: {item.source_organisation}</span>}</div></div>
      <div className="opportunityCardAction">{item.published_at&&<small>Added {new Date(item.published_at).toLocaleDateString('en-GB')}</small>}{apply?<a className="button dark" href={apply} target="_blank" rel="noopener noreferrer">Apply / view role →</a>:<span className="chip">Source unavailable</span>}</div>
    </article>})}</div>:<div className="panel emptyState"><h3>No matching opportunities.</h3><p>Try a broader search or clear one of the filters.</p>{hasFilters&&<button className="button ghost" type="button" onClick={clearFilters}>Clear filters</button>}</div>}
    {totalPages>1&&<nav className="opportunityPagination" aria-label="Opportunity pages"><button className="button ghost" type="button" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1}>← Previous</button><span>Page {safePage} of {totalPages}</span><button className="button ghost" type="button" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages}>Next →</button></nav>}
  </div>;
}
