'use client';

import Link from 'next/link';
import {useMemo,useState} from 'react';
import SaveOpportunityButton from './SaveOpportunityButton';

type Opportunity={id:string;title:string;organisation:string|null;opportunity_type:string;summary:string|null;location:string|null;eligibility:string|null;source_url:string|null;official_application_url:string|null;closes_at:string|null;published_at:string|null;data_ai_relevance_score:number|null;remote_scope:string|null;source_organisation:string|null;country_code:string|null;region_code:string|null;applicant_scope:string;work_arrangement:string|null;sponsorship_status:string};
type QuickFilter='remote'|'international'|'graduate'|'internship'|'sponsorship';

const PAGE_SIZE=8;
const countryLabels:Record<string,string>={GB:'United Kingdom',NG:'Nigeria',IN:'India',US:'United States',CA:'Canada',AU:'Australia',DE:'Germany',FR:'France',NL:'Netherlands',ES:'Spain',IE:'Ireland',IT:'Italy',PL:'Poland',SK:'Slovakia',HU:'Hungary',RO:'Romania',RS:'Serbia',GLOBAL:'Remote / Global'};
const regionLabels:Record<string,string>={UK:'United Kingdom',EUROPE:'Europe',AFRICA:'Africa',ASIA:'Asia',NORTH_AMERICA:'North America',OCEANIA:'Oceania',GLOBAL:'Remote / Global'};
const sponsorshipLabels:Record<string,string>={confirmed:'Sponsorship confirmed',licensed_sponsor:'Licensed sponsor',not_offered:'No sponsorship',not_stated:'Sponsorship not stated',unclear:'Sponsorship unclear',unknown:'Sponsorship unknown'};
const scopeLabels:Record<string,string>={worldwide:'Worldwide applicants',international_accepted:'International applicants',country_restricted:'Country restricted',remote_worldwide:'Remote worldwide',unknown:'Eligibility unknown'};
const quickFilters:Array<[QuickFilter,string]>=[['remote','Remote'],['international','International'],['graduate','Graduate'],['internship','Internship'],['sponsorship','Sponsorship']];

function cleanText(value:string|null){if(!value)return '';let text=value;for(let i=0;i<2;i++)text=text.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');return text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()}
function short(value:string|null,max=230){const text=cleanText(value);return text.length>max?`${text.slice(0,max).trim()}…`:text}
function workLabel(value:string|null){if(!value||value==='unknown')return null;if(value==='onsite')return'On-site';return value[0].toUpperCase()+value.slice(1)}
function initials(name:string|null){return(name||'Mettelo').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}
function freshness(value:string|null){if(!value)return null;const days=Math.floor((Date.now()-new Date(value).getTime())/86400000);if(days<=0)return'Added today';if(days===1)return'Added yesterday';if(days<7)return`Added ${days} days ago`;return`Added ${new Date(value).toLocaleDateString('en-GB')}`}

export default function OpportunityBoard({items}:{items:Opportunity[]}){
  const [query,setQuery]=useState('');
  const [type,setType]=useState('all');
  const [country,setCountry]=useState('all');
  const [region,setRegion]=useState('all');
  const [arrangement,setArrangement]=useState('all');
  const [sponsorship,setSponsorship]=useState('all');
  const [scope,setScope]=useState('all');
  const [sort,setSort]=useState('newest');
  const [quick,setQuick]=useState<QuickFilter[]>([]);
  const [page,setPage]=useState(1);

  const countries=useMemo(()=>Array.from(new Set(items.map(item=>item.country_code).filter(Boolean) as string[])).sort((a,b)=>(countryLabels[a]||a).localeCompare(countryLabels[b]||b)),[items]);
  const regions=useMemo(()=>Array.from(new Set(items.map(item=>item.region_code).filter(Boolean) as string[])).sort((a,b)=>(regionLabels[a]||a).localeCompare(regionLabels[b]||b)),[items]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    const rows=items.filter(item=>{
      const hay=[item.title,item.organisation,item.location,item.summary,item.country_code?countryLabels[item.country_code]:null,item.region_code?regionLabels[item.region_code]:null].filter(Boolean).join(' ').toLowerCase();
      const quickMatch=quick.every(filter=>{
        if(filter==='remote')return Boolean(item.remote_scope||item.work_arrangement==='remote');
        if(filter==='international')return ['worldwide','international_accepted','remote_worldwide'].includes(item.applicant_scope);
        if(filter==='graduate')return item.opportunity_type==='graduate';
        if(filter==='internship')return item.opportunity_type==='internship';
        return ['confirmed','licensed_sponsor'].includes(item.sponsorship_status);
      });
      return (!q||hay.includes(q))&&quickMatch&&(type==='all'||item.opportunity_type===type)&&(country==='all'||item.country_code===country)&&(region==='all'||item.region_code===region)&&(arrangement==='all'||(arrangement==='remote'?Boolean(item.remote_scope||item.work_arrangement==='remote'):item.work_arrangement===arrangement))&&(sponsorship==='all'||item.sponsorship_status===sponsorship)&&(scope==='all'||(scope==='international'?['worldwide','international_accepted','remote_worldwide'].includes(item.applicant_scope):item.applicant_scope===scope));
    });
    rows.sort((a,b)=>sort==='oldest'?new Date(a.published_at||0).getTime()-new Date(b.published_at||0).getTime():new Date(b.published_at||0).getTime()-new Date(a.published_at||0).getTime());
    return rows;
  },[items,query,type,country,region,arrangement,sponsorship,scope,sort,quick]);

  const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const safePage=Math.min(page,totalPages);
  const visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
  const hasFilters=Boolean(query||quick.length||type!=='all'||country!=='all'||region!=='all'||arrangement!=='all'||sponsorship!=='all'||scope!=='all');
  function resetPage(){setPage(1)}
  function toggleQuick(filter:QuickFilter){setQuick(current=>current.includes(filter)?current.filter(item=>item!==filter):[...current,filter]);resetPage()}
  function goPage(next:number){const target=Math.max(1,Math.min(totalPages,next));if(target===safePage)return;setPage(target);requestAnimationFrame(()=>document.querySelector('.opportunityResultsBar')?.scrollIntoView({behavior:'smooth',block:'start'}))}
  function clearFilters(){setQuery('');setType('all');setCountry('all');setRegion('all');setArrangement('all');setSponsorship('all');setScope('all');setSort('newest');setQuick([]);setPage(1)}

  const quickFilterButtons=quickFilters.map(([value,label])=><button key={value} type="button" className={quick.includes(value)?'isActive':''} aria-pressed={quick.includes(value)} onClick={()=>toggleQuick(value)}>{label}</button>);

  return <div className="opportunityBoard">
    <section className="opportunitySearchPanel" aria-labelledby="opportunity-search-label">
      <div className="opportunitySearchMain">
        <label id="opportunity-search-label" htmlFor="opportunity-search">Search opportunities</label>
        <div className="opportunitySearchField"><span aria-hidden="true">⌕</span><input id="opportunity-search" value={query} onChange={event=>{setQuery(event.target.value);resetPage()}} placeholder="Role, company, skill or location" autoComplete="off"/></div>
      </div>

      <div className="opportunityQuickFilters opportunityQuickFiltersDesktop" aria-label="Quick filters">
        {quickFilterButtons}
      </div>

      <details className="opportunityQuickFilterDisclosure">
        <summary><span>Quick filters{quick.length?` (${quick.length})`:''}</span><span className="opportunityQuickFilterHint">Remote, international, graduate and more</span></summary>
        <div className="opportunityQuickFilters opportunityQuickFiltersMobile" aria-label="Quick filters">
          {quickFilterButtons}
        </div>
      </details>

      <details className="opportunityAdvancedFilters">
        <summary><span>Filters</span><span className="opportunityFilterSummary">Country, type, work style, eligibility, sponsorship</span></summary>
        <div className="opportunityToolbar">
          <div><label htmlFor="opportunity-type">Type</label><select id="opportunity-type" value={type} onChange={event=>{setType(event.target.value);resetPage()}}><option value="all">All types</option><option value="job">Jobs</option><option value="internship">Internships</option><option value="graduate">Graduate</option><option value="apprenticeship">Apprenticeships</option><option value="volunteer">Volunteer</option><option value="fellowship">Fellowships</option></select></div>
          <div><label htmlFor="opportunity-country">Country</label><select id="opportunity-country" value={country} onChange={event=>{setCountry(event.target.value);resetPage()}}><option value="all">All countries</option>{countries.map(code=><option key={code} value={code}>{countryLabels[code]||code}</option>)}</select></div>
          <div><label htmlFor="opportunity-region">Region</label><select id="opportunity-region" value={region} onChange={event=>{setRegion(event.target.value);resetPage()}}><option value="all">All regions</option>{regions.map(code=><option key={code} value={code}>{regionLabels[code]||code}</option>)}</select></div>
          <div><label htmlFor="opportunity-arrangement">Work style</label><select id="opportunity-arrangement" value={arrangement} onChange={event=>{setArrangement(event.target.value);resetPage()}}><option value="all">Any</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option></select></div>
          <div><label htmlFor="opportunity-sponsorship">Sponsorship</label><select id="opportunity-sponsorship" value={sponsorship} onChange={event=>{setSponsorship(event.target.value);resetPage()}}><option value="all">Any</option><option value="confirmed">Confirmed</option><option value="licensed_sponsor">Licensed sponsor</option><option value="not_stated">Not stated</option><option value="not_offered">Not offered</option></select></div>
          <div><label htmlFor="opportunity-scope">Applicants</label><select id="opportunity-scope" value={scope} onChange={event=>{setScope(event.target.value);resetPage()}}><option value="all">Any</option><option value="international">International / worldwide</option><option value="country_restricted">Country restricted</option><option value="unknown">Unknown</option></select></div>
          <div><label htmlFor="opportunity-sort">Sort</label><select id="opportunity-sort" value={sort} onChange={event=>setSort(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
        </div>
      </details>
    </section>

    <div className="opportunityResultsBar" aria-live="polite"><div><strong>{filtered.length} opportunit{filtered.length===1?'y':'ies'} found</strong><span>Showing {filtered.length?((safePage-1)*PAGE_SIZE)+1:0}–{Math.min(safePage*PAGE_SIZE,filtered.length)} of {filtered.length}</span></div>{hasFilters&&<button className="opportunityClearFilters" type="button" onClick={clearFilters}>Clear all filters</button>}</div>

    {visible.length?<div className="opportunityList">{visible.map(item=>{
      const location=item.country_code?countryLabels[item.country_code]||item.country_code:item.region_code?regionLabels[item.region_code]||item.region_code:item.location;
      const work=workLabel(item.work_arrangement);
      const applicant=item.applicant_scope!=='unknown'?(scopeLabels[item.applicant_scope]||item.applicant_scope):null;
      const sponsor=item.sponsorship_status?(sponsorshipLabels[item.sponsorship_status]||item.sponsorship_status):null;
      const sponsorPositive=['confirmed','licensed_sponsor'].includes(item.sponsorship_status);
      return <article className="opportunityCard opportunityCardV3" key={item.id}>
        <div className="opportunityIdentity"><div className="opportunityLogo" aria-hidden="true">{initials(item.organisation)}</div><div><span className="opportunityType">{item.opportunity_type.replaceAll('_',' ').toUpperCase()}</span><h3><Link href={`/opportunities/${item.id}`}>{item.title}</Link></h3><p className="opportunityCompany"><strong>{item.organisation||'Organisation'}</strong>{location&&<span>{location}</span>}{work&&<span>{work}</span>}</p></div></div>
        <div className="opportunityDecisionContext">
          <div className="opportunitySignalRow" aria-label="Opportunity context">{applicant&&<span>{applicant}</span>}{sponsor&&<span className={sponsorPositive?'positive':''}>{sponsorPositive?'✓ ':''}{sponsor}</span>}{item.closes_at&&<span>Closes {new Date(item.closes_at).toLocaleDateString('en-GB')}</span>}</div>
          {item.summary&&<p className="opportunitySummary">{short(item.summary)}</p>}
        </div>
        <footer className="opportunityCardFoot"><small>{freshness(item.published_at)}</small><div className="opportunityActions"><SaveOpportunityButton opportunityId={item.id} compact/><Link className="button dark" href={`/opportunities/${item.id}`}>View opportunity →</Link></div></footer>
      </article>})}</div>:<div className="panel emptyState"><h3>No opportunities match that search.</h3><p>Try removing a filter or broadening your search terms.</p>{hasFilters&&<button className="button ghost" type="button" onClick={clearFilters}>Clear filters</button>}</div>}

    {totalPages>1&&<nav className="opportunityPagination" aria-label="Opportunity result pages"><button className="button ghost" type="button" onClick={()=>goPage(safePage-1)} disabled={safePage===1}>← Previous</button><span>Page {safePage} of {totalPages}</span><button className="button ghost" type="button" onClick={()=>goPage(safePage+1)} disabled={safePage===totalPages}>Next →</button></nav>}
  </div>;
}
