'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useMemo,useState} from 'react';
import CollaborationPersonCard,{type CollaborationMember} from '@/components/collaboration/CollaborationPersonCard';
import styles from '@/components/collaboration/CollaborationNetwork.module.css';

type Need={id:string;responsibility:string|null;member_message:string|null;weekly_commitment:string|null};
type Props={projectId?:string;projectRunId?:string;initialNeedId?:string;projectTitle?:string};

function paramsForProfile(username:string,props:Props){
 const params=new URLSearchParams();
 if(props.projectId&&props.projectRunId){params.set('project_id',props.projectId);params.set('project_run_id',props.projectRunId)}
 if(props.initialNeedId)params.set('collaboration_need',props.initialNeedId);
 const suffix=params.toString();
 return `/member/collaboration/people/${encodeURIComponent(username)}${suffix?`?${suffix}`:''}`;
}

export default function MemberCollaboratorDiscovery(props:Props){
 const{projectId,projectRunId,initialNeedId}=props;
 const hasProjectContext=Boolean(projectId&&projectRunId);
 const[needs,setNeeds]=useState<Need[]>([]);
 const[needId,setNeedId]=useState(initialNeedId||'');
 const[query,setQuery]=useState('');
 const[recommended,setRecommended]=useState<CollaborationMember[]>([]);
 const[results,setResults]=useState<CollaborationMember[]>([]);
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
   const qs=new URLSearchParams({limit:mode==='recommend'?'6':'20'});
   if(mode==='recommend')qs.set('mode','recommend');else qs.set('q',term);
   if(projectId&&projectRunId){qs.set('project_id',projectId);qs.set('project_run_id',projectRunId)}
   if(selectedNeed)qs.set('collaboration_need',selectedNeed);
   if(mode==='search'){
    if(role.trim())qs.set('role',role.trim());
    if(capability.trim())qs.set('capability',capability.trim());
    if(domain.trim())qs.set('domain',domain.trim());
    if(availability.trim())qs.set('availability',availability.trim());
    if(commitment.trim())qs.set('commitment',commitment.trim());
   }
   const response=await fetch(`/api/member-discovery?${qs.toString()}`,{cache:'no-store'});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'We could not load the Collaboration Network.');
   const items=(body.items||[]) as CollaborationMember[];
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
   const rows=(body.items||[]) as Need[];
   setNeeds(rows);
   const selected=rows.find(item=>item.id===initialNeedId)||rows[0]||null;
   const selectedId=selected?.id||'';
   setNeedId(selectedId);
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
   setRecommended(current=>current.filter(item=>item.username!==username));
   setResults(current=>current.filter(item=>item.username!==username));
   setStatus(`@${username} is blocked and has been removed from collaboration discovery.`);
  }catch(err){setError(err instanceof Error?err.message:'Unable to block this member.')}finally{setWorking('')}
 }

 async function invite(username:string){
  if(!projectId||!projectRunId){setError('Open Collaboration Network from an active project before sending a team request.');return}
  setWorking(`invite:${username}`);setStatus('');setError('');
  const markPending=()=>{const update=(items:CollaborationMember[])=>items.map(item=>item.username===username?{...item,invitation_state:'pending' as const}:item);setRecommended(update);setResults(update)};
  try{
   const response=await fetch('/api/member-collaboration-invitations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,collaboration_need_id:needId||null,username})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok){
    if(body.code==='INVITE_ALREADY_PENDING'){markPending();setStatus(`A team request is already pending for @${username}.`);return}
    throw new Error(body.error||'Unable to send team request.');
   }
   markPending();
   setStatus(`Team request sent to @${username}. Membership has not been created; the request remains pending until they accept and governed joining checks continue.`);
  }catch(err){setError(err instanceof Error?err.message:'Unable to send team request.')}finally{setWorking('')}
 }

 function clearFilters(){setRole('');setCapability('');setDomain('');setAvailability('');setCommitment('')}
 function updateQuery(value:string){setQuery(value);if(!value.trim()){setSearched(false);setSearchedQuery('');setResults([]);setError('');setStatus('')}}

 function card(member:CollaborationMember,recommendedCard=false){
  return <CollaborationPersonCard
   key={member.username}
   member={member}
   recommended={recommendedCard}
   hasProjectContext={hasProjectContext}
   pending={member.invitation_state==='pending'}
   working={working}
   profileHref={paramsForProfile(member.username,{...props,initialNeedId:needId||initialNeedId})}
   onInvite={username=>void invite(username)}
   onBlock={username=>void block(username)}
  />;
 }

 return <div className="mcdRoot">
  <section className="mcdSection" aria-labelledby="recommended-collaborators-title">
   <div className={styles.sectionHead}>
    <div>
     <div className={styles.eyebrow}>RECOMMENDED COLLABORATORS</div>
     <h2 id="recommended-collaborators-title">People who may be useful collaborators</h2>
     <p>Prioritised people whose skills, availability and professional context may fit {hasProjectContext?'this project':'your collaboration interests'}.</p>
    </div>
    {working==='recommend'&&<span role="status">Finding relevant people…</span>}
   </div>

   {recommended.length>0?<div className={styles.personGrid} role="list" aria-label="Recommended collaborators">{recommended.map(member=>card(member,true))}</div>:working!=='recommend'&&!error?<div className={styles.empty}><strong>No recommended collaborators yet</strong><p>Search the network by role, skill, capability or domain.</p></div>:null}
   <p className={styles.privacyNote}>Only discoverable profile information is shown. Inviting someone does not add them to your team.</p>
  </section>

  <section className="mcdSearch" aria-labelledby="search-network-title">
   <div className={styles.sectionHead}>
    <div>
     <div className={styles.eyebrow}>EXPLORE PEOPLE</div>
     <h2 id="search-network-title">Find another collaborator</h2>
     <p>Search people first. Add filters only when you need to narrow the network.</p>
    </div>
    <Link href="/member/blocked-members">Manage blocked members</Link>
   </div>

   {hasProjectContext&&needs.length>0&&<label className="mcdNeed">Request context<select value={needId} onChange={event=>{const next=event.target.value;setNeedId(next);void discover('','recommend',next)}}><option value="">Direct team request</option>{needs.map(item=><option value={item.id} key={item.id}>{item.responsibility||item.member_message||item.weekly_commitment||'Active collaboration need'}</option>)}</select></label>}

   <form className={styles.searchShell} onSubmit={submitSearch}>
    <label>
     <span className={styles.searchLabel}>Search people, roles, skills or domains</span>
     <div className={styles.searchRow}>
      <input id="collaboration-member-search" className={styles.searchInput} value={query} onChange={event=>updateQuery(event.target.value)} placeholder="Try “Data Analyst”, “Python” or “Healthcare”"/>
      <button className={styles.searchButton} type="submit" disabled={working==='search'}>{working==='search'?'Searching…':'Search network'}</button>
     </div>
    </label>

    <details className={styles.filters}>
     <summary>Filters{activeFilterCount>0&&<span className={styles.filterCount}>{activeFilterCount}</span>}</summary>
     <div className={styles.filterGrid}>
      <label>Role<input value={role} onChange={event=>setRole(event.target.value)} placeholder="Any role"/></label>
      <label>Capability<input value={capability} onChange={event=>setCapability(event.target.value)} placeholder="Any capability"/></label>
      <label>Domain<input value={domain} onChange={event=>setDomain(event.target.value)} placeholder="Any domain"/></label>
      <label>Availability<input value={availability} onChange={event=>setAvailability(event.target.value)} placeholder="Any availability"/></label>
      <label>Commitment<input value={commitment} onChange={event=>setCommitment(event.target.value)} placeholder="Any commitment"/></label>
      {activeFilterCount>0&&<button type="button" className={styles.clear} onClick={clearFilters}>Clear</button>}
     </div>
    </details>
   </form>

   {error&&<div className={styles.error} role="alert"><strong>We couldn’t load the Collaboration Network.</strong><p>{error}</p></div>}
   <div role="status" aria-live="polite">{status}</div>

   {searched&&<section aria-labelledby="search-results-title">
    <div className={styles.resultMeta}><strong id="search-results-title">Results for “{searchedQuery}”</strong>{results.length>0&&<span>{results.length} collaborator{results.length===1?'':'s'}</span>}</div>
    {results.length?<div className={styles.personGrid} role="list" aria-label="Search results">{results.map(member=>card(member,false))}</div>:working!=='search'&&!error?<div className={styles.empty}><strong>No matches found</strong><p>Try another term or adjust your filters.</p></div>:null}
   </section>}
  </section>
 </div>;
}
