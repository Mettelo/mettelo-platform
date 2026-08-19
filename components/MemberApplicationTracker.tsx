'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

type AppEvent={id:string;application_id:string;from_status:string|null;to_status:string;created_at:string};
type Formation={filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null;forming_deadline:string|null;run_number:number|null};
type Application={id:string;status:string;submitted_at:string;updated_at:string;project_id:string;project_run_id?:string|null;application_kind?:string;requested_role?:string|null;projects:{title:string;status?:string;project_type?:string}|null;project_roles:{title:string}|null;formation?:Formation|null;events?:AppEvent[]};
type ViewState='current'|'needs'|'closed'|'all';
type CardState='review'|'forming'|'confirmed'|'paused'|'closed';

const labels:Record<string,string>={submitted:'Submitted',in_review:'In review',shortlisted:'Shortlisted',approved:'Team forming',accepted:'Team forming',waiting_for_team:'Team forming',team_complete:'Project confirmed',declined:'Not selected',withdrawn:'Withdrawn'};
const reviewStates=new Set(['submitted','in_review','shortlisted']);
const formingStates=new Set(['approved','accepted','waiting_for_team']);
const closedStates=new Set(['declined','withdrawn']);
const withdrawable=new Set(['submitted','in_review','shortlisted','approved','accepted','waiting_for_team']);

function roleOf(item:Application){return item.project_roles?.title||item.requested_role||'Project participant'}
function date(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}
function dateTime(value:string){return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}
function timelineLabel(status:string){return labels[status]||status.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function isPaused(item:Application){return item.formation?.status==='paused'}
function isConfirmed(item:Application){return !isPaused(item)&&(item.status==='team_complete'||item.projects?.status==='active'||item.formation?.status==='active')}
function isForming(item:Application){return isPaused(item)||formingStates.has(item.status)}
function isClosed(item:Application){return closedStates.has(item.status)}
function cardState(item:Application):CardState{if(isClosed(item))return'closed';if(isConfirmed(item))return'confirmed';if(isPaused(item))return'paused';if(isForming(item))return'forming';return'review'}
function statusLabel(item:Application){const state=cardState(item);if(state==='confirmed')return'✓ Project confirmed';if(state==='forming')return'◷ Team forming';if(state==='paused')return'◷ Team paused';if(state==='closed')return timelineLabel(item.status);return'● In review'}
function applicationCopy(item:Application){
  const state=cardState(item);
  if(state==='confirmed')return{body:'Your application has successfully become project work. Ongoing status and access now live in Projects.',sideLabel:'NEXT DESTINATION',sideTitle:'Continue in Projects',sideBody:'Projects is now the source of truth for this work.'};
  if(state==='forming')return{body:'You’ve progressed beyond application review. Mettelo is forming the delivery team before the project becomes active.',sideLabel:'WHAT HAPPENS NEXT',sideTitle:'Mettelo is forming the team',sideBody:'When your team and delivery run are confirmed, this work will move into Projects.'};
  if(state==='paused')return{body:'Your project team is temporarily paused. Mettelo will update you when the delivery plan changes.',sideLabel:'WHAT HAPPENS NEXT',sideTitle:'The team is temporarily paused',sideBody:'There is nothing you need to do while Mettelo reviews the delivery plan.'};
  if(state==='closed')return{body:'This application is closed.',sideLabel:'HISTORY',sideTitle:timelineLabel(item.status),sideBody:'Application history remains available here.'};
  return{body:'Mettelo is reviewing your project application. We’ll update this page when the application changes or if anything is needed from you.',sideLabel:'CURRENT STAGE',sideTitle:'Application review',sideBody:'There is nothing you need to do while review is in progress.'};
}
function timelineFor(item:Application):AppEvent[]{return item.events?.length?item.events:[{id:`submitted-${item.id}`,application_id:item.id,from_status:null,to_status:'submitted',created_at:item.submitted_at}]}
function needsCopy(count:number){if(count===0)return'No applications are waiting for your response';if(count===1)return'One application is waiting for your response';return`${count} applications are waiting for your response`}

export default function MemberApplicationTracker({applications}:{applications:Application[]}){
  const [items,setItems]=useState(applications);
  const [query,setQuery]=useState('');
  const [view,setView]=useState<ViewState>('current');
  const [role,setRole]=useState('all');
  const [working,setWorking]=useState('');
  const [confirming,setConfirming]=useState('');
  const [message,setMessage]=useState('');
  const [historyLimit,setHistoryLimit]=useState(6);
  const [selected,setSelected]=useState<Application|null>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);

  useEffect(()=>{if(selected&&dialogRef.current&&!dialogRef.current.open)dialogRef.current.showModal()},[selected]);

  const roles=useMemo(()=>[...new Set(items.map(roleOf))].sort((a,b)=>a.localeCompare(b)),[items]);
  const counts=useMemo(()=>({
    needs:0,
    review:items.filter(item=>reviewStates.has(item.status)&&!isClosed(item)&&!isConfirmed(item)&&!isForming(item)).length,
    forming:items.filter(item=>isForming(item)&&!isConfirmed(item)).length,
    closed:items.filter(item=>isClosed(item)).length
  }),[items]);

  const filtered=useMemo(()=>items.filter(item=>{
    const haystack=`${item.projects?.title||''} ${roleOf(item)} ${timelineLabel(item.status)}`.toLowerCase();
    const matchesQuery=!query.trim()||haystack.includes(query.trim().toLowerCase());
    const matchesRole=role==='all'||roleOf(item)===role;
    const matchesView=view==='all'||(view==='needs'?false:view==='closed'?isClosed(item):!isClosed(item));
    return matchesQuery&&matchesRole&&matchesView;
  }),[items,query,role,view]);

  const current=filtered.filter(item=>!isClosed(item));
  const closed=filtered.filter(item=>isClosed(item));

  async function withdraw(id:string){
    setWorking(id);setMessage('');
    try{
      const response=await fetch('/api/project-applications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,action:'withdraw'})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to withdraw this application.');
      const now=new Date().toISOString();
      setItems(currentItems=>currentItems.map(item=>item.id===id?{...item,status:'withdrawn',updated_at:now,events:[...(item.events||[]),{id:`local-${now}`,application_id:id,from_status:item.status,to_status:'withdrawn',created_at:now}],formation:body.team_place_released?null:item.formation}:item));
      setConfirming('');setSelected(null);
      if(dialogRef.current?.open)dialogRef.current.close();
      setMessage(body.team_place_released?'Your confirmed team place has been released and the application is now closed.':'Application withdrawn and moved to history.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to withdraw this application.');}
    finally{setWorking('');}
  }

  function reset(){setQuery('');setRole('all');setView('current');setHistoryLimit(6)}
  function openApplication(item:Application){setConfirming('');setSelected(item)}
  function closeDialog(){setConfirming('');dialogRef.current?.close();setSelected(null)}

  if(!items.length)return <>
    <section className="mmaEmpty mmaInitialEmpty" aria-labelledby="no-applications"><h2 id="no-applications">No project applications yet</h2><p>When you apply to a Mettelo project, you’ll track its progress here from submission through confirmation or closure.</p><div className="mmaActions"><a className="mmaBtn mmaPrimary" href="/projects">Discover projects</a><a className="mmaBtn" href="/member/recommended">Recommended</a></div></section>
    <Explore/>
    <style jsx global>{baseStyles}</style>
  </>;

  return <>
    <section className="mmaSummary" aria-label="Project application summary">
      <article className="mmaSummaryCard mmaAttention"><strong>{counts.needs}</strong><span>Needs you</span><small>{needsCopy(counts.needs)}</small></article>
      <article className="mmaSummaryCard"><strong>{counts.review}</strong><span>In review</span><small>{counts.review===1?'Mettelo is reviewing your application':'Mettelo is reviewing your applications'}</small></article>
      <article className="mmaSummaryCard"><strong>{counts.forming}</strong><span>Team forming</span><small>Moving toward confirmed project work</small></article>
      <article className="mmaSummaryCard"><strong>{counts.closed}</strong><span>Closed</span><small>Your retained application history</small></article>
    </section>

    <section className="mmaFilterbar" aria-label="Search and filter project applications">
      <label className="mmaSearchLabel"><span className="mmaSrOnly">Search project applications</span><input className="mmaSearch" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search project applications" aria-label="Search project applications"/></label>
      <div className="mmaSegment" role="group" aria-label="Application lifecycle filter">{(['current','needs','closed','all'] as ViewState[]).map(value=><button key={value} type="button" className={view===value?'mmaActive':''} aria-pressed={view===value} onClick={()=>setView(value)}>{value==='needs'?'Needs action':value.charAt(0).toUpperCase()+value.slice(1)}</button>)}</div>
      <select className="mmaSelect" aria-label="Filter by applied project role" value={role} onChange={event=>setRole(event.target.value)}><option value="all">All roles</option>{roles.map(value=><option value={value} key={value}>{value}</option>)}</select>
    </section>

    {view==='needs'&&<section className="mmaEmpty" aria-live="polite"><h3>Nothing needs your attention</h3><p>There are no project-application actions waiting for you right now.</p></section>}
    {view!=='needs'&&filtered.length===0&&<section className="mmaEmpty" aria-live="polite"><h3>No applications match these filters</h3><p>Try a different state, applied role or search term.</p><button className="mmaBtn mmaPrimary" type="button" onClick={reset}>Clear filters</button></section>}

    {current.length>0&&<section className="mmaSection" aria-labelledby="applications-progress-title">
      <div className="mmaSectionHead"><div><div className="mmaEyebrow">IN PROGRESS</div><h2 id="applications-progress-title">Applications moving forward</h2><p>Passive states stay calm. When nothing is required from you, the page says so clearly.</p></div><span className="mmaCount">{current.length} {current.length===1?'application':'applications'}</span></div>
      <div className="mmaAppList">{current.map(item=><CurrentCard key={item.id} item={item} onOpen={openApplication}/>)}</div>
    </section>}

    {closed.length>0&&<section className="mmaSection" aria-labelledby="application-history-title">
      <div className="mmaSectionHead"><div><div className="mmaEyebrow">APPLICATION HISTORY</div><h2 id="application-history-title">Closed applications</h2><p>Resolved applications remain available without competing visually with current work.</p></div><span className="mmaCount">{closed.length} {closed.length===1?'application':'applications'}</span></div>
      <div className="mmaAppList">{closed.slice(0,historyLimit).map(item=><HistoryCard key={item.id} item={item} onOpen={openApplication}/>)}</div>
      {closed.length>historyLimit&&<button className="mmaBtn mmaShowMore" type="button" onClick={()=>setHistoryLimit(value=>value+6)}>Show more history</button>}
    </section>}

    <Explore/>
    <div className="mmaFormStatus" role="status" aria-live="polite">{message}</div>

    <dialog className="mmaDialog" ref={dialogRef} onClose={()=>setSelected(null)} aria-labelledby="mma-dialog-title">
      {selected&&<>
        <div className="mmaDialogHead"><div><div className="mmaEyebrow">PROJECT APPLICATION</div><h2 id="mma-dialog-title">{selected.projects?.title||'Application'}</h2></div><button className="mmaDialogClose" type="button" aria-label="Close application detail" onClick={closeDialog}>×</button></div>
        <div className="mmaDialogBody">
          <div className="mmaDetailGrid">
            <div className="mmaDetail"><small>Current state</small><strong>{statusLabel(selected).replace(/^[✓●◷]\s*/,'')}</strong></div>
            <div className="mmaDetail"><small>Applied project role</small><strong>{roleOf(selected)}</strong></div>
            <div className="mmaDetail"><small>Application date</small><strong>{date(selected.submitted_at)}</strong></div>
            <div className="mmaDetail"><small>What happens next</small><strong>{applicationCopy(selected).sideBody}</strong></div>
            {selected.formation&&selected.formation.threshold>0&&<div className="mmaDetail"><small>Team formation</small><strong>{Math.min(selected.formation.filled,selected.formation.threshold)} of {selected.formation.threshold} places filled</strong></div>}
          </div>
          <section className="mmaTimeline" aria-labelledby="mma-timeline-title"><h3 id="mma-timeline-title">Application history</h3><ol>{timelineFor(selected).map((event,index,array)=><li className={index===array.length-1?'mmaCurrentEvent':''} key={event.id}><strong>{timelineLabel(event.to_status)}</strong><small>{dateTime(event.created_at)}</small></li>)}</ol></section>
          {confirming===selected.id&&<div className="mmaConfirmBox" role="group" aria-label="Confirm application withdrawal"><p>{isForming(selected)?'Release this confirmed place? Your team capacity will be released and the application will close.':'Withdraw this application? Mettelo will stop progressing it for this project.'}</p><div className="mmaActions"><button className="mmaBtn" type="button" disabled={working===selected.id} onClick={()=>setConfirming('')}>Keep application</button><button className="mmaBtn mmaDanger" type="button" disabled={working===selected.id} onClick={()=>withdraw(selected.id)}>{working===selected.id?'Working…':'Confirm withdrawal'}</button></div></div>}
        </div>
        <div className="mmaDialogActions">{withdrawable.has(selected.status)&&!isConfirmed(selected)&&!isPaused(selected)&&confirming!==selected.id&&<button className="mmaTextButton" type="button" onClick={()=>setConfirming(selected.id)}>{isForming(selected)?'Release my place':'Withdraw application'}</button>}<button className="mmaBtn" type="button" onClick={closeDialog}>Close</button></div>
      </>}
    </dialog>

    <style jsx global>{baseStyles}</style>
  </>;
}

function CurrentCard({item,onOpen}:{item:Application;onOpen:(item:Application)=>void}){
  const state=cardState(item);const copy=applicationCopy(item);const confirmed=state==='confirmed';const forming=state==='forming';const paused=state==='paused';
  const cardClass=['mmaApplicationCard',forming?'mmaForming':'',confirmed?'mmaConfirmed':'',paused?'mmaPaused':''].filter(Boolean).join(' ');
  const statusClass=['mmaStatus',state==='review'?'mmaReview':forming?'mmaFormingStatus':confirmed?'mmaConfirmedStatus':'mmaPausedStatus'].join(' ');
  return <article className={cardClass}>
    <div className="mmaCardMain">
      <span className={statusClass}>{statusLabel(item)}</span>
      <h3>{item.projects?.title||'Mettelo project'}</h3>
      <p>{copy.body}</p>
      <div className="mmaMeta">
        <span>{confirmed?'Your role':'Applied as'} {roleOf(item)}</span>
        <span>{confirmed?'Confirmed':item.application_kind==='interest'?'Registered':'Applied'} {date(confirmed?item.updated_at:item.submitted_at)}</span>
        {forming&&<span>Team not yet confirmed</span>}
      </div>
      {!confirmed&&<div className="mmaNoAction"><span aria-hidden="true">✓</span> {paused?'No action needed while the team is paused':forming?'No action needed right now':'No action needed'}</div>}
      {confirmed&&<div className="mmaHandoff"><span className="mmaHandoffIcon" aria-hidden="true">→</span><div><strong>This application has handed off to Projects</strong><p>Application history remains here. Delivery now belongs in Projects, then Mettelo Lab when ready.</p></div></div>}
    </div>
    <aside className="mmaActionbox" aria-label={`Actions for ${item.projects?.title||'project application'}`}>
      <small>{copy.sideLabel}</small><strong>{copy.sideTitle}</strong><p>{copy.sideBody}</p>
      <div className="mmaActions">{confirmed&&<a className="mmaBtn mmaPrimary" href="/member/projects">Open in Projects →</a>}<button className="mmaBtn" type="button" onClick={()=>onOpen(item)}>{confirmed?'View history':'View application'}</button></div>
    </aside>
  </article>;
}

function HistoryCard({item,onOpen}:{item:Application;onOpen:(item:Application)=>void}){
  return <article className="mmaHistoryCard"><div><span className="mmaStatus">{timelineLabel(item.status)}</span><h3>{item.projects?.title||'Mettelo project'}</h3><p>{roleOf(item)} · {item.status==='withdrawn'?'Withdrawn':'Closed'} {date(item.updated_at)}</p></div><button className="mmaBtn" type="button" onClick={()=>onOpen(item)}>View application</button></article>;
}

function Explore(){return <section className="mmaExplore" id="explore" aria-labelledby="mma-explore-title"><div><div className="mmaEyebrow">EXPLORE &amp; GROW</div><h2 id="mma-explore-title">Looking for another project?</h2><p>Discover gives you the full project catalogue. Recommended gives you projects matched to your profile. Careers remains a separate recruitment journey.</p></div><div className="mmaActions"><a className="mmaBtn mmaPrimary" href="/projects">Discover projects</a><a className="mmaBtn" href="/member/recommended">Recommended</a></div></section>}

const baseStyles=`
.mmaSrOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.mmaEyebrow{font-family:var(--font-plex-mono),ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;text-transform:uppercase;letter-spacing:.11em;font-size:10px;line-height:1.3;font-weight:700;color:#72551e}
.mmaBtn{min-height:44px;padding:0 15px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.mmaBtn.mmaPrimary{background:#111318;border-color:#111318;color:#fff}.mmaBtn[disabled]{opacity:.55;cursor:not-allowed}.mmaBtn:focus-visible,.mmaTextButton:focus-visible,.mmaSearch:focus-visible,.mmaSelect:focus-visible,.mmaSegment button:focus-visible,.mmaDialogClose:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
.mmaSummary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0 16px}.mmaSummaryCard{background:#fff;border:1px solid #d8dde3;border-radius:14px;padding:16px 17px;min-height:105px}.mmaSummaryCard.mmaAttention{background:#fffaf0;border-color:#e8cf91}.mmaSummaryCard strong{display:block;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:28px;line-height:1;font-weight:800}.mmaSummaryCard span{display:block;font-size:13px;font-weight:800;margin-top:7px}.mmaSummaryCard small{display:block;font-size:11px;color:#68727d;line-height:1.4;margin-top:4px}
.mmaFilterbar{background:#fff;border:1px solid #d8dde3;border-radius:14px;padding:12px;display:grid;grid-template-columns:minmax(260px,1fr) auto 180px;gap:10px;align-items:center;margin-bottom:32px}.mmaSearch,.mmaSelect{width:100%;height:44px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;padding:0 12px;font:inherit}.mmaSegment{display:flex;padding:3px;border-radius:10px;background:#f1f2ef}.mmaSegment button{min-height:38px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#5d6671;font:inherit;font-weight:800;font-size:12px;cursor:pointer}.mmaSegment button.mmaActive{background:#fff;color:#111318;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.mmaSection{margin-top:32px}.mmaSectionHead{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:13px}.mmaSectionHead h2{margin:5px 0 4px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:28px;line-height:1.08;letter-spacing:-.026em}.mmaSectionHead p{margin:0;max-width:720px;color:#68727d;font-size:12.5px;line-height:1.55}.mmaCount{font-size:11px;color:#68727d;white-space:nowrap}.mmaAppList{display:grid;gap:13px}
.mmaApplicationCard{background:#fff;border:1px solid #d8dde3;border-radius:16px;padding:19px;display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:24px;min-width:0}.mmaApplicationCard.mmaForming{background:linear-gradient(135deg,#fff,#fffcf6)}.mmaApplicationCard.mmaConfirmed{background:linear-gradient(135deg,#fff,#f6fbf8);border-color:#bedac8}.mmaApplicationCard.mmaPaused{background:linear-gradient(135deg,#fff,#fffaf0);border-color:#e8cf91}.mmaStatus{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:850;background:#eef1f4;color:#4f5965}.mmaStatus.mmaReview{background:#eef4fb;color:#244f8f}.mmaStatus.mmaFormingStatus,.mmaStatus.mmaPausedStatus{background:#fff2cb;color:#6b4b0b}.mmaStatus.mmaConfirmedStatus{background:#edf8f1;color:#185b3c}.mmaCardMain h3{margin:10px 0 7px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:22px;line-height:1.16;letter-spacing:-.025em}.mmaCardMain>p{margin:0;color:#68727d;font-size:12.7px;line-height:1.58}.mmaMeta{display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}.mmaMeta span{padding:6px 9px;border-radius:999px;background:#eef1f4;color:#46515e;font-size:10px;font-weight:800}.mmaNoAction{margin-top:13px;width:max-content;max-width:100%;display:inline-flex;align-items:center;gap:8px;padding:10px 11px;border:1px solid #e1e4e8;border-radius:10px;background:#f7f7f5;color:#505a66;font-size:12px;font-weight:700}.mmaActionbox{border-left:1px solid #d8dde3;padding-left:20px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.mmaActionbox>small{font-family:var(--font-plex-mono),ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:700;color:#74571e;letter-spacing:.08em;text-transform:uppercase}.mmaActionbox>strong{display:block;font-size:15px;margin:7px 0 5px}.mmaActionbox>p{margin:0;color:#68727d;font-size:11.5px;line-height:1.5}.mmaActions{display:flex;gap:9px;flex-wrap:wrap}.mmaActionbox .mmaActions{margin-top:14px}.mmaHandoff{margin-top:14px;display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;align-items:start;padding:12px 13px;border:1px solid #d5e7dc;border-radius:11px;background:#f1f7f3}.mmaHandoffIcon{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:#dcefe4;color:#155b39;font-weight:900}.mmaHandoff strong{font-size:12px}.mmaHandoff p{margin:3px 0 0;font-size:11px;color:#587063}
.mmaHistoryCard{background:#fff;border:1px solid #d8dde3;border-radius:14px;padding:15px 17px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}.mmaHistoryCard h3{margin:7px 0 4px;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:17px}.mmaHistoryCard p{margin:0;color:#68727d;font-size:11.5px}.mmaShowMore{margin-top:13px}
.mmaExplore{margin-top:32px;background:#e9e3d7;border:1px solid #d6cebd;border-radius:16px;padding:20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center}.mmaExplore h2{margin:5px 0;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:23px}.mmaExplore p{margin:0;color:#444d57;line-height:1.55;font-size:13px}
.mmaEmpty{display:block;margin-top:24px;background:#fff;border:1px dashed #b8c0c9;border-radius:14px;padding:20px}.mmaEmpty h2,.mmaEmpty h3{margin:0 0 6px;font-size:18px}.mmaEmpty p{margin:0 0 14px;color:#68727d}.mmaInitialEmpty{margin-top:20px}.mmaFormStatus{min-height:24px;margin-top:12px;color:#4f5965;font-size:12px}
.mmaDialog{border:0;border-radius:18px;width:min(760px,calc(100vw - 28px));max-height:88vh;padding:0;color:#111318;background:#fff;box-shadow:0 18px 46px rgba(17,19,24,.13)}.mmaDialog::backdrop{background:rgba(16,19,29,.48)}.mmaDialogHead{padding:20px 22px;border-bottom:1px solid #d8dde3;display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.mmaDialogHead h2{margin:5px 0 0;font-family:var(--font-space-grotesk),Inter,sans-serif;font-size:24px;letter-spacing:-.02em}.mmaDialogClose{width:44px;height:44px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;font:inherit;font-size:1.25rem;cursor:pointer}.mmaDialogBody{padding:22px}.mmaDetailGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mmaDetail{border:1px solid #d8dde3;border-radius:12px;padding:14px}.mmaDetail small{display:block;font-size:10px;color:#68727d;text-transform:uppercase;letter-spacing:.06em}.mmaDetail strong{display:block;margin-top:5px;font-size:13px}.mmaTimeline{margin-top:22px}.mmaTimeline h3{font-size:18px;margin:0 0 10px}.mmaTimeline ol{list-style:none;margin:0;padding:0}.mmaTimeline li{position:relative;padding:0 0 18px 28px}.mmaTimeline li::before{content:"";position:absolute;left:6px;top:5px;width:10px;height:10px;border-radius:50%;background:#a9b0b8;border:3px solid #fff;box-shadow:0 0 0 1px #a9b0b8}.mmaTimeline li::after{content:"";position:absolute;left:10px;top:18px;bottom:0;width:1px;background:#d7dce2}.mmaTimeline li:last-child::after{display:none}.mmaTimeline li.mmaCurrentEvent::before{background:#10131d;box-shadow:0 0 0 1px #10131d}.mmaTimeline strong{display:block;font-size:13px}.mmaTimeline small{color:#68727d;font-size:11px}.mmaDialogActions{padding:16px 22px;border-top:1px solid #d8dde3;display:flex;align-items:center;justify-content:flex-end;gap:12px}.mmaTextButton{min-height:44px;padding:0;border:0;background:transparent;color:#4f5965;text-decoration:underline;font:inherit;font-size:12px;font-weight:750;cursor:pointer;margin-right:auto}.mmaConfirmBox{margin-top:20px;padding:14px;border:1px solid #e8cf91;border-radius:12px;background:#fff7e6}.mmaConfirmBox p{margin:0 0 12px;color:#5f4310;font-size:12px;line-height:1.5}.mmaDanger{border-color:#8c2f2f!important;color:#7d2424!important;background:#fff!important}
@media(max-width:1024px){.mmaSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.mmaFilterbar{grid-template-columns:1fr 1fr}.mmaSearchLabel{grid-column:1/-1}.mmaApplicationCard{grid-template-columns:1fr}.mmaActionbox{border-left:0;border-top:1px solid #d8dde3;padding:15px 0 0}.mmaExplore{grid-template-columns:1fr}}
@media(max-width:480px){.mmaSummary{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px}.mmaSummaryCard{min-height:94px;padding:12px}.mmaSummaryCard strong{font-size:24px}.mmaSummaryCard span{font-size:12px}.mmaSummaryCard small{font-size:10px}.mmaFilterbar{grid-template-columns:1fr;padding:10px;gap:8px;margin-bottom:24px}.mmaSearchLabel{grid-column:auto}.mmaSegment{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.mmaSegment button{min-height:44px;padding:0 4px;font-size:10.5px}.mmaSection{margin-top:25px}.mmaSectionHead{align-items:flex-start}.mmaSectionHead h2{font-size:23px}.mmaSectionHead p{font-size:12px}.mmaCount{display:none}.mmaApplicationCard{grid-template-columns:1fr;gap:14px;padding:15px}.mmaCardMain h3{font-size:19px}.mmaMeta{display:grid;grid-template-columns:1fr;gap:6px}.mmaMeta span{border-radius:8px;padding:7px 9px}.mmaActionbox{border-left:0;border-top:1px solid #d8dde3;padding:14px 0 0}.mmaActionbox .mmaActions{width:100%;display:grid;grid-template-columns:1fr}.mmaActionbox .mmaBtn{width:100%}.mmaHistoryCard{grid-template-columns:1fr;padding:15px}.mmaHistoryCard .mmaBtn{width:100%}.mmaExplore{grid-template-columns:1fr;padding:16px;margin-top:26px}.mmaExplore .mmaActions{display:grid;grid-template-columns:1fr}.mmaExplore .mmaBtn{width:100%}.mmaDetailGrid{grid-template-columns:1fr}.mmaDialogHead,.mmaDialogBody,.mmaDialogActions{padding-left:16px;padding-right:16px}.mmaDialogActions{align-items:stretch;flex-direction:column}.mmaTextButton{margin-right:0;align-self:flex-start}.mmaConfirmBox .mmaActions{display:grid;grid-template-columns:1fr}.mmaConfirmBox .mmaBtn{width:100%}}
@media(prefers-reduced-motion:reduce){.mmaDialog,.mmaBtn,.mmaSegment button{transition:none}}
`;
