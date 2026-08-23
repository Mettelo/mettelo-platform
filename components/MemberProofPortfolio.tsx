'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import ProofVisibilityControl from '@/components/ProofVisibilityControl';
import SocialShare from '@/components/SocialShare';

export type MemberProofItem={
  id:string;
  project_id:string|null;
  project_run_id:string|null;
  title:string;
  contribution_type:string;
  description:string|null;
  verification_status:'verified'|'pending'|'needs_changes'|'rejected'|string;
  created_at:string;
  updated_at:string|null;
  verified_at:string|null;
  evidence_url:string|null;
  review_notes:string|null;
  visibility:string;
  project_title:string|null;
  project_role:string|null;
  can_view_project:boolean;
};

type Credential={credential_id:string;status:string;issued_at:string}|null;

type Props={
  verifiedItems:MemberProofItem[];
  pendingItems:MemberProofItem[];
  rejectedItems:MemberProofItem[];
  verifiedTotal:number;
  pendingTotal:number;
  projectsEvidenced:number|null;
  pendingLoadFailed:boolean;
  credential:Credential;
};

function formatDate(value:string|null){return value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)):'Not recorded'}
function humanise(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function safeEvidenceUrl(value:string|null){if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'?url.toString():null}catch{return null}}

export default function MemberProofPortfolio({verifiedItems,pendingItems,rejectedItems,verifiedTotal,pendingTotal,projectsEvidenced,pendingLoadFailed,credential}:Props){
  const [verified]=useState(verifiedItems);
  const [pending,setPending]=useState(pendingItems);
  const [query,setQuery]=useState('');
  const [projectFilter,setProjectFilter]=useState('all');
  const [selected,setSelected]=useState<MemberProofItem|null>(null);
  const [description,setDescription]=useState('');
  const [evidenceUrl,setEvidenceUrl]=useState('');
  const [working,setWorking]=useState(false);
  const [statusMessage,setStatusMessage]=useState('');
  const dialogRef=useRef<HTMLDialogElement>(null);

  useEffect(()=>{if(selected){setDescription(selected.description||'');setEvidenceUrl(selected.evidence_url||'');if(dialogRef.current&&!dialogRef.current.open)dialogRef.current.showModal()}},[selected]);

  const projectOptions=useMemo(()=>[...new Map(verified.filter(item=>item.project_id&&item.project_title).map(item=>[item.project_id as string,item.project_title as string])).entries()].sort((a,b)=>a[1].localeCompare(b[1])),[verified]);
  const visibleVerified=useMemo(()=>verified.filter(item=>{
    const text=`${item.title} ${item.description||''} ${item.project_title||''} ${item.contribution_type}`.toLowerCase();
    return (!query.trim()||text.includes(query.trim().toLowerCase()))&&(projectFilter==='all'||item.project_id===projectFilter);
  }),[verified,query,projectFilter]);
  const hasFilters=Boolean(query.trim()||projectFilter!=='all');

  function resetFilters(){setQuery('');setProjectFilter('all')}
  function closeDialog(){dialogRef.current?.close();setSelected(null);setStatusMessage('')}

  async function resubmit(event:React.FormEvent){
    event.preventDefault();if(!selected||selected.verification_status!=='needs_changes'||working)return;
    setWorking(true);setStatusMessage('Resubmitting your evidence…');
    try{
      const response=await fetch('/api/contributions',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:selected.id,description,evidence_url:evidenceUrl})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'We could not resubmit this contribution.');
      const next={...selected,description,evidence_url:evidenceUrl||null,verification_status:'pending',updated_at:new Date().toISOString()};
      setPending(items=>items.map(item=>item.id===next.id?next:item));setSelected(next);setStatusMessage(body.message||'Contribution resubmitted for review.');
    }catch(error){setStatusMessage(error instanceof Error?error.message:'We could not resubmit this contribution.');}
    finally{setWorking(false)}
  }

  return <>
    <section className="mpSummary" aria-label="Mettelo Proof summary">
      <article className="mpSummaryCard mpSummaryVerified"><strong>{verifiedTotal}</strong><span>Verified contribution evidence</span><small>Contribution records that completed review and reached the verified state</small></article>
      {projectsEvidenced!==null&&<article className="mpSummaryCard"><strong>{projectsEvidenced}</strong><span>Projects evidenced</span><small>Distinct projects represented in your verified contribution evidence</small></article>}
      <article className="mpSummaryCard"><strong>{pendingTotal}</strong><span>In review</span><small>{pendingTotal===1?'One contribution evidence item is still being reviewed':'Evidence still in review is not counted as verified'}</small></article>
    </section>

    {verified.length>0&&<section className="mpFilterbar" aria-label="Mettelo Proof filters">
      <label><span className="mpSrOnly">Search Mettelo Proof</span><input className="mpInput" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search Mettelo Proof or projects"/></label>
      {projectOptions.length>1&&<select className="mpSelect" aria-label="Filter by source project" value={projectFilter} onChange={event=>setProjectFilter(event.target.value)}><option value="all">All projects</option>{projectOptions.map(([id,title])=><option value={id} key={id}>{title}</option>)}</select>}
    </section>}

    <section className="mpSection" aria-labelledby="verified-proof-title">
      <div className="mpSectionHead"><div><div className="mpEyebrow">VERIFIED CONTRIBUTION EVIDENCE</div><h2 id="verified-proof-title">Reviewed evidence from your contributions</h2><p>Each item is a project contribution whose supporting evidence completed review and is in the verified state. Project completion, task completion and profile claims do not create Mettelo Proof on their own.</p></div><span className="mpCount">{verifiedTotal} verified {verifiedTotal===1?'record':'records'}</span></div>
      {verified.length===0?<div className="mpEmpty"><h3>Mettelo Proof starts with project work</h3><p>Verified contribution evidence appears here after a project contribution completes review and reaches the verified state.</p><div className="mpActions"><a className="mpBtn mpPrimary" href="/member/projects">View Projects</a><a className="mpBtn" href="/projects">Discover projects</a></div></div>:
      visibleVerified.length?<div className="mpProofGrid">{visibleVerified.map((item,index)=><VerifiedCard item={item} featured={index===0&&!hasFilters} onOpen={setSelected} key={item.id}/>)}</div>:
      <div className="mpEmpty" aria-live="polite"><h3>No Mettelo Proof matches these filters</h3><p>Try a different project or search term.</p><button className="mpBtn mpPrimary" type="button" onClick={resetFilters}>Clear filters</button></div>}
      {verifiedTotal>verified.length&&<p className="mpLimitNote">Showing the {verified.length} most recently verified contribution records. The portfolio query is deliberately bounded so the first screen does not fetch an unlimited evidence history.</p>}
    </section>

    {pendingLoadFailed?<section className="mpPendingWarning" role="status"><strong>Contribution evidence in review could not be loaded.</strong><span>Your verified contribution evidence above is still available. Refresh to retry the review queue.</span></section>:pending.length>0&&<section className="mpSection mpPendingSection" aria-labelledby="pending-proof-title">
      <div className="mpSectionHead"><div><div className="mpEyebrow">IN REVIEW</div><h2 id="pending-proof-title">Contribution evidence still in review</h2><p>Evidence in review is not Mettelo Proof yet. It only moves into the verified section when the contribution review state changes to verified.</p></div><span className="mpCount">{pendingTotal} in review</span></div>
      <div className="mpPendingList">{pending.map(item=><PendingCard item={item} onOpen={setSelected} key={item.id}/>)}</div>
      {pendingTotal>pending.length&&<p className="mpLimitNote">Showing the {pending.length} most recent review items.</p>}
    </section>}

    {rejectedItems.length>0&&<details className="mpHistory"><summary>Review history · {rejectedItems.length} not verified</summary><div className="mpHistoryList">{rejectedItems.map(item=><article key={item.id}><div><span className="mpStatus">Contribution not verified</span><strong>{item.title}</strong><small>{item.project_title||'Mettelo project'} · reviewed {formatDate(item.updated_at||item.created_at)}</small></div><button className="mpBtn" type="button" onClick={()=>setSelected(item)} aria-label={`View review outcome for ${item.title}`}>View outcome</button></article>)}</div></details>}

    <section className="mpIdentity" aria-label="Mettelo Proof connections">
      <article className="mpIdentityCard"><div className="mpEyebrow">YOUR PROFESSIONAL IDENTITY</div><h2>Connect Mettelo Proof with your profile</h2><p>Your Profile describes your professional background and self-described claims. Mettelo Proof provides the separate record of reviewed project contributions that reached the verified state.</p><div className="mpActions"><a className="mpBtn mpPrimary" href="/member/profile">View profile</a>{credential&&<a className="mpBtn" href={`/credentials/${credential.credential_id}`}>Open credential</a>}</div>{credential&&<small className="mpIdentityNote">Your {credential.status} Project Architect credential remains a separate verification record, issued {formatDate(credential.issued_at)}.</small>}</article>
      <article className="mpIdentityCard mpSpotlight"><div className="mpEyebrow">PROOF ≠ PUBLICATION</div><h2>Spotlight stays separate</h2><p>A verified contribution record does not automatically become public recognition. Spotlight uses its own publication flow and preserves member consent.</p><div className="mpActions"><a className="mpBtn" href="/member/spotlight">View Spotlight</a></div></article>
    </section>

    <dialog className="mpDialog" ref={dialogRef} onClose={()=>setSelected(null)} aria-labelledby="mp-proof-dialog-title">
      {selected&&<ProofDetail item={selected} description={description} evidenceUrl={evidenceUrl} setDescription={setDescription} setEvidenceUrl={setEvidenceUrl} resubmit={resubmit} working={working} statusMessage={statusMessage} close={closeDialog}/>} 
    </dialog>

    <style jsx global>{styles}</style>
  </>;
}

function VerifiedCard({item,featured,onOpen}:{item:MemberProofItem;featured:boolean;onOpen:(item:MemberProofItem)=>void}){
  return <article className={`mpProofCard${featured?' mpFeatured':''}`}>
    <span className="mpStatus mpVerified">✓ Contribution verified</span>
    <h3>{item.title}</h3>
    {item.description&&<p>{item.description}</p>}
    {item.project_title&&<div className="mpProjectSource"><small>Source project</small><strong>{item.project_title}</strong></div>}
    <div className="mpVerifyRow">{item.project_role&&<div><small>Project role</small><strong>{item.project_role}</strong></div>}<div><small>Verified on</small><strong>{formatDate(item.verified_at)}</strong></div></div>
    <div className="mpActions mpCardActions"><button className="mpBtn mpPrimary" type="button" onClick={()=>onOpen(item)} aria-label={`View Mettelo Proof: ${item.title}`}>View Mettelo Proof</button>{item.can_view_project&&item.project_id&&<a className="mpBtn" href={`/member/projects/${item.project_id}${item.project_run_id?`?run=${item.project_run_id}`:''}`}>View project</a>}</div>
  </article>;
}

function PendingCard({item,onOpen}:{item:MemberProofItem;onOpen:(item:MemberProofItem)=>void}){
  const changes=item.verification_status==='needs_changes';
  return <article className="mpPendingCard"><div><span className={`mpStatus ${changes?'mpNeedsChanges':'mpPending'}`}>{changes?'! Changes requested':'◷ Pending review'}</span><h3>{item.title}</h3><p>{changes?'A reviewer assessed this contribution evidence and requested an update before review can continue.':'This contribution evidence is being reviewed before it can become Mettelo Proof.'}</p>{item.project_title&&<small className="mpPendingProject">Source project · {item.project_title}</small>}</div><div className="mpPendingSide"><small>YOUR NEXT STEP</small><strong>{changes?'Update and resubmit':'No action needed'}</strong><p>{changes?(item.review_notes||'Open this contribution record to update the statement or evidence link requested by the reviewer.'):'A reviewer is assessing this contribution evidence. The status will update when review is complete.'}</p>{changes&&<button className="mpBtn mpPrimary" type="button" onClick={()=>onOpen(item)}>Review &amp; resubmit</button>}</div></article>;
}

function ProofDetail({item,description,evidenceUrl,setDescription,setEvidenceUrl,resubmit,working,statusMessage,close}:{item:MemberProofItem;description:string;evidenceUrl:string;setDescription:(value:string)=>void;setEvidenceUrl:(value:string)=>void;resubmit:(event:React.FormEvent)=>void;working:boolean;statusMessage:string;close:()=>void}){
  const verified=item.verification_status==='verified';const changes=item.verification_status==='needs_changes';const evidence=safeEvidenceUrl(item.evidence_url);const publicProof=verified&&item.visibility==='public';
  return <>
    <div className="mpDialogHead"><div><div className="mpEyebrow">{verified?'VERIFIED CONTRIBUTION':changes?'EVIDENCE UPDATE':'CONTRIBUTION REVIEW'}</div><h2 id="mp-proof-dialog-title">{item.title}</h2></div><button className="mpDialogClose" type="button" aria-label="Close Mettelo Proof detail" onClick={close}>×</button></div>
    <div className="mpDialogBody">
      <div className="mpDetailGrid"><div className="mpDetail"><small>Review status</small><strong>{verified?'✓ Contribution verified':changes?'Changes requested':item.verification_status==='pending'?'Pending review':'Contribution not verified'}</strong></div>{item.verified_at&&<div className="mpDetail"><small>Verified date</small><strong>{formatDate(item.verified_at)}</strong></div>}{item.project_title&&<div className="mpDetail"><small>Source project</small><strong>{item.project_title}</strong></div>}{item.project_role&&<div className="mpDetail"><small>Project role</small><strong>{item.project_role}</strong></div>}<div className="mpDetail"><small>Contribution type</small><strong>{humanise(item.contribution_type)}</strong></div></div>
      {item.description&&<section className="mpEvidenceBlock"><h3>Contribution statement</h3><p>{item.description}</p></section>}
      {evidence&&<section className="mpEvidenceBlock"><h3>Submitted evidence reference</h3><p>This HTTPS reference was supplied with your contribution. Access remains subject to the destination’s own permissions.</p><a className="mpBtn" href={evidence} target="_blank" rel="noopener noreferrer">Open submitted evidence</a></section>}
      {changes&&<form className="mpResubmit" onSubmit={resubmit}><h3>Update your contribution evidence</h3>{item.review_notes&&<div className="mpReviewFeedback"><strong>Feedback from this review</strong><p>{item.review_notes}</p></div>}<label>Contribution statement<textarea value={description} minLength={30} maxLength={2000} required onChange={event=>setDescription(event.target.value)}/></label><label>Evidence URL <span>(optional if your existing project-ledger evidence is still valid)</span><input type="url" inputMode="url" value={evidenceUrl} onChange={event=>setEvidenceUrl(event.target.value)} placeholder="https://…"/></label><button className="mpBtn mpPrimary" type="submit" disabled={working}>{working?'Resubmitting…':'Resubmit for review'}</button><div className="mpFormStatus" role="status" aria-live="polite">{statusMessage}</div></form>}
      {verified&&<section className="mpVisibilityBlock"><h3>Visibility is separate from verification</h3><p>Changing who can see this record does not change the contribution’s verified review status, and it does not publish you to Spotlight.</p><ProofVisibilityControl id={item.id} initialVisibility={item.visibility}/>{publicProof&&<><SocialShare url={`https://mettelo.com/proof/${item.id}`} text={`Verified contribution evidence on Mettelo: ${item.title}${item.project_title?` · ${item.project_title}`:''}.`} label="Share this Mettelo Proof"/><a className="mpBtn" href={`/proof/${item.id}`}>Open public Mettelo Proof</a></>}</section>}
    </div>
    <div className="mpDialogActions">{item.can_view_project&&item.project_id&&<a className="mpBtn" href={`/member/projects/${item.project_id}${item.project_run_id?`?run=${item.project_run_id}`:''}`}>View project</a>}<button className="mpBtn" type="button" onClick={close}>Close</button></div>
  </>;
}

const styles=`
.mpSrOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.mpEyebrow{font-family:var(--font-plex-mono),ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.11em;font-size:10px;line-height:1.3;font-weight:700;color:#72551e}.mpBtn{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.mpBtn.mpPrimary{background:#111318;border-color:#111318;color:#fff}.mpBtn:disabled{opacity:.55;cursor:not-allowed}.mpBtn:focus-visible,.mpInput:focus-visible,.mpSelect:focus-visible,.mpDialogClose:focus-visible,.mpResubmit textarea:focus-visible{outline:3px solid #173f8f;outline-offset:3px}.mpActions{display:flex;gap:9px;flex-wrap:wrap}
.mpSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0 16px}.mpSummaryCard{background:#fff;border:1px solid #d8dde3;border-radius:14px;padding:16px 17px;min-height:105px}.mpSummaryVerified{background:#f4faf6;border-color:#cce0d3}.mpSummaryCard strong{display:block;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:28px;line-height:1;font-weight:800}.mpSummaryCard span{display:block;font-size:13px;font-weight:800;margin-top:7px}.mpSummaryCard small{display:block;font-size:11px;color:#68727d;line-height:1.4;margin-top:4px}
.mpFilterbar{background:#fff;border:1px solid #d8dde3;border-radius:14px;padding:12px;display:grid;grid-template-columns:minmax(260px,1fr) 220px;gap:10px;align-items:center;margin-bottom:32px}.mpInput,.mpSelect{width:100%;height:44px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;padding:0 12px;font:inherit}
.mpSection{margin-top:32px}.mpSectionHead{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:13px}.mpSectionHead h2{margin:5px 0 4px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:28px;line-height:1.08;letter-spacing:-.026em}.mpSectionHead p{margin:0;max-width:720px;color:#68727d;font-size:12.5px;line-height:1.55}.mpCount{font-size:11px;color:#68727d;white-space:nowrap}.mpProofGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mpProofCard{background:#fff;border:1px solid #d8dde3;border-radius:16px;padding:18px;display:flex;flex-direction:column;min-height:300px;min-width:0}.mpProofCard.mpFeatured{border-color:#bad7c4;background:linear-gradient(135deg,#fff,#f5faf7)}.mpStatus{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;min-height:30px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:850;background:#eef1f4;color:#4f5965}.mpVerified{background:#edf8f1;color:#185b3c}.mpPending{background:#fff7e6;color:#6b4b0b}.mpNeedsChanges{background:#fff1ee;color:#7a2f25}.mpProofCard h3{margin:10px 0 7px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px;line-height:1.15;letter-spacing:-.025em;overflow-wrap:anywhere}.mpProofCard>p{margin:0;color:#68727d;font-size:12.7px;line-height:1.58}.mpProjectSource{margin-top:12px;padding:11px 12px;border:1px solid #e2e6e9;border-radius:11px;background:#f8f8f6;display:grid;gap:2px;min-width:0}.mpProjectSource small,.mpVerifyRow small{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#68727d;font-weight:700}.mpProjectSource strong{font-size:12.5px;overflow-wrap:anywhere}.mpVerifyRow{margin-top:14px;padding-top:13px;border-top:1px solid #d8dde3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mpVerifyRow strong{display:block;margin-top:3px;font-size:11.5px}.mpCardActions{margin-top:auto;padding-top:16px}.mpLimitNote{margin:12px 0 0;color:#68727d;font-size:11px;line-height:1.5}
.mpPendingSection{margin-top:36px}.mpPendingList{display:grid;gap:12px}.mpPendingCard{background:#fff;border:1px solid #d8dde3;border-radius:14px;padding:16px 17px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:18px;align-items:center}.mpPendingCard h3{margin:8px 0 5px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:18px;overflow-wrap:anywhere}.mpPendingCard p{margin:0;color:#68727d;font-size:12px;line-height:1.5}.mpPendingProject{display:block;margin-top:8px;color:#68727d}.mpPendingSide{border-left:1px solid #d8dde3;padding-left:18px}.mpPendingSide>small{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#72551e;font-weight:700}.mpPendingSide>strong{display:block;font-size:12.5px;margin:5px 0 3px}.mpPendingSide>.mpBtn{margin-top:12px}.mpPendingWarning{margin-top:32px;padding:16px 17px;border:1px solid #e8cf91;border-radius:14px;background:#fff7e6;display:grid;gap:4px}.mpPendingWarning span{font-size:12px;color:#5f4a22}
.mpHistory{margin-top:28px;border:1px solid #d8dde3;border-radius:14px;background:#fff}.mpHistory>summary{min-height:48px;padding:0 16px;display:flex;align-items:center;font-weight:800;font-size:12px;cursor:pointer}.mpHistoryList{border-top:1px solid #e2e6e9;padding:10px;display:grid;gap:8px}.mpHistoryList article{padding:10px;border-radius:10px;background:#f8f8f6;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}.mpHistoryList article>div{display:grid;gap:4px}.mpHistoryList strong{font-size:13px}.mpHistoryList small{color:#68727d;font-size:11px}
.mpIdentity{margin-top:32px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.mpIdentityCard{border:1px solid #d8dde3;background:#fff;border-radius:16px;padding:18px}.mpIdentityCard.mpSpotlight{background:#e9e3d7;border-color:#d5ccba}.mpIdentityCard h2{margin:6px 0;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px}.mpIdentityCard p{margin:0;color:#55606b;font-size:12.5px;line-height:1.55}.mpIdentityCard .mpActions{margin-top:16px}.mpIdentityNote{display:block;margin-top:12px;color:#68727d;line-height:1.45}
.mpEmpty{background:#fff;border:1px dashed #b8c0c9;border-radius:14px;padding:20px}.mpEmpty h3{margin:0 0 6px;font-size:18px}.mpEmpty p{margin:0 0 14px;color:#68727d}
.mpDialog{border:0;border-radius:18px;width:min(780px,calc(100vw - 28px));max-height:88vh;padding:0;color:#111318;background:#fff;box-shadow:0 18px 46px rgba(17,19,24,.13)}.mpDialog::backdrop{background:rgba(16,19,29,.48)}.mpDialogHead{padding:20px 22px;border-bottom:1px solid #d8dde3;display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.mpDialogHead h2{margin:5px 0 0;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:24px;letter-spacing:-.02em;overflow-wrap:anywhere}.mpDialogClose{width:44px;height:44px;flex:0 0 44px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;font:inherit;font-size:1.25rem;cursor:pointer}.mpDialogBody{padding:22px;overflow-wrap:anywhere}.mpDetailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mpDetail{border:1px solid #d8dde3;border-radius:12px;padding:14px;min-width:0}.mpDetail small{display:block;font-size:10px;color:#68727d;text-transform:uppercase;letter-spacing:.06em}.mpDetail strong{display:block;margin-top:5px;font-size:13px;overflow-wrap:anywhere}.mpEvidenceBlock,.mpVisibilityBlock,.mpResubmit{margin-top:18px;border:1px solid #dfe4e7;border-radius:14px;padding:16px;background:#f8f8f6}.mpEvidenceBlock h3,.mpVisibilityBlock h3,.mpResubmit h3{margin:0 0 6px;font-size:17px}.mpEvidenceBlock p,.mpVisibilityBlock>p{margin:0 0 12px;color:#5e6873;font-size:12.5px;line-height:1.55}.mpResubmit{display:grid;gap:12px}.mpResubmit label{display:grid;gap:6px;font-size:12px;font-weight:800}.mpResubmit label span{font-weight:500;color:#68727d}.mpResubmit textarea,.mpResubmit input{width:100%;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;padding:10px 12px;font:inherit}.mpResubmit textarea{min-height:130px;resize:vertical}.mpReviewFeedback{padding:12px;border-radius:10px;background:#fff7e6;border:1px solid #e8cf91}.mpReviewFeedback p{margin:5px 0 0;color:#5f4a22;font-size:12px;line-height:1.5}.mpFormStatus{min-height:20px;font-size:12px;color:#55606b}.mpDialogActions{padding:16px 22px;border-top:1px solid #d8dde3;display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap}
@media(max-width:1024px){.mpSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.mpFilterbar{grid-template-columns:1fr}.mpProofGrid{grid-template-columns:1fr}.mpPendingCard{grid-template-columns:1fr}.mpPendingSide{border-left:0;border-top:1px solid #d8dde3;padding:14px 0 0}.mpIdentity{grid-template-columns:1fr}}
@media(max-width:480px){.mpSummary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px}.mpSummaryCard{min-height:94px;padding:12px}.mpSummaryCard strong{font-size:24px}.mpSummaryCard span{font-size:12px}.mpSummaryCard small{font-size:10px}.mpSummaryCard:last-child:nth-child(odd){grid-column:1/-1}.mpFilterbar{padding:10px;gap:8px;margin-bottom:24px}.mpSection{margin-top:25px}.mpSectionHead{align-items:flex-start}.mpSectionHead h2{font-size:23px}.mpSectionHead p{font-size:12px}.mpCount{display:none}.mpProofCard{min-height:0;padding:15px}.mpProofCard h3{font-size:19px}.mpVerifyRow{grid-template-columns:1fr}.mpCardActions{display:grid;grid-template-columns:1fr}.mpCardActions .mpBtn{width:100%}.mpPendingCard{padding:15px}.mpHistoryList article{grid-template-columns:1fr}.mpHistoryList .mpBtn{width:100%}.mpIdentityCard{padding:15px}.mpIdentityCard .mpActions{display:grid;grid-template-columns:1fr}.mpIdentityCard .mpBtn{width:100%}.mpDetailGrid{grid-template-columns:1fr}.mpDialogHead,.mpDialogBody,.mpDialogActions{padding-left:16px;padding-right:16px}.mpDialogActions{display:grid;grid-template-columns:1fr}.mpDialogActions .mpBtn{width:100%}}
@media(prefers-reduced-motion:reduce){.mpDialog,.mpBtn{transition:none}}
`;