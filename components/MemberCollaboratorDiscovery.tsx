'use client';

import Image from 'next/image';
import Link from 'next/link';
import {FormEvent,useEffect,useMemo,useState} from 'react';

type Need={id:string;responsibility:string|null;member_message:string|null;weekly_commitment:string|null};
type Member={username:string;full_name:string|null;headline:string|null;current_job_title:string|null;professional_area:string|null;experience_level:string|null;project_availability:string|null;weekly_capacity:string|null;skills:string[];preferred_roles:string[];avatar_url:string|null;invitation_state?:'pending'|null;match_label?:string|null;match_detail?:string|null;match_skills?:string[]};
type Props={projectId?:string;projectRunId?:string;initialNeedId?:string;projectTitle?:string};

function paramsForProfile(username:string,props:Props){
 const params=new URLSearchParams();
 if(props.projectId&&props.projectRunId){params.set('project_id',props.projectId);params.set('project_run_id',props.projectRunId)}
 if(props.initialNeedId)params.set('collaboration_need',props.initialNeedId);
 const suffix=params.toString();
 return `/member/collaboration/people/${encodeURIComponent(username)}${suffix?`?${suffix}`:''}`;
}

function human(value:string|null|undefined){
 const text=String(value||'').trim();
 if(!text)return'';
 return text.replace(/[_-]+/g,' ').replace(/\s+/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
}

function initials(member:Member){
 return String(member.full_name||member.username||'M').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
}

export default function MemberCollaboratorDiscovery(props:Props){
 const{projectId,projectRunId,initialNeedId,projectTitle}=props;
 const hasProjectContext=Boolean(projectId&&projectRunId);
 const[needs,setNeeds]=useState<Need[]>([]);
 const[needId,setNeedId]=useState(initialNeedId||'');
 const[query,setQuery]=useState('');
 const[recommended,setRecommended]=useState<Member[]>([]);
 const[results,setResults]=useState<Member[]>([]);
 const[status,setStatus]=useState('');
 const[error,setError]=useState('');
 const[working,setWorking]=useState('');
 const[searched,setSearched]=useState(false);
 const[searchedQuery,setSearchedQuery]=useState('');
 const[role,setRole]=useState('');
 const[capability,setCapability]=useState('');
 const[domain,setDomain]=useState('');
 const[availability,setAvailability]=useState('');
 const[commitment,setCommitment]=useState('');

 const activeFilterCount=useMemo(()=>[role,capability,domain,availability,commitment].filter(value=>value.trim()).length,[role,capability,domain,availability,commitment]);

 async function discover(value:string,mode:'recommend'|'search',selectedNeed=needId){
  const term=value.trim();
  if(mode==='search'&&term.length<2)return;
  if(mode==='search'){setWorking('search');setSearched(true);setSearchedQuery(term)}else setWorking('recommend');
  setStatus('');setError('');
  try{
   const qs=new URLSearchParams({limit:mode==='recommend'?'9':'20'});
   if(mode==='recommend')qs.set('mode','recommend');else qs.set('q',term);
   if(projectId&&projectRunId){qs.set('project_id',projectId);qs.set('project_run_id',projectRunId)}
   if(selectedNeed)qs.set('collaboration_need',selectedNeed);
   if(mode==='search'){
    if(role.trim())qs.set('role',role.trim());if(capability.trim())qs.set('capability',capability.trim());if(domain.trim())qs.set('domain',domain.trim());if(availability.trim())qs.set('availability',availability.trim());if(commitment.trim())qs.set('commitment',commitment.trim());
   }
   const response=await fetch(`/api/member-discovery?${qs.toString()}`,{cache:'no-store'});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'We could not load the Collaboration Network.');
   const items=(body.items||[]) as Member[];
   if(mode==='recommend')setRecommended(items);else setResults(items);
  }catch(err){
   if(mode==='recommend')setRecommended([]);else setResults([]);
   setError(err instanceof Error?err.message:'We could not load the Collaboration Network.');
  }finally{setWorking('')}
 }

 useEffect(()=>{
  let active=true;
  if(!hasProjectContext||!projectId||!projectRunId){
   void discover('','recommend','');
   return()=>{active=false};
  }
  const qs=new URLSearchParams({project_id:projectId,project_run_id:projectRunId});
  void fetch(`/api/collaboration-needs?${qs.toString()}`,{cache:'no-store'}).then(async response=>{
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Unable to load project collaboration context.');
   if(!active)return;
   const rows=(body.items||[]) as Need[];setNeeds(rows);
   const selected=rows.find(item=>item.id===initialNeedId)||rows[0]||null;const selectedId=selected?.id||'';setNeedId(selectedId);
   void discover('','recommend',selectedId);
  }).catch(()=>{if(active)void discover('','recommend',initialNeedId||'')});
  return()=>{active=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[hasProjectContext,projectId,projectRunId,initialNeedId]);

 async function submitSearch(event:FormEvent){
  event.preventDefault();
  if(query.trim().length<2){setError('Enter at least 2 characters to search the network.');return}
  await discover(query,'search');
 }

 async function block(username:string){
  if(!window.confirm(`Block @${username}? You will no longer see each other in collaboration discovery or be able to exchange project invitations.`))return;
  setWorking(`block:${username}`);setStatus('');setError('');
  try{
   const response=await fetch('/api/member-blocks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Unable to block this member.');
   setRecommended(current=>current.filter(item=>item.username!==username));setResults(current=>current.filter(item=>item.username!==username));
   setStatus(`@${username} is blocked and has been removed from collaboration discovery.`);
  }catch(err){setError(err instanceof Error?err.message:'Unable to block this member.')}finally{setWorking('')}
 }

 async function invite(username:string){
  if(!projectId||!projectRunId){setError('Open Collaboration Network from an active project before sending a team request.');return}
  setWorking(username);setStatus('');setError('');
  try{
   const response=await fetch('/api/member-collaboration-invitations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,collaboration_need_id:needId||null,username})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Unable to send team request.');
   setStatus(`Team request sent to @${username}. Membership has not been created; the invitee must review and accept the request before the governed joining journey continues.`);
  }catch(err){setError(err instanceof Error?err.message:'Unable to send team request.')}finally{setWorking('')}
 }

 function clearFilters(){setRole('');setCapability('');setDomain('');setAvailability('');setCommitment('')}
 function updateQuery(value:string){setQuery(value);if(!value.trim()){setSearched(false);setSearchedQuery('');setResults([]);setError('');setStatus('')}}

 function card(member:Member,recommendedCard=false){
  const available=human(member.project_availability);
  const capacity=human(member.weekly_capacity);
  const roleLabel=human(member.current_job_title||(member.preferred_roles||[])[0]||member.professional_area)||'Mettelo member';
  const professionalArea=human(member.professional_area)||'Not specified';
  const experience=human(member.experience_level)||'Not specified';
  const summary=member.headline?.trim()||`${roleLabel} open to relevant project collaboration opportunities on Mettelo.`;
  const skills=(member.skills||[]).filter(Boolean).slice(0,4);
  const profileHref=paramsForProfile(member.username,{...props,initialNeedId:needId||initialNeedId});

  return <article className="mcdCard" key={member.username}>
   <div className="mcdCardAccent" aria-hidden="true"/>
   <div className="mcdCardBody">
    <div className="mcdIdentity">
     <div className="mcdAvatar" aria-hidden="true">
      {member.avatar_url?<Image src={member.avatar_url} alt="" width={56} height={56} unoptimized/>:<span>{initials(member)}</span>}
      {available&&<i className="mcdAvailabilityDot"/>}
     </div>
     <div className="mcdIdentityCopy">
      <h3>{member.full_name||member.username}</h3>
      <p className="mcdUsername">@{member.username}</p>
      <p className="mcdRole">{roleLabel}</p>
     </div>
    </div>

    <div className="mcdBadges">
     {recommendedCard&&<span className="mcdBadge match">Relevant experience</span>}
     {available&&<span className="mcdBadge available">{available}</span>}
     {capacity&&<span className="mcdBadge capacity">{capacity}</span>}
    </div>

    <p className="mcdSummary">{summary}</p>

    <div className="mcdMiniLabel">Relevant capabilities</div>
    {skills.length?<div className="mcdSkills">{skills.map(skill=><span key={skill}>{human(skill)}</span>)}</div>:<p className="mcdNoSkills">Capabilities not specified</p>}

    <div className="mcdMeta">
     <div><span>Professional area</span><strong>{professionalArea}</strong></div>
     <div><span>Experience</span><strong>{experience}</strong></div>
    </div>
   </div>

   <div className="mcdActions">
    <Link className="mcdSecondaryAction" href={profileHref}>View profile</Link>
    {hasProjectContext&&<button className="mcdPrimaryAction" type="button" onClick={()=>void invite(member.username)} disabled={Boolean(working)}>{working===member.username?'Sending…':'Send team request'}</button>}
   </div>

   <div className="mcdCardFooter">
    <span>Discoverable profile</span>
    <button className="mcdBlock" type="button" onClick={()=>void block(member.username)} disabled={Boolean(working)}>{working===`block:${member.username}`?'Blocking…':'Block member'}</button>
   </div>
  </article>;
 }

 return <div className="mcdRoot">
  <section className="mcdSection" aria-labelledby="recommended-collaborators-title">
   <div className="mcdSectionHead">
    <div>
     <span>RECOMMENDED COLLABORATORS</span>
     <h2 id="recommended-collaborators-title">{hasProjectContext?'People who may fit this project':'Recommended collaborators'}</h2>
     <p>{hasProjectContext?'Recommendations use discoverable skills, professional focus and availability relevant to your current project.':'Open Collaboration Network from an active project to see project-specific collaborator recommendations.'}</p>
    </div>
    {hasProjectContext&&working==='recommend'&&<span className="mcdLoading" role="status">Loading…</span>}
   </div>

   {hasProjectContext&&recommended.length>0?<div className="mcdGrid">{recommended.map(member=>card(member,true))}</div>:hasProjectContext&&working!=='recommend'?<div className="mcdEmpty"><strong>No visible recommendations yet</strong><p>Search the network below to find a collaborator by name, role, capability or domain.</p></div>:!hasProjectContext?<div className="mcdContextHint"><div className="mcdHintIcon" aria-hidden="true">+</div><div><strong>Looking for someone for a project?</strong><p>Use Team → Grow the Team → Find people on Mettelo. Your project context will be carried here securely so you can send governed team requests.</p></div></div>:null}
  </section>

  <section className="mcdSearch" aria-labelledby="search-network-title">
   <div className="mcdSearchHead">
    <div>
     <span>SEARCH THE NETWORK</span>
     <h2 id="search-network-title">Find another collaborator</h2>
     <p>Search discoverable members by name, @username, role, capability or domain. Private profile information is never included.</p>
    </div>
    <Link className="mcdBlockedLink" href="/member/blocked-members">Manage blocked members</Link>
   </div>

   {hasProjectContext&&needs.length>0&&<label className="mcdNeed">Request context<select value={needId} onChange={event=>{const next=event.target.value;setNeedId(next);const item=needs.find(value=>value.id===next);const seed=item?.responsibility||item?.member_message||projectTitle||'';if(seed.trim().length>=2)void discover(seed,'recommend')}}><option value="">Direct team request</option>{needs.map(item=><option value={item.id} key={item.id}>{item.responsibility||item.member_message||item.weekly_commitment||'Active collaboration need'}</option>)}</select></label>}

   <form onSubmit={submitSearch}>
    <label className="mcdSearchLabel" htmlFor="collaboration-member-search">Search by name, @username, role, capability or domain</label>
    <div className="mcdSearchRow">
     <div className="mcdSearchInputWrap">
      <span aria-hidden="true">⌕</span>
      <input id="collaboration-member-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search people, roles, capabilities or domains"/>
     </div>
     <button className="mcdSearchButton" type="submit" disabled={working==='search'}>{working==='search'?'Searching…':'Search network'}</button>
    </div>

    <details className="mcdFilterPanel">
     <summary>Filters{activeFilterCount>0?<b>{activeFilterCount}</b>:null}</summary>
     <div className="mcdFilters">
      <label>Role<input value={role} onChange={event=>setRole(event.target.value)} placeholder="Any role"/></label>
      <label>Capability<input value={capability} onChange={event=>setCapability(event.target.value)} placeholder="Any capability"/></label>
      <label>Domain<input value={domain} onChange={event=>setDomain(event.target.value)} placeholder="Any domain"/></label>
      <label>Availability<input value={availability} onChange={event=>setAvailability(event.target.value)} placeholder="Any availability"/></label>
      <label>Commitment<input value={commitment} onChange={event=>setCommitment(event.target.value)} placeholder="Any commitment"/></label>
      {activeFilterCount>0&&<button type="button" className="mcdClearFilters" onClick={clearFilters}>Clear filters</button>}
     </div>
    </details>
   </form>

   <p className="mcdPrivacyNote">Inviting someone does not add them to your team. A request stays pending until they accept and the governed joining checks continue.</p>

   {error&&<div className="mcdError" role="alert"><strong>We couldn’t load the Collaboration Network.</strong><span>{error}</span></div>}
   <div className="mcdStatus" role="status" aria-live="polite">{status}</div>

   {searched&&(results.length?<div className="mcdResults"><div className="mcdResultsMeta"><span>{results.length} visible match{results.length===1?'':'es'}</span><span>Discoverable members only</span></div><div className="mcdGrid" aria-label="Search results">{results.map(member=>card(member,false))}</div></div>:working!=='search'&&!error?<div className="mcdEmpty"><strong>No visible matches yet</strong><p>Try another search or adjust your filters.</p></div>:null)}
  </section>

  <style jsx>{`
   .mcdRoot{display:grid;gap:38px;min-width:0}
   .mcdSection{display:grid;gap:18px;min-width:0}
   .mcdSectionHead,.mcdSearchHead{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}
   .mcdSectionHead>div,.mcdSearchHead>div{min-width:0}
   .mcdSectionHead>div>span,.mcdSearchHead>div>span{font:800 .67rem/1.2 var(--font-mono);letter-spacing:.11em;color:var(--bronze-deep)}
   .mcdSectionHead h2,.mcdSearchHead h2{margin:6px 0 5px;font-size:clamp(1.45rem,2.4vw,1.8rem)}
   .mcdSectionHead p,.mcdSearchHead p{max-width:680px;margin:0;color:var(--slate);font-size:.84rem;line-height:1.55}
   .mcdLoading{font-size:.75rem;color:var(--slate)}
   .mcdGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
   .mcdCard{position:relative;display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:var(--white);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
   .mcdCard:hover{transform:translateY(-2px);border-color:#d9cfbe;box-shadow:var(--shadow-sm)}
   .mcdCardAccent{height:4px;background:linear-gradient(90deg,var(--bronze),var(--bronze-2) 45%,var(--indigo) 100%)}
   .mcdCardBody{display:flex;flex:1;flex-direction:column;padding:20px}
   .mcdIdentity{display:flex;align-items:center;gap:13px;min-width:0}
   .mcdAvatar{position:relative;width:56px;height:56px;border-radius:50%;overflow:visible;display:grid;place-items:center;flex:0 0 auto;background:linear-gradient(145deg,var(--indigo),var(--ink));color:#fff;font-weight:850}
   .mcdAvatar :global(img){width:56px;height:56px;border-radius:50%;object-fit:cover}
   .mcdAvailabilityDot{position:absolute;right:0;bottom:2px;width:13px;height:13px;border:3px solid #fff;border-radius:50%;background:var(--green)}
   .mcdIdentityCopy{min-width:0}
   .mcdIdentity h3{margin:0;overflow:hidden;text-overflow:ellipsis;font-size:1.05rem;white-space:nowrap}
   .mcdUsername{margin:3px 0 0;color:var(--slate);font-size:.72rem;overflow-wrap:anywhere}
   .mcdRole{margin:2px 0 0;color:var(--ink);font-size:.72rem;font-weight:800}
   .mcdBadges{display:flex;gap:6px;flex-wrap:wrap;margin-top:16px}
   .mcdBadge{display:inline-flex;align-items:center;min-height:27px;padding:5px 9px;border-radius:999px;font-size:.65rem;font-weight:800}
   .mcdBadge.match{background:#eaf6ef;color:var(--green)}
   .mcdBadge.available{background:#edf3fc;color:var(--blue)}
   .mcdBadge.capacity{background:var(--sand);color:var(--bronze-deep)}
   .mcdSummary{min-height:62px;margin:15px 0 0;color:var(--slate);font-size:.78rem;line-height:1.55}
   .mcdMiniLabel{margin-top:17px;color:var(--muted);font:800 .58rem/1.2 var(--font-mono);letter-spacing:.1em;text-transform:uppercase}
   .mcdSkills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
   .mcdSkills span{padding:6px 9px;border:1px solid #e5e6e9;border-radius:8px;background:#f8f8f7;color:#424a59;font-size:.67rem;font-weight:700}
   .mcdNoSkills{margin:8px 0 0;color:var(--muted);font-size:.72rem}
   .mcdMeta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:18px}
   .mcdMeta div{padding:10px 11px;border-radius:11px;background:#f7f7f5}
   .mcdMeta span{display:block;color:var(--muted);font-size:.58rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
   .mcdMeta strong{display:block;margin-top:3px;font-size:.7rem;overflow-wrap:anywhere}
   .mcdActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 20px 18px}
   .mcdSecondaryAction,.mcdPrimaryAction{display:flex;align-items:center;justify-content:center;min-height:44px;padding:9px 12px;border-radius:12px;font:800 .72rem/1.2 inherit;text-align:center;cursor:pointer}
   .mcdSecondaryAction{border:1px solid #d5d7dc;background:var(--white);color:var(--ink)}
   .mcdPrimaryAction{border:1px solid var(--ink);background:var(--ink);color:#fff}
   .mcdPrimaryAction:disabled{opacity:.58;cursor:not-allowed}
   .mcdActions:has(.mcdSecondaryAction:only-child){grid-template-columns:1fr}
   .mcdCardFooter{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:42px;padding:10px 20px;border-top:1px solid #f0eee9;background:#fcfcfa}
   .mcdCardFooter>span{color:var(--muted);font-size:.62rem}
   .mcdBlock{min-height:32px;border:0;background:transparent;color:var(--muted);font:700 .64rem/1.2 inherit;cursor:pointer}
   .mcdBlock:hover{color:var(--red)}
   .mcdBlock:disabled{opacity:.5;cursor:not-allowed}
   .mcdEmpty,.mcdContextHint{grid-column:1/-1;border:1px solid var(--line);border-radius:18px;background:var(--white);padding:19px 20px}
   .mcdEmpty p,.mcdContextHint p{margin:5px 0 0;color:var(--slate);font-size:.8rem;line-height:1.55}
   .mcdContextHint{display:flex;align-items:flex-start;gap:13px}
   .mcdHintIcon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;background:var(--sand);color:var(--bronze-deep);font-weight:900}
   .mcdSearch{display:grid;gap:15px;min-width:0;padding:22px;border:1px solid var(--line);border-radius:22px;background:var(--white);box-shadow:0 4px 14px rgba(16,19,29,.025)}
   .mcdBlockedLink{flex:0 0 auto;color:var(--slate);font-size:.72rem;font-weight:800}
   .mcdBlockedLink:hover{color:var(--ink)}
   .mcdNeed{display:grid;gap:6px;max-width:520px;font-size:.72rem;font-weight:800}
   .mcdNeed select{min-height:44px;padding:9px 11px;border:1px solid #d9d3c9;border-radius:11px;background:var(--paper);color:var(--ink)}
   .mcdSearchLabel{display:block;margin-bottom:7px;font-size:.72rem;font-weight:800}
   .mcdSearchRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}
   .mcdSearchInputWrap{position:relative;min-width:0}
   .mcdSearchInputWrap>span{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--muted);font-size:1.05rem}
   .mcdSearchInputWrap input{width:100%;min-height:50px;padding:12px 15px 12px 43px;border:1px solid #d9d3c9;border-radius:13px;background:var(--paper);color:var(--ink);outline:none}
   .mcdSearchInputWrap input:focus{border-color:var(--bronze);box-shadow:0 0 0 3px rgba(198,137,42,.12)}
   .mcdSearchButton{min-height:50px;padding:0 22px;border:1px solid var(--ink);border-radius:13px;background:var(--ink);color:#fff;font-weight:800;cursor:pointer}
   .mcdSearchButton:disabled{opacity:.58;cursor:not-allowed}
   .mcdFilterPanel{margin-top:11px}
   .mcdFilterPanel summary{display:flex;align-items:center;gap:7px;min-height:44px;width:max-content;cursor:pointer;color:var(--ink);font-size:.76rem;font-weight:850}
   .mcdFilterPanel summary b{display:grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--ink);color:#fff;font-size:.6rem}
   .mcdFilters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;padding-top:9px}
   .mcdFilters label{display:grid;gap:5px;font-size:.68rem;font-weight:750}
   .mcdFilters input{width:100%;min-width:0;min-height:42px;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}
   .mcdClearFilters{align-self:end;min-height:42px;padding:8px 11px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--slate);font-weight:750;cursor:pointer}
   .mcdPrivacyNote{margin:0;padding-top:2px;color:var(--muted);font-size:.7rem}
   .mcdStatus{min-height:18px;color:var(--slate);font-size:.72rem}
   .mcdError{display:grid;gap:4px;padding:12px;border:1px solid #e0b7b7;border-radius:11px;background:#fff6f6}
   .mcdError span{color:var(--slate);font-size:.75rem}
   .mcdResults{display:grid;gap:12px}
   .mcdResultsMeta{display:flex;justify-content:space-between;gap:14px;color:var(--slate);font-size:.7rem}
   @media(max-width:1080px){.mcdGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.mcdFilters{grid-template-columns:repeat(2,minmax(0,1fr))}}
   @media(max-width:640px){.mcdRoot{gap:30px}.mcdSectionHead,.mcdSearchHead{display:grid;align-items:start}.mcdGrid,.mcdSearchRow,.mcdFilters{grid-template-columns:1fr}.mcdSearch{padding:16px}.mcdBlockedLink{width:max-content}.mcdActions{grid-template-columns:1fr}.mcdSearchButton{width:100%}.mcdResultsMeta{display:grid}.mcdSummary{min-height:0}}
   @media(max-width:390px){.mcdCardBody{padding:16px}.mcdActions{padding:0 16px 16px}.mcdCardFooter{padding:9px 16px}.mcdMeta{grid-template-columns:1fr}.mcdIdentity{align-items:flex-start}.mcdContextHint{padding:16px}}
   @media(max-width:360px){.mcdSearch{padding:14px}.mcdCard{border-radius:17px}}
  `}</style>
 </div>;
}
