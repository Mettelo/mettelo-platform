'use client';

import {useMemo,useState} from 'react';

type AppEvent={id:string;application_id:string;from_status:string|null;to_status:string;created_at:string};
type Formation={filled:number;threshold:number;status:string;is_full:boolean;kickoff_at:string|null;forming_deadline:string|null;run_number:number|null};
type Application={id:string;status:string;submitted_at:string;updated_at:string;project_id:string;project_run_id?:string|null;application_kind?:string;requested_role?:string|null;projects:{title:string;status?:string;project_type?:string}|null;project_roles:{title:string}|null;formation?:Formation|null;events?:AppEvent[]};
type ViewState='current'|'needs'|'closed'|'all';

const labels:Record<string,string>={submitted:'Submitted',in_review:'In review',shortlisted:'Shortlisted',approved:'Team forming',accepted:'Team forming',waiting_for_team:'Team forming',team_complete:'Project confirmed',declined:'Not selected',withdrawn:'Withdrawn'};
const inProgress=new Set(['submitted','in_review','shortlisted']);
const formingStates=new Set(['approved','accepted','waiting_for_team']);
const closedStates=new Set(['declined','withdrawn']);
const withdrawable=new Set(['submitted','in_review','shortlisted','approved','accepted','waiting_for_team']);

function roleOf(item:Application){return item.project_roles?.title||item.requested_role||'Project participant'}
function date(value:string){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value))}
function timelineLabel(status:string){return labels[status]||status.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase())}
function isPaused(item:Application){return item.formation?.status==='paused'}
function isConfirmed(item:Application){return !isPaused(item)&&(item.status==='team_complete'||item.projects?.status==='active'||item.formation?.status==='active')}
function isForming(item:Application){return isPaused(item)||formingStates.has(item.status)}
function isClosed(item:Application){return closedStates.has(item.status)}
function description(item:Application){
  if(isConfirmed(item))return{label:'✓ Project confirmed',body:'Your application has successfully become project work. Ongoing project status and access now live in Projects.',next:'Continue from Projects. Mettelo Lab opens there only when your project and run are ready.'};
  if(isPaused(item))return{label:'◷ Team paused',body:'Your confirmed project team is temporarily paused.',next:'No project work is expected right now. Mettelo will update you when the team resumes or the plan changes.'};
  if(isForming(item))return{label:'◷ Team forming',body:'You have progressed beyond application review. Mettelo is forming the delivery team before the project becomes active.',next:'No action needed right now. We will update you when the project is confirmed or if something is needed from you.'};
  if(item.status==='declined')return{label:'Not selected',body:'This application was not selected for the project team.',next:'No action is required. You can continue exploring other projects that fit your skills and availability.'};
  if(item.status==='withdrawn')return{label:'Withdrawn',body:'You withdrew this project application.',next:'No further action is required. You can apply again later if a suitable opportunity is open.'};
  if(item.status==='shortlisted')return{label:'● In review',body:'Your application has progressed beyond the initial review and is still being considered.',next:'No action needed right now. Mettelo will update you when a decision or request is ready.'};
  return{label:'● In review',body:'Your application is being reviewed.',next:'No action needed. Mettelo will update you when the status changes or when something is needed from you.'};
}

export default function MemberApplicationTracker({applications}:{applications:Application[]}){
  const [items,setItems]=useState(applications);
  const [query,setQuery]=useState('');
  const [view,setView]=useState<ViewState>('current');
  const [role,setRole]=useState('all');
  const [working,setWorking]=useState('');
  const [confirming,setConfirming]=useState('');
  const [message,setMessage]=useState('');
  const [historyLimit,setHistoryLimit]=useState(6);

  const roles=useMemo(()=>[...new Set(items.map(roleOf))].sort((a,b)=>a.localeCompare(b)),[items]);
  const counts=useMemo(()=>({
    needs:0,
    review:items.filter(item=>inProgress.has(item.status)).length,
    forming:items.filter(item=>isForming(item)).length,
    closed:items.filter(item=>isClosed(item)).length
  }),[items]);

  const filtered=useMemo(()=>items.filter(item=>{
    const haystack=`${item.projects?.title||''} ${roleOf(item)}`.toLowerCase();
    const matchesQuery=!query.trim()||haystack.includes(query.trim().toLowerCase());
    const matchesRole=role==='all'||roleOf(item)===role;
    const matchesView=view==='all'||(view==='needs'?false:view==='closed'?isClosed(item):!isClosed(item));
    return matchesQuery&&matchesRole&&matchesView;
  }),[items,query,role,view]);

  const progress=filtered.filter(item=>inProgress.has(item.status));
  const forming=filtered.filter(item=>isForming(item)&&!isConfirmed(item));
  const confirmed=filtered.filter(item=>isConfirmed(item));
  const closed=filtered.filter(item=>isClosed(item));
  const hasFilters=Boolean(query.trim()||role!=='all'||view!=='current');

  async function withdraw(id:string){
    setWorking(id);setMessage('');
    try{
      const response=await fetch('/api/project-applications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,action:'withdraw'})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to withdraw this application.');
      const now=new Date().toISOString();
      setItems(current=>current.map(item=>item.id===id?{...item,status:'withdrawn',updated_at:now,events:[...(item.events||[]),{id:`local-${now}`,application_id:id,from_status:item.status,to_status:'withdrawn',created_at:now}],formation:body.team_place_released?null:item.formation}:item));
      setConfirming('');
      setMessage(body.team_place_released?'Your confirmed team place has been released and the application is now closed.':'Application withdrawn and moved to history.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to withdraw this application.');}
    finally{setWorking('');}
  }

  function reset(){setQuery('');setRole('all');setView('current');setHistoryLimit(6)}

  if(!items.length)return <section className="applicationsEmpty" aria-labelledby="no-applications"><h2 id="no-applications">No project applications yet</h2><p>When you apply to a Mettelo project, you’ll track its progress here from submission through confirmation or closure.</p><div><a className="appButton appButtonDark" href="/projects">Discover projects</a><a className="appButton" href="/member/recommended">Recommended</a></div><style jsx>{baseStyles}</style></section>;

  return <>
    <section className="summary" aria-label="Project application summary">
      <article className="attention"><strong>{counts.needs}</strong><span>Needs you</span><small>Required actions only</small></article>
      <article><strong>{counts.review}</strong><span>In review</span><small>No action unless requested</small></article>
      <article><strong>{counts.forming}</strong><span>Team forming</span><small>Confirmed, preparing to start</small></article>
      <article><strong>{counts.closed}</strong><span>Closed</span><small>Your retained application history</small></article>
    </section>

    <section className="filters" aria-label="Search and filter project applications">
      <label className="searchLabel"><span className="srOnly">Search project applications</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search project or applied role" aria-label="Search project applications"/></label>
      <div className="segments" role="group" aria-label="Application lifecycle filter">{(['current','needs','closed','all'] as ViewState[]).map(value=><button key={value} type="button" aria-pressed={view===value} onClick={()=>setView(value)}>{value==='needs'?'Needs action':value.charAt(0).toUpperCase()+value.slice(1)}</button>)}</div>
      <select aria-label="Filter by applied project role" value={role} onChange={event=>setRole(event.target.value)}><option value="all">All applied roles</option>{roles.map(value=><option value={value} key={value}>{value}</option>)}</select>
    </section>

    {view==='needs'&&<section className="quietEmpty" aria-live="polite"><h2>Nothing needs your attention</h2><p>There are no project-application actions waiting for you right now.</p></section>}
    {view!=='needs'&&filtered.length===0&&<section className="quietEmpty" aria-live="polite"><h2>No matching project applications</h2><p>Your current search or filters did not match any project applications.</p><button className="appButton appButtonDark" type="button" onClick={reset}>Clear filters</button></section>}

    {progress.length>0&&<ApplicationSection eyebrow="APPLICATIONS IN PROGRESS" title="In review" description="Mettelo is reviewing these applications. We will update you when the status changes or when something is needed from you." items={progress} render={item=><ApplicationCard item={item} confirming={confirming} working={working} setConfirming={setConfirming} withdraw={withdraw}/>} />}
    {forming.length>0&&<ApplicationSection eyebrow="TEAM FORMING" title="Preparing project teams" description="These applications have progressed beyond review, but delivery has not started yet." items={forming} render={item=><ApplicationCard item={item} confirming={confirming} working={working} setConfirming={setConfirming} withdraw={withdraw}/>} />}
    {confirmed.length>0&&<ApplicationSection eyebrow="PROJECT CONFIRMED" title="Continue in Projects" description="These applications have become confirmed project work. Applications keeps the history; Projects is now the source of truth." items={confirmed} render={item=><ApplicationCard item={item} confirming={confirming} working={working} setConfirming={setConfirming} withdraw={withdraw}/>} />}
    {closed.length>0&&<section className="applicationSection historySection" aria-labelledby="application-history-title"><div className="sectionHead"><div><span>APPLICATION HISTORY</span><h2 id="application-history-title">Closed applications</h2><p>Closed project applications stay here as quieter history. Project cancellation is not inferred from an application decision.</p></div><small>{closed.length} closed</small></div><div className="historyList">{closed.slice(0,historyLimit).map(item=><ApplicationCard key={item.id} item={item} confirming={confirming} working={working} setConfirming={setConfirming} withdraw={withdraw}/>)}</div>{closed.length>historyLimit&&<button className="appButton" type="button" onClick={()=>setHistoryLimit(value=>value+6)}>Show more history</button>}</section>}

    {!hasFilters&&<section className="explore"><div><span>EXPLORE & GROW</span><h2>Keep building your project portfolio</h2><p>Discover and Recommended are different journeys: browse the wider project catalogue or focus on opportunities selected for you.</p></div><div><a className="appButton appButtonDark" href="/projects">Discover projects</a><a className="appButton" href="/member/recommended">Recommended</a></div></section>}
    <div className="formStatus" role="status" aria-live="polite">{message}</div>
    <style jsx>{baseStyles}</style>
  </>;
}

function ApplicationSection({eyebrow,title,description,items,render}:{eyebrow:string;title:string;description:string;items:Application[];render:(item:Application)=>React.ReactNode}){
  const id=`applications-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
  return <section className="applicationSection" aria-labelledby={id}><div className="sectionHead"><div><span>{eyebrow}</span><h2 id={id}>{title}</h2><p>{description}</p></div><small>{items.length} {items.length===1?'application':'applications'}</small></div><div className="applicationList">{items.map(item=><div key={item.id}>{render(item)}</div>)}</div></section>;
}

function ApplicationCard({item,confirming,working,setConfirming,withdraw}:{item:Application;confirming:string;working:string;setConfirming:(id:string)=>void;withdraw:(id:string)=>void}){
  const state=description(item);const formation=item.formation;const confirmed=isConfirmed(item);const forming=isForming(item)&&!confirmed;const closed=isClosed(item);const canWithdraw=withdrawable.has(item.status)&&!confirmed&&!isPaused(item);const timeline=item.events?.length?item.events:[{id:`submitted-${item.id}`,application_id:item.id,from_status:null,to_status:'submitted',created_at:item.submitted_at}];const expected=forming&&formation?.forming_deadline?date(formation.forming_deadline):null;
  return <article className={`applicationCard ${confirmed?'confirmed':''} ${forming?'forming':''} ${closed?'closed':''}`}>
    <div className="cardMain"><span className="status">{state.label}</span><h3>{item.projects?.title||'Mettelo project'}</h3><p>{state.body}</p><div className="meta"><span>Applied role: {roleOf(item)}</span><span>{item.application_kind==='interest'?'Registered':'Applied'} {date(item.submitted_at)}</span>{expected&&<span>Formation target: {expected}</span>}</div>{!closed&&!confirmed&&<div className="noAction"><span aria-hidden="true">✓</span><strong>{state.next}</strong></div>}{confirmed&&<div className="handoff"><span aria-hidden="true">✓</span><div><strong>Project confirmed</strong><p>{state.next}</p></div></div>}{forming&&formation&&formation.threshold>0&&<div className="formation"><strong>{formation.run_number?`Team ${formation.run_number} formation`:'Team formation'}</strong><span>{Math.min(formation.filled,formation.threshold)} of {formation.threshold} places filled</span><small>This count is limited to your assigned project run.</small></div>}</div>
    <aside className="cardActions" aria-label={`Actions for ${item.projects?.title||'project application'}`}><small>{confirmed?'CONTINUE':closed?'HISTORY':'CURRENT STATE'}</small><strong>{confirmed?'Your project now lives in Projects':closed?timelineLabel(item.status):'No action needed right now'}</strong><div className="actions">{confirmed&&<a className="appButton appButtonDark" href="/member/projects">Open in Projects</a>}<details className="timeline"><summary className="appButton">View application{closed?'':' history'}</summary><ol>{timeline.map(event=><li key={event.id}><strong>{timelineLabel(event.to_status)}</strong><span>{new Date(event.created_at).toLocaleString('en-GB')}</span></li>)}</ol></details>{canWithdraw&&confirming!==item.id&&<button className="textButton" type="button" onClick={()=>setConfirming(item.id)}>{forming?'Release my place':'Withdraw application'}</button>}</div>{confirming===item.id&&<div className="confirmBox" role="group" aria-label="Confirm application withdrawal"><p>{forming?'Release this confirmed place? Your team capacity will be released and the application will close.':'Withdraw this application? Mettelo will stop progressing it for this project.'}</p><div><button className="appButton" type="button" disabled={working===item.id} onClick={()=>setConfirming('')}>Keep application</button><button className="appButton danger" type="button" disabled={working===item.id} onClick={()=>withdraw(item.id)}>{working===item.id?'Working…':'Confirm withdrawal'}</button></div></div>}</aside>
  </article>;
}

const baseStyles=`
.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:20px 0 16px}.summary article{min-height:105px;padding:16px 17px;border:1px solid #d8dde3;border-radius:14px;background:#fff}.summary .attention{background:#fffaf0;border-color:#e8cf91}.summary strong{display:block;font-size:1.75rem;line-height:1}.summary span{display:block;margin-top:7px;font-size:.8125rem;font-weight:800}.summary small{display:block;margin-top:4px;color:#68727d;font-size:.6875rem;line-height:1.4}
.filters{display:grid;grid-template-columns:minmax(260px,1fr) auto 190px;gap:10px;align-items:center;margin-bottom:32px;padding:12px;border:1px solid #d8dde3;border-radius:14px;background:#fff}.filters input,.filters select{width:100%;height:44px;padding:0 12px;border:1px solid #b8c0c9;border-radius:9px;background:#fff;color:#111318;font:inherit}.segments{display:flex;padding:3px;border-radius:10px;background:#f1f2ef}.segments button{min-height:38px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:#5d6671;font-weight:800}.segments button[aria-pressed="true"]{background:#fff;color:#111318;box-shadow:0 1px 3px rgba(0,0,0,.08)}.filters input:focus-visible,.filters select:focus-visible,.segments button:focus-visible,.appButton:focus-visible,.textButton:focus-visible,.timeline summary:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
.applicationSection{margin-top:32px}.sectionHead{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:13px}.sectionHead>div>span,.explore>div>span{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:800;letter-spacing:.1em;color:#72551e}.sectionHead h2{margin:5px 0 4px;font-size:1.75rem;line-height:1.08;letter-spacing:-.026em}.sectionHead p{max-width:720px;margin:0;color:#68727d;font-size:.78rem;line-height:1.55}.sectionHead>small{color:#68727d;white-space:nowrap}.applicationList,.historyList{display:grid;gap:13px}
.applicationCard{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:24px;padding:19px;border:1px solid #d8dde3;border-radius:16px;background:#fff;min-width:0}.applicationCard.forming{background:linear-gradient(135deg,#fff,#fffcf6)}.applicationCard.confirmed{border-color:#bedac8;background:linear-gradient(135deg,#fff,#f6fbf8)}.applicationCard.closed{background:#fbfbfa}.status{display:inline-flex;min-height:30px;align-items:center;padding:5px 10px;border-radius:999px;background:#eef1f4;color:#3f4955;font-size:.7rem;font-weight:850}.cardMain h3{margin:10px 0 7px;font-size:1.4rem;line-height:1.16;letter-spacing:-.025em}.cardMain>p{margin:0;color:#68727d;font-size:.8rem;line-height:1.58}.meta{display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}.meta span{padding:6px 9px;border-radius:999px;background:#eef1f4;color:#46515e;font-size:.68rem;font-weight:800}.noAction,.handoff,.formation{margin-top:13px;padding:11px 12px;border:1px solid #e1e4e8;border-radius:10px;background:#f7f7f5;color:#505a66;font-size:.75rem;line-height:1.5}.noAction{display:flex;gap:8px;align-items:flex-start}.handoff{display:grid;grid-template-columns:26px minmax(0,1fr);gap:10px;background:#f1f7f3;border-color:#d5e7dc}.handoff p{margin:3px 0 0;color:#587063}.formation{display:grid;grid-template-columns:1fr auto;gap:5px;background:#fff9e9;border-color:#ead79c}.formation small{grid-column:1/-1;color:#68727d}
.cardActions{display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding-left:20px;border-left:1px solid #d8dde3}.cardActions>small{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;font-weight:800;letter-spacing:.08em;color:#72551e}.cardActions>strong{margin:7px 0 5px;font-size:.92rem}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.appButton{min-height:44px;padding:0 14px;border:1px solid #b8c0c9;border-radius:10px;background:#fff;color:#111318;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.appButtonDark{background:#111318;border-color:#111318;color:#fff}.danger{border-color:#8c2f2f;color:#7d2424;background:#fff}.textButton{min-height:44px;padding:0;border:0;background:transparent;color:#4f5965;text-decoration:underline;font:inherit;font-size:.74rem;font-weight:750;cursor:pointer}.timeline{position:relative}.timeline summary{list-style:none;cursor:pointer}.timeline summary::-webkit-details-marker{display:none}.timeline ol{position:absolute;right:0;z-index:10;width:min(340px,80vw);margin:6px 0 0;padding:10px 12px;list-style:none;border:1px solid #d8dde3;border-radius:10px;background:#fff;box-shadow:0 10px 28px rgba(17,19,24,.12)}.timeline li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #eef0f2;font-size:.7rem}.timeline li:last-child{border-bottom:0}.timeline li span{color:#68727d}.confirmBox{margin-top:12px;padding:12px;border-radius:10px;background:#fff4e8}.confirmBox p{margin:0 0 10px;color:#633817;font-size:.75rem;line-height:1.5}.confirmBox>div{display:flex;gap:8px;flex-wrap:wrap}
.historySection .applicationCard{opacity:.94}.explore{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;margin-top:32px;padding:20px;border:1px solid #d6cebd;border-radius:16px;background:#e9e3d7}.explore h2{margin:5px 0;font-size:1.45rem}.explore p{margin:0;color:#444d57;font-size:.8125rem;line-height:1.55}.explore>div:last-child{display:flex;gap:8px}.quietEmpty,.applicationsEmpty{margin-top:24px;padding:20px;border:1px dashed #b8c0c9;border-radius:14px;background:#fff}.quietEmpty h2,.applicationsEmpty h2{margin:0 0 6px;font-size:1.15rem}.quietEmpty p,.applicationsEmpty p{margin:0 0 14px;color:#68727d}.applicationsEmpty>div{display:flex;gap:8px}.formStatus{min-height:24px;margin-top:12px;color:#3f4955;font-size:.78rem}.srOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
@media(max-width:1024px){.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.filters{grid-template-columns:1fr 1fr}.searchLabel{grid-column:1/-1}.applicationCard{grid-template-columns:1fr}.cardActions{padding:15px 0 0;border-left:0;border-top:1px solid #d8dde3}.explore{grid-template-columns:1fr}}
@media(max-width:480px){.summary{gap:8px}.summary article{min-height:94px;padding:12px}.summary strong{font-size:1.5rem}.filters{grid-template-columns:1fr;padding:10px;gap:8px;margin-bottom:24px}.searchLabel{grid-column:auto}.segments{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}.segments button{min-height:44px;padding:0 4px;font-size:.66rem}.applicationSection{margin-top:25px}.sectionHead{align-items:flex-start}.sectionHead h2{font-size:1.45rem}.sectionHead>small{display:none}.applicationCard{gap:14px;padding:15px}.cardMain h3{font-size:1.2rem}.meta{display:grid;grid-template-columns:1fr}.meta span{border-radius:8px;padding:7px 9px}.formation{grid-template-columns:1fr}.formation small{grid-column:auto}.actions,.confirmBox>div,.applicationsEmpty>div,.explore>div:last-child{width:100%;display:grid;grid-template-columns:1fr}.actions .appButton,.confirmBox .appButton,.applicationsEmpty .appButton,.explore .appButton{width:100%}.timeline{width:100%}.timeline summary{width:100%}.timeline ol{position:static;width:100%;box-shadow:none}.explore{padding:16px}.textButton{justify-self:start}.quietEmpty{padding:16px}}
`;
