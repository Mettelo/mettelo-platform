'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';

type Need={id:string;responsibility:string|null;member_message:string|null;weekly_commitment:string|null};
type Member={username:string;full_name:string|null;headline:string|null;current_job_title:string|null;professional_area:string|null;experience_level:string|null;project_availability:string|null;weekly_capacity:string|null;skills:string[];preferred_roles:string[];avatar_url:string|null};
type Props={projectId?:string;projectRunId?:string;initialNeedId?:string;projectTitle?:string};

function paramsForProfile(username:string,props:Props){
 const params=new URLSearchParams();
 if(props.projectId&&props.projectRunId){params.set('project_id',props.projectId);params.set('project_run_id',props.projectRunId)}
 if(props.initialNeedId)params.set('collaboration_need',props.initialNeedId);
 const suffix=params.toString();
 return `/member/collaboration/people/${encodeURIComponent(username)}${suffix?`?${suffix}`:''}`;
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
 const[role,setRole]=useState('');
 const[capability,setCapability]=useState('');
 const[domain,setDomain]=useState('');
 const[availability,setAvailability]=useState('');
 const[commitment,setCommitment]=useState('');

 async function discover(value:string,mode:'recommend'|'search'){
  const term=value.trim();if(term.length<2)return;
  if(mode==='search'){setWorking('search');setSearched(true)}else setWorking('recommend');
  setStatus('');setError('');
  try{
   const qs=new URLSearchParams({q:term,limit:'20'});
   if(mode==='search'){
    if(role.trim())qs.set('role',role.trim());if(capability.trim())qs.set('capability',capability.trim());if(domain.trim())qs.set('domain',domain.trim());if(availability.trim())qs.set('availability',availability.trim());if(commitment.trim())qs.set('commitment',commitment.trim());
   }
   const response=await fetch(`/api/member-discovery?${qs.toString()}`,{cache:'no-store'});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'We could not load the Collaboration Network.');
   const items=(body.items||[]) as Member[];
   if(mode==='recommend'){setRecommended(items);setStatus(items.length?`${items.length} recommended collaborator${items.length===1?'':'s'} available.`:'No project-specific recommendations are visible right now.')}
   else{setResults(items);setStatus(`${items.length} visible match${items.length===1?'':'es'} found.`)}
  }catch(err){
   if(mode==='recommend')setRecommended([]);else setResults([]);
   setError(err instanceof Error?err.message:'We could not load the Collaboration Network.');
  }finally{setWorking('')}
 }

 useEffect(()=>{
  if(!hasProjectContext||!projectId||!projectRunId||!projectTitle)return;
  let active=true;
  const qs=new URLSearchParams({project_id:projectId,project_run_id:projectRunId});
  void fetch(`/api/collaboration-needs?${qs.toString()}`,{cache:'no-store'}).then(async response=>{
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Unable to load project collaboration context.');
   if(!active)return;
   const rows=(body.items||[]) as Need[];setNeeds(rows);
   const selected=rows.find(item=>item.id===initialNeedId)||rows[0]||null;setNeedId(selected?.id||'');
   const seed=selected?.responsibility||selected?.member_message||projectTitle;
   if(seed.trim().length>=2)void discover(seed,'recommend');
  }).catch(()=>{if(active&&projectTitle.trim().length>=2)void discover(projectTitle,'recommend')});
  return()=>{active=false};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[hasProjectContext,projectId,projectRunId,initialNeedId,projectTitle]);

 async function submitSearch(event:FormEvent){event.preventDefault();if(query.trim().length<2){setError('Enter at least 2 characters to search the network.');return}await discover(query,'search')}

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

 function card(member:Member,recommendedCard=false){
  const available=member.project_availability?.trim();
  const roleLabel=member.current_job_title||(member.preferred_roles||[])[0]||member.professional_area||'Mettelo member';
  return <article className="mcdCard" key={member.username}>
   <div className="mcdIdentity">
    <div className="mcdAvatar" aria-hidden="true">{member.avatar_url?<img src={member.avatar_url} alt=""/>:<span>{(member.full_name||member.username).slice(0,2).toUpperCase()}</span>}</div>
    <div><h3>{member.full_name||member.username}</h3><p>@{member.username} · {roleLabel}</p></div>
   </div>
   <div className="mcdBadges">{available&&<span>{available}</span>}{recommendedCard&&<span>Relevant experience</span>}{member.weekly_capacity&&<span>{member.weekly_capacity}</span>}</div>
   {member.headline&&<p className="mcdSummary">{member.headline}</p>}
   <div className="mcdSkills">{(member.skills||[]).slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div>
   <div className="mcdActions">
    <Link className="button ghost" href={paramsForProfile(member.username,{...props,initialNeedId:needId||initialNeedId})}>View profile</Link>
    {hasProjectContext&&<button className="button dark" type="button" onClick={()=>void invite(member.username)} disabled={Boolean(working)}>{working===member.username?'Sending…':'Send team request'}</button>}
   </div>
  </article>;
 }

 return <div className="mcdRoot">
  <section className="mcdSection" aria-labelledby="recommended-collaborators-title">
   <div className="mcdSectionHead"><div><span>RECOMMENDED COLLABORATORS</span><h2 id="recommended-collaborators-title">Recommended collaborators</h2><p>{hasProjectContext?'People surfaced from your current project context and visible collaboration needs.':'Open Collaboration Network from an active project to see project-specific collaborator recommendations.'}</p></div>{hasProjectContext&&working==='recommend'&&<span role="status">Loading…</span>}</div>
   {hasProjectContext&&recommended.length>0?<div className="mcdGrid">{recommended.map(member=>card(member,true))}</div>:hasProjectContext&&working!=='recommend'?<div className="mcdEmpty"><strong>No visible recommendations yet</strong><p>Search the network below to find a collaborator by name, role, capability or domain.</p></div>:!hasProjectContext?<div className="mcdContextHint"><strong>Looking for someone for a project?</strong><p>Use Team → Grow the Team → Find people on Mettelo. Your project context will be carried here securely so you can send governed team requests.</p></div>:null}
  </section>

  <section className="mcdSearch" aria-labelledby="search-network-title">
   <div className="mcdSectionHead"><div><span>SEARCH THE NETWORK</span><h2 id="search-network-title">Search the network</h2><p>Search discoverable members. Private profile information is never included.</p></div><Link href="/member/blocked-members">Manage blocked members</Link></div>
   {hasProjectContext&&needs.length>0&&<label className="mcdNeed">Request context<select value={needId} onChange={event=>{const next=event.target.value;setNeedId(next);const item=needs.find(value=>value.id===next);const seed=item?.responsibility||item?.member_message||projectTitle||'';if(seed.trim().length>=2)void discover(seed,'recommend')}}><option value="">Direct team request</option>{needs.map(item=><option value={item.id} key={item.id}>{item.responsibility||item.member_message||item.weekly_commitment||'Active collaboration need'}</option>)}</select></label>}
   <form onSubmit={submitSearch}>
    <div className="mcdSearchRow"><label htmlFor="collaboration-member-search">Search by name, @username, role, capability or domain</label><div><input id="collaboration-member-search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search by name, @username, role, capability or domain"/><button className="button dark" type="submit" disabled={working==='search'}>{working==='search'?'Searching…':'Search network'}</button></div></div>
    <details className="mcdFilterPanel"><summary>Filters</summary><div className="mcdFilters"><label>Role<input value={role} onChange={event=>setRole(event.target.value)} placeholder="Any role"/></label><label>Capability<input value={capability} onChange={event=>setCapability(event.target.value)} placeholder="Any capability"/></label><label>Domain<input value={domain} onChange={event=>setDomain(event.target.value)} placeholder="Any domain"/></label><label>Availability<input value={availability} onChange={event=>setAvailability(event.target.value)} placeholder="Any availability"/></label><label>Commitment<input value={commitment} onChange={event=>setCommitment(event.target.value)} placeholder="Any commitment"/></label></div></details>
   </form>
   {error&&<div className="mcdError" role="alert"><strong>We couldn’t load the Collaboration Network.</strong><span>{error}</span></div>}
   <div className="mcdStatus" role="status" aria-live="polite">{status}</div>
   {searched&&(results.length?<div className="mcdGrid" aria-label="Search results">{results.map(member=>card(member,false))}</div>:working!=='search'&&!error?<div className="mcdEmpty"><strong>No visible matches yet</strong><p>Try another search or adjust your filters.</p></div>:null)}
  </section>
  <style jsx>{`
   .mcdRoot{display:grid;gap:28px;min-width:0}.mcdSection,.mcdSearch{display:grid;gap:16px;min-width:0}.mcdSectionHead{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.mcdSectionHead span{font:800 .68rem/1.2 var(--font-mono);letter-spacing:.1em;color:var(--bronze-deep)}.mcdSectionHead h2{margin:5px 0 3px;font-size:clamp(1.35rem,2.5vw,1.65rem)}.mcdSectionHead p{margin:0;color:var(--slate);line-height:1.5}.mcdSectionHead>a{font-size:.78rem;font-weight:800}.mcdGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.mcdCard,.mcdEmpty,.mcdContextHint,.mcdSearch{border:1px solid var(--line);border-radius:16px;background:var(--white);padding:18px;min-width:0}.mcdSearch{padding:20px}.mcdIdentity{display:flex;align-items:center;gap:12px}.mcdIdentity h3{margin:0;font-size:1rem}.mcdIdentity p{margin:3px 0 0;color:var(--slate);font-size:.76rem;overflow-wrap:anywhere}.mcdAvatar{width:52px;height:52px;border-radius:50%;overflow:hidden;display:grid;place-items:center;flex:0 0 auto;background:var(--ink);color:white;font-weight:850}.mcdAvatar img{width:100%;height:100%;object-fit:cover}.mcdBadges,.mcdSkills{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.mcdBadges span,.mcdSkills span{border-radius:999px;padding:5px 8px;background:#f4f5f6;color:#445;font-size:.68rem;font-weight:750}.mcdBadges span:first-child{background:#edf8f2;color:#157347}.mcdSummary{margin:13px 0;color:var(--slate);font-size:.78rem;line-height:1.5}.mcdActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.mcdActions :global(.button){min-height:44px;text-align:center}.mcdNeed{display:grid;gap:6px;font-size:.76rem;font-weight:800;max-width:520px}.mcdNeed select,.mcdSearch input{min-height:46px;border:1px solid #cfc7ba;border-radius:10px;background:var(--paper);color:var(--ink);padding:10px 12px}.mcdSearchRow{display:grid;gap:7px}.mcdSearchRow>label{font-size:.76rem;font-weight:800}.mcdSearchRow>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.mcdFilterPanel{margin-top:10px}.mcdFilterPanel summary{display:flex;align-items:center;min-height:44px;width:max-content;cursor:pointer;font-weight:800}.mcdFilters{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;padding-top:9px}.mcdFilters label{display:grid;gap:5px;font-size:.72rem;font-weight:750}.mcdFilters input{width:100%;min-width:0}.mcdStatus{min-height:20px;color:var(--slate);font-size:.75rem}.mcdError{display:grid;gap:4px;padding:12px;border:1px solid #e0b7b7;border-radius:10px;background:#fff6f6}.mcdError span,.mcdEmpty p,.mcdContextHint p{color:var(--slate);margin:5px 0 0;line-height:1.5}.mcdEmpty,.mcdContextHint{grid-column:1/-1}.mcdSearch .mcdGrid{margin-top:4px}@media(max-width:1000px){.mcdGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.mcdFilters{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.mcdSectionHead{display:grid;align-items:start}.mcdGrid,.mcdFilters,.mcdSearchRow>div{grid-template-columns:1fr}.mcdSearch{padding:15px}.mcdActions{grid-template-columns:1fr}.mcdSearchRow :global(.button),.mcdActions :global(.button){width:100%}}@media(max-width:360px){.mcdCard{padding:14px}.mcdIdentity{align-items:flex-start}}`}</style>
 </div>;
}
