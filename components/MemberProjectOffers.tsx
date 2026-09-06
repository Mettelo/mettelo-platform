'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

type Project={title:string;project_type:string|null;partner_name:string|null;weekly_commitment:string|null;duration_weeks:number|null;participation_mode:string|null;kickoff_at:string|null;min_team_size:number|null;target_team_size:number|null;max_team_size:number|null};
type TeamState={confirmed:number;reserved:number;minimum:number;target:number;maximum:number};
type Offer={id:string;application_id:string;project_id:string;project_run_id:string|null;status:'pending'|'accepted'|'declined'|'expired';offered_at:string;expires_at:string;accepted_at:string|null;declined_at:string|null;expired_at:string|null;capacity_reserved_at:string;capacity_released_at:string|null;projects:Project|Project[]|null;team_state?:TeamState};
type Action='accept'|'decline';

function projectOf(offer:Offer){return Array.isArray(offer.projects)?offer.projects[0]||null:offer.projects}
function dateTime(value:string|null){if(!value)return'Not yet confirmed';return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function statusLabel(status:Offer['status']){return status==='pending'?'Place offered':status==='accepted'?'Place accepted':status==='declined'?'Place declined':'Offer expired'}
function participationLabel(value:string|null|undefined){if(!value)return'Project configuration';return value.replaceAll('_',' ').replace(/^./,character=>character.toUpperCase())}
function teamCopy(offer:Offer){const state=offer.team_state;const project=projectOf(offer);if(!state){const min=Math.max(1,Number(project?.min_team_size||1));const target=Math.max(min,Number(project?.target_team_size||min));return `Minimum to start: ${min} · target: ${target}`;}return `${state.confirmed} confirmed · ${state.reserved} reserved · minimum to start: ${state.minimum} · target: ${state.target}`}
function displayStatus(offer:Offer,now:number):Offer['status']{return offer.status==='pending'&&new Date(offer.expires_at).getTime()<=now?'expired':offer.status}

export default function MemberProjectOffers(){
  const [offers,setOffers]=useState<Offer[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [working,setWorking]=useState('');
  const [pendingAction,setPendingAction]=useState<{offer:Offer;action:Action}|null>(null);
  const [now,setNow]=useState(()=>Date.now());
  const dialogRef=useRef<HTMLDialogElement>(null);
  const openerRef=useRef<HTMLButtonElement|null>(null);
  const statusRef=useRef<HTMLDivElement>(null);

  async function load(){
    setLoading(true);setError('');
    try{
      const response=await fetch('/api/project-offers/mine',{cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'We could not load your project offers right now.');
      setOffers(body.offers||[]);
    }catch(cause){setError(cause instanceof Error?cause.message:'We could not load your project offers right now.');}
    finally{setLoading(false)}
  }

  useEffect(()=>{void load()},[]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),30_000);return()=>window.clearInterval(timer)},[]);
  useEffect(()=>{if(pendingAction&&dialogRef.current&&!dialogRef.current.open)dialogRef.current.showModal()},[pendingAction]);
  useEffect(()=>{if(message)statusRef.current?.focus()},[message]);

  const active=useMemo(()=>offers.filter(offer=>displayStatus(offer,now)==='pending'),[offers,now]);
  const resolved=useMemo(()=>offers.filter(offer=>displayStatus(offer,now)!=='pending'),[offers,now]);

  async function respond(offer:Offer,action:Action){
    setWorking(offer.id);setError('');setMessage('');
    try{
      const response=await fetch('/api/project-offers',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:offer.id,action})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok){
        if(body.offer?.status==='expired'){
          setOffers(current=>current.map(item=>item.id===offer.id?{...item,status:'expired',expired_at:new Date().toISOString(),capacity_released_at:new Date().toISOString()}:item));
        }
        closeDialog(false);
        throw new Error(body.error||'We could not update this project offer right now.');
      }
      const next=body.offer?.status as Offer['status'];
      const changedAt=new Date().toISOString();
      setOffers(current=>current.map(item=>item.id===offer.id?{...item,status:next,accepted_at:next==='accepted'?changedAt:item.accepted_at,declined_at:next==='declined'?changedAt:item.declined_at,capacity_released_at:next==='declined'?changedAt:item.capacity_released_at}:item));
      const project=projectOf(offer)?.title||'this project';
      closeDialog(false);
      setMessage(next==='accepted'?`Place accepted. Your commitment to ${project} is recorded. Mettelo will now move it into the governed team-formation and readiness journey.`:`Place declined. The reserved capacity for ${project} has been released.`);
    }catch(cause){setError(cause instanceof Error?cause.message:'We could not update this project offer right now.');}
    finally{setWorking('')}
  }

  function openAction(offer:Offer,action:Action,opener:HTMLButtonElement){setMessage('');setError('');openerRef.current=opener;setPendingAction({offer,action})}
  function closeDialog(restoreFocus=true){if(dialogRef.current?.open)dialogRef.current.close();setPendingAction(null);if(restoreFocus)window.requestAnimationFrame(()=>openerRef.current?.isConnected&&openerRef.current.focus())}

  if(loading)return <section className="mpoPanel" aria-busy="true" aria-live="polite"><div className="mpoEyebrow">PROJECT PLACE OFFERS</div><h2>Your project offers</h2><p>Loading your current offer state…</p><style jsx global>{styles}</style></section>;
  if(error&&!offers.length)return <section className="mpoPanel mpoError" role="alert"><div className="mpoEyebrow">PROJECT PLACE OFFERS</div><h2>We couldn’t load your offers</h2><p>{error}</p><button className="mpoButton mpoDark" type="button" onClick={()=>void load()}>Try again</button><style jsx global>{styles}</style></section>;
  if(!offers.length)return null;

  return <>
    <section className="mpoPanel" aria-labelledby="member-project-offers-title">
      <div className="mpoHead"><div><div className="mpoEyebrow">PROJECT PLACE OFFERS</div><h2 id="member-project-offers-title">Review your offered project place</h2><p>You are seeing this because your project interest progressed through governed review and Mettelo selected you for a place. Selection is not enrolment: you decide whether to commit.</p></div>{active.length>0&&<span className="mpoCount">{active.length} need{active.length===1?'s':''} your response</span>}</div>
      {message&&<div ref={statusRef} tabIndex={-1} className="mpoStatus mpoSuccess" role="status" aria-live="polite">{message}</div>}
      {error&&<div className="mpoStatus mpoError" role="alert">{error}</div>}
      <div className="mpoList">
        {offers.map(offer=>{const project=projectOf(offer);const state=displayStatus(offer,now);const pending=state==='pending';const partner=project?.project_type==='partner';return <article className={`mpoCard mpo-${state}`} key={offer.id} aria-label={`${statusLabel(state)} for ${project?.title||'Mettelo project'}`}>
          <div className="mpoCardHead"><div><span className="mpoState">{statusLabel(state)}</span><h3>{project?.title||'Mettelo project'}</h3><p className="mpoProjectType">{partner?'Partner Project':'Mettelo Open Project'}{partner&&project?.partner_name?` · Partner organisation: ${project.partner_name}`:''}</p></div><small>Offered {dateTime(offer.offered_at)}</small></div>
          <div className="mpoExpiry" aria-label={`Accept by ${dateTime(offer.expires_at)}`}><span>ACCEPT BY</span><strong>{dateTime(offer.expires_at)}</strong></div>
          <div className="mpoGrid">
            <div><span>Commitment</span><strong>{project?.weekly_commitment||'See project expectations'}</strong></div>
            <div><span>Duration</span><strong>{project?.duration_weeks?`${project.duration_weeks} weeks`:'Defined in the project brief'}</strong></div>
            <div><span>Participation mode</span><strong>{participationLabel(project?.participation_mode)}</strong></div>
            <div><span>Team state</span><strong>{teamCopy(offer)}</strong></div>
            <div><span>Expected start</span><strong>{dateTime(project?.kickoff_at||null)}</strong></div>
            <div><span>Participation expectations</span><strong>Commit to the stated time, collaborate responsibly, keep project work and evidence current, and follow the project participation terms.</strong></div>
          </div>
          {pending?<><p className="mpoDecisionCopy"><strong>If you accept:</strong> your commitment is recorded and moves into team formation/readiness; the project does not start and private Lab access does not open yet. <strong>If you decline:</strong> the offer closes and the reserved place is released.</p><div className="mpoActions"><button className="mpoButton mpoDark" type="button" disabled={working===offer.id} onClick={event=>openAction(offer,'accept',event.currentTarget)}>Accept place</button><button className="mpoButton" type="button" disabled={working===offer.id} onClick={event=>openAction(offer,'decline',event.currentTarget)}>Decline</button></div></>:<p className="mpoResolved">{state==='accepted'?'Place accepted. Your commitment is recorded; team formation and start readiness remain separate governed steps.':state==='declined'?'This offer is closed and its reserved capacity has been released.':'Offer expired. This offer is read-only and its reserved capacity is released.'} <a href="/member/discover">Discover projects</a></p>}
        </article>})}
      </div>
      {resolved.length>0&&active.length===0&&<p className="mpoQuiet">No project offer currently needs your response. <a href="/member/discover">Return to Discover</a>.</p>}
    </section>

    <dialog className="mpoDialog" ref={dialogRef} onClose={()=>{setPendingAction(null);window.requestAnimationFrame(()=>openerRef.current?.isConnected&&openerRef.current.focus())}} aria-labelledby="mpo-dialog-title" aria-describedby="mpo-dialog-description">
      {pendingAction&&<><div className="mpoDialogHead"><div><div className="mpoEyebrow">CONFIRM RESPONSE</div><h2 id="mpo-dialog-title">{pendingAction.action==='accept'?'Accept this project place?':'Decline this project place?'}</h2></div><button className="mpoClose" type="button" aria-label="Close offer response dialog" onClick={()=>closeDialog()}>×</button></div><div className="mpoDialogBody"><p id="mpo-dialog-description">{pendingAction.action==='accept'?`You are confirming that you want to take the offered place on ${projectOf(pendingAction.offer)?.title||'this project'}. This records your commitment; it does not start the project or unlock the private workspace yet.`:`Declining closes this offer and releases its reserved place. It does not affect your profile, Proof, skills, readiness or unrelated Mettelo activity.`}</p><div className="mpoActions"><button className="mpoButton" type="button" disabled={working===pendingAction.offer.id} onClick={()=>closeDialog()}>Go back</button><button className={`mpoButton ${pendingAction.action==='accept'?'mpoDark':'mpoDanger'}`} type="button" disabled={working===pendingAction.offer.id} onClick={()=>void respond(pendingAction.offer,pendingAction.action)}>{working===pendingAction.offer.id?'Saving…':pendingAction.action==='accept'?'Confirm acceptance':'Confirm decline'}</button></div></div></>}
    </dialog>
    <style jsx global>{styles}</style>
  </>;
}

const styles=`
.mpoPanel{margin:22px 0;padding:22px;border:1px solid #e7e1d6;border-radius:20px;background:#fff;color:#10131d;min-width:0}.mpoHead{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.mpoHead h2,.mpoPanel>h2{margin:4px 0 7px;font-size:clamp(1.35rem,2vw,1.8rem)}.mpoHead p,.mpoPanel>p{margin:0;color:#5b6472;max-width:760px;line-height:1.6}.mpoEyebrow{font-family:var(--font-mono),monospace;font-size:11px;font-weight:800;letter-spacing:.09em;color:#8b5a17}.mpoCount{display:inline-flex;align-items:center;min-height:32px;padding:0 10px;border-radius:999px;background:#f7efdd;color:#6f4b16;font-size:12px;font-weight:800;white-space:nowrap}.mpoList{display:grid;gap:14px;margin-top:18px}.mpoCard{padding:18px;border:1px solid #e7e1d6;border-radius:14px;background:#fcfbf7;min-width:0;overflow-wrap:anywhere}.mpoCardHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.mpoCardHead h3{margin:6px 0 0;font-size:1.08rem}.mpoCardHead small{color:#5b6472}.mpoProjectType{margin:6px 0 0;color:#5b6472;font-size:12px;line-height:1.5}.mpoState{display:inline-flex;font-size:12px;font-weight:800;color:#2356a8}.mpo-accepted .mpoState{color:#157347}.mpo-declined .mpoState,.mpo-expired .mpoState{color:#5b6472}.mpoExpiry{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:baseline;margin-top:14px;padding:11px 12px;border:1px solid #e3d4b9;border-radius:10px;background:#fbf7ee}.mpoExpiry span{font-family:var(--font-mono),monospace;font-size:10px;font-weight:850;letter-spacing:.08em;color:#7a551d}.mpoExpiry strong{font-size:13px}.mpoGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}.mpoGrid>div{min-width:0;padding:12px;border:1px solid #eee8dd;border-radius:10px;background:#fff}.mpoGrid span{display:block;margin-bottom:5px;font-family:var(--font-mono),monospace;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7a808a}.mpoGrid strong{display:block;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.mpoDecisionCopy{margin:14px 0 0;color:#4f5967;font-size:13px;line-height:1.65}.mpoActions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}.mpoButton{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#10131d;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.mpoButton:disabled{cursor:not-allowed;opacity:.6}.mpoButton:focus-visible,.mpoClose:focus-visible,.mpoStatus:focus-visible{outline:3px solid #2356a8;outline-offset:3px}.mpoDark{background:#10131d;border-color:#10131d;color:#fff}.mpoDanger{background:#a53a3a;border-color:#a53a3a;color:#fff}.mpoResolved,.mpoQuiet{margin:14px 0 0;color:#5b6472;line-height:1.55}.mpoResolved a,.mpoQuiet a{font-weight:800;color:#2356a8}.mpoStatus{margin:16px 0 0;padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.5}.mpoSuccess{background:#eef8f2;color:#155c3a;border:1px solid #b7dec7}.mpoError{background:#fff4f4;color:#7b2626;border-color:#dfb5b5}.mpoDialog{width:min(94vw,560px);max-height:88dvh;padding:0;border:1px solid #d8d2c8;border-radius:18px;background:#fff;color:#10131d;box-shadow:0 24px 80px rgba(16,19,29,.24)}.mpoDialog::backdrop{background:rgba(16,19,29,.56)}.mpoDialogHead{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:20px 20px 14px;border-bottom:1px solid #eee8dd}.mpoDialogHead h2{margin:5px 0 0;font-size:1.3rem}.mpoDialogBody{padding:20px}.mpoDialogBody p{margin:0;color:#4f5967;line-height:1.65}.mpoClose{width:44px;height:44px;border:1px solid #d4d7dc;border-radius:10px;background:#fff;color:#10131d;font-size:24px;cursor:pointer}.mpoDialog .mpoActions{justify-content:flex-end}.mpoQuiet{font-size:13px}
@media(max-width:1024px){.mpoGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:480px){.mpoPanel{padding:16px;border-radius:14px}.mpoHead,.mpoCardHead{display:grid}.mpoCount{justify-self:start;white-space:normal}.mpoGrid{grid-template-columns:minmax(0,1fr)}.mpoActions{display:grid;grid-template-columns:1fr}.mpoButton{width:100%}.mpoDialog{width:calc(100vw - 24px)}.mpoDialog .mpoActions{grid-template-columns:1fr}.mpoCardHead small{font-size:12px}}
@media(max-width:340px){.mpoPanel{padding:13px}.mpoCard{padding:14px}.mpoDialog{width:calc(100vw - 16px)}.mpoDialogHead,.mpoDialogBody{padding:16px}}
@media(prefers-reduced-motion:reduce){.mpoDialog{scroll-behavior:auto}}
`;
