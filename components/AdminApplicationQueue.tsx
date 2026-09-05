'use client';

import {useMemo,useState} from 'react';
import AdminStatusBadge from './AdminStatusBadge';

type ReviewStatus='in_review'|'clarification_requested'|'shortlisted'|'offered'|'declined';
type StatusFilter='current'|'submitted'|'in_review'|'clarification_requested'|'shortlisted'|'offered'|'declined'|'all';
type ProofItem={title:string;description:string|null;evidence_url:string|null;project_id:string|null;verification_status:string};
type Item={
  id:string;
  name:string;
  username:string|null;
  member_id:string|null;
  avatar_url?:string|null;
  email:string;
  project_id?:string;
  project:string;
  project_type?:string|null;
  partner_name?:string|null;
  participation_mode?:string|null;
  difficulty?:string|null;
  weekly_commitment?:string|null;
  recruitment_state?:string|null;
  role:string;
  application_kind:string;
  status:string;
  submitted_at:string;
  statement:string;
  portfolio_url:string|null;
  availability:string|null;
  participation_preference:string|null;
  leadership_interest:boolean;
  reviewer_notes?:string|null;
  profile_completeness?:number;
  profile:{headline:string|null;skills:string[];experience_level:string|null;project_availability:string|null;weekly_capacity:string|null};
  proof:ProofItem[];
  capacity:{confirmed:number;reservedOffers?:number;minimum:number;target:number;maximum:number};
  communications:{title:string;body:string;created_at:string}[];
};

function isInterest(item:Item){return item.application_kind==='interest'}
function requestNoun(item:Item){return isInterest(item)?'interest':'application'}
function requestLabel(item:Item){return isInterest(item)?'Project interest':'Project application'}
function partner(item:Item){return item.project_type==='partner'}
function openPlaces(item:Item){return Math.max(0,item.capacity.maximum-item.capacity.confirmed-(item.capacity.reservedOffers||0))}
function nextActions(item:Item):ReviewStatus[]{
  if(item.status==='submitted')return['in_review','declined'];
  if(item.status==='in_review')return['clarification_requested','shortlisted','offered','declined'];
  if(item.status==='clarification_requested')return['in_review','declined'];
  if(item.status==='shortlisted')return['offered','declined'];
  return[];
}
function actionLabel(status:ReviewStatus,current?:string){
  if(status==='in_review')return current==='clarification_requested'?'Resume review':'Start review';
  if(status==='clarification_requested')return'Request clarification';
  if(status==='shortlisted')return'Shortlist';
  if(status==='offered')return'Offer project place';
  return'Decline';
}
const defaults:Record<ReviewStatus,(item:Item)=>string>={
  in_review:item=>`Your project ${requestNoun(item)} for ${item.project} is now in review. No action is required from you right now. We will update My Mettelo when the next decision is available.`,
  clarification_requested:item=>`We need a little more information before we can continue reviewing your project ${requestNoun(item)} for ${item.project}. Please open My Mettelo to review the clarification request.`,
  shortlisted:item=>`Your project ${requestNoun(item)} for ${item.project} has progressed to the shortlist. This is not yet a confirmed place. We will update you when the next decision is available.`,
  offered:item=>`Mettelo would like to offer you a place on ${item.project}. This selection does not enrol you automatically. Explicit member acceptance remains required before membership or team formation.`,
  declined:item=>`Your project ${requestNoun(item)} for ${item.project} was not selected for this team. You can continue exploring other Mettelo projects that match your profile.`
};
const statusGroups:Record<StatusFilter,string[]>={
  current:['submitted','in_review','clarification_requested','shortlisted'],
  submitted:['submitted'],
  in_review:['in_review'],
  clarification_requested:['clarification_requested'],
  shortlisted:['shortlisted'],
  offered:['offered'],
  declined:['declined'],
  all:[]
};

export default function AdminApplicationQueue({initialItems}:{initialItems:Item[]}){
  const[items,setItems]=useState(initialItems);
  const[selected,setSelected]=useState<string[]>([]);
  const[projectFilter,setProjectFilter]=useState('all');
  const[typeFilter,setTypeFilter]=useState('all');
  const[statusFilter,setStatusFilter]=useState<StatusFilter>('current');
  const[dateFrom,setDateFrom]=useState('');
  const[dateTo,setDateTo]=useState('');
  const[sort,setSort]=useState('newest');
  const[page,setPage]=useState(1);
  const[pageSize,setPageSize]=useState(25);
  const[working,setWorking]=useState(false);
  const[message,setMessage]=useState('');
  const[pending,setPending]=useState<{status:ReviewStatus;ids:string[]}|null>(null);
  const[customMessage,setCustomMessage]=useState('');
  const[reviewNote,setReviewNote]=useState('');
  const[detail,setDetail]=useState<Item|null>(null);

  const projects=useMemo(()=>[...new Set(items.map(item=>item.project))].sort(),[items]);
  const visible=useMemo(()=>{
    const allowed=statusGroups[statusFilter];
    const rows=items.filter(item=>(projectFilter==='all'||item.project===projectFilter)&&(typeFilter==='all'||(typeFilter==='partner'&&partner(item))||(typeFilter==='open'&&!partner(item)))&&(!allowed.length||allowed.includes(item.status))&&(!dateFrom||new Date(item.submitted_at)>=new Date(`${dateFrom}T00:00:00`))&&(!dateTo||new Date(item.submitted_at)<=new Date(`${dateTo}T23:59:59`)));
    return[...rows].sort((a,b)=>sort==='oldest'?new Date(a.submitted_at).getTime()-new Date(b.submitted_at).getTime():sort==='project'?a.project.localeCompare(b.project):new Date(b.submitted_at).getTime()-new Date(a.submitted_at).getTime());
  },[items,projectFilter,typeFilter,statusFilter,dateFrom,dateTo,sort]);
  const pages=Math.max(1,Math.ceil(visible.length/pageSize));
  const safePage=Math.min(page,pages);
  const pageItems=visible.slice((safePage-1)*pageSize,safePage*pageSize);
  const selectedItems=items.filter(item=>selected.includes(item.id));

  function resetPage(){setPage(1)}
  function toggle(id:string){setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])}
  function canBulk(status:ReviewStatus){return selectedItems.length>0&&status!=='clarification_requested'&&selectedItems.every(item=>nextActions(item).includes(status))}
  function openAction(status:ReviewStatus,ids:string[]){
    const eligible=items.filter(item=>ids.includes(item.id)&&nextActions(item).includes(status));
    if(eligible.length!==ids.length){setMessage('One or more selected requests cannot make that transition. Refresh the queue and review their current states.');return}
    if(status==='clarification_requested'&&ids.length!==1){setMessage('Clarification requests must be handled individually so the member receives a specific request.');return}
    setPending({status,ids});
    setReviewNote(ids.length===1?eligible[0].reviewer_notes||'':'');
    setCustomMessage(ids.length===1?defaults[status](eligible[0]):'');
  }
  async function update(item:Item,status:ReviewStatus,override?:string,note?:string){
    const response=await fetch('/api/admin/applications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,status,reviewer_notes:(note||'').trim(),custom_message:(override||'').trim()||defaults[status](item)})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.error||'Unable to update project request.');
    setItems(current=>current.map(row=>row.id===item.id?{...row,status:payload.application?.status||status,reviewer_notes:(note||row.reviewer_notes||null)}:row));
  }
  async function confirmUpdate(){
    if(!pending)return;
    if(pending.status==='clarification_requested'&&!reviewNote.trim()&&!customMessage.trim()){setMessage('Explain what information the member needs to provide.');return}
    setWorking(true);setMessage('');
    try{
      for(const id of pending.ids){const item=items.find(row=>row.id===id);if(item)await update(item,pending.status,pending.ids.length===1?customMessage:'',pending.ids.length===1?reviewNote:'')}
      setMessage(`${pending.ids.length} project request${pending.ids.length===1?'':'s'} moved to ${pending.status.replaceAll('_',' ')}.`);
      setSelected([]);setPending(null);setCustomMessage('');setReviewNote('');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update project requests.')}finally{setWorking(false)}
  }

  return <div className="adminApplications">
    <div className="applicationToolbar" role="search" aria-label="Filter project requests">
      <label>Project<select value={projectFilter} onChange={e=>{setProjectFilter(e.target.value);resetPage()}}><option value="all">All projects</option>{projects.map(project=><option key={project}>{project}</option>)}</select></label>
      <label>Project type<select value={typeFilter} onChange={e=>{setTypeFilter(e.target.value);resetPage()}}><option value="all">All review-required</option><option value="partner">Partner Projects</option><option value="open">Open REVIEW_REQUIRED</option></select></label>
      <label>Status<select aria-label="Filter project requests by status" value={statusFilter} onChange={e=>{setStatusFilter(e.target.value as StatusFilter);resetPage()}}><option value="current">Current review work</option><option value="submitted">Submitted</option><option value="in_review">In review</option><option value="clarification_requested">Clarification requested</option><option value="shortlisted">Shortlisted</option><option value="offered">Offered</option><option value="declined">Declined</option><option value="all">All statuses</option></select></label>
      <label>Submitted from<input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);resetPage()}}/></label>
      <label>Submitted to<input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);resetPage()}}/></label>
      <label>Sort<select value={sort} onChange={e=>{setSort(e.target.value);resetPage()}}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="project">By project</option></select></label>
    </div>

    {selected.length>0&&<div className="applicationBulkBar" aria-label="Bulk review actions"><strong>{selected.length} selected</strong>{canBulk('in_review')&&<button type="button" onClick={()=>openAction('in_review',selected)}>Start review</button>}{canBulk('shortlisted')&&<button type="button" onClick={()=>openAction('shortlisted',selected)}>Shortlist selected</button>}{canBulk('offered')&&<button type="button" onClick={()=>openAction('offered',selected)}>Offer project place</button>}{canBulk('declined')&&<button type="button" onClick={()=>openAction('declined',selected)}>Decline selected</button>}<button type="button" onClick={()=>setSelected([])}>Clear</button></div>}

    {!items.length?<div className="adminEmpty"><h3>No project requests waiting for review</h3><p>Partner Project submissions and Open REVIEW_REQUIRED submissions will appear here. Healthy AUTO submissions never become approval work.</p></div>:!visible.length?<div className="adminEmpty"><h3>No project requests match these filters</h3><button className="button ghost" type="button" onClick={()=>{setProjectFilter('all');setTypeFilter('all');setStatusFilter('current');setDateFrom('');setDateTo('');setPage(1)}}>Clear filters</button></div>:<>
      <div className="applicationTableWrap"><table className="applicationTable"><thead><tr><th><input type="checkbox" aria-label="Select project requests on this page" checked={pageItems.length>0&&pageItems.every(item=>selected.includes(item.id))} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...pageItems.map(item=>item.id)])]:current.filter(id=>!pageItems.some(item=>item.id===id)))}/></th><th>Member</th><th>Project</th><th>Submitted</th><th>Status</th><th>Capacity</th><th><span className="srOnly">Actions</span></th></tr></thead><tbody>{pageItems.map(item=><tr key={item.id}><td><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>toggle(item.id)} aria-label={`Select ${item.name}`}/></td><td><button className="applicantButton" type="button" onClick={()=>setDetail(item)}><span className="miniAvatar" style={item.avatar_url?{backgroundImage:`url(${item.avatar_url})`}:undefined}>{item.avatar_url?'':item.name.slice(0,1).toUpperCase()}</span><span><strong>{item.name}</strong><small>{item.username?`@${item.username}`:item.email||item.member_id||'Member'}</small></span></button></td><td><div className="projectCell"><div className="projectBadges"><span className={partner(item)?'partnerBadge':'openBadge'}>{partner(item)?'PARTNER PROJECT':'OPEN · REVIEW REQUIRED'}</span>{partner(item)&&item.partner_name&&<span className="partnerName">{item.partner_name}</span>}</div><a href={item.project_id?`/admin/project-operations/projects/${item.project_id}`:'#'}>{item.project}</a><small>{requestLabel(item)} · {item.participation_preference||item.role}</small>{item.leadership_interest&&<span className="leadershipBadge">Willing to lead</span>}</div></td><td>{new Date(item.submitted_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</td><td><AdminStatusBadge status={item.status}/></td><td><span className="capacityLine">{item.capacity.confirmed} confirmed · {item.capacity.reservedOffers||0} offered</span><small>{openPlaces(item)} open · min {item.capacity.minimum} · target {item.capacity.target} · max {item.capacity.maximum}</small></td><td><details className="rowMenu"><summary aria-label={`Actions for ${item.name}`}>⋯</summary><div><button type="button" onClick={()=>setDetail(item)}>View review context</button>{nextActions(item).map(status=><button className={status==='declined'?'danger':undefined} type="button" key={status} onClick={()=>openAction(status,[item.id])}>{actionLabel(status,item.status)}</button>)}</div></details></td></tr>)}</tbody></table></div>
      <div className="applicationMobileList">{pageItems.map(item=><article key={item.id}><div className="mobileAppTop"><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>toggle(item.id)} aria-label={`Select ${item.name}`}/><button type="button" onClick={()=>setDetail(item)}><strong>{item.name}{item.username?` · @${item.username}`:''}</strong><small>{partner(item)?`Partner Project${item.partner_name?` · ${item.partner_name}`:''}`:'Open · Review required'} · {item.project}</small></button><details className="rowMenu"><summary aria-label={`Actions for ${item.name}`}>⋯</summary><div><button type="button" onClick={()=>setDetail(item)}>View context</button>{nextActions(item).map(status=><button type="button" className={status==='declined'?'danger':undefined} key={status} onClick={()=>openAction(status,[item.id])}>{actionLabel(status,item.status)}</button>)}</div></details></div><div className="mobileAppMeta"><AdminStatusBadge status={item.status}/><span>{item.capacity.confirmed} confirmed</span><span>{item.capacity.reservedOffers||0} offered</span><span>{openPlaces(item)} open</span></div></article>)}</div>
      <div className="pagination"><span>{visible.length} request{visible.length===1?'':'s'}</span><label>Rows per page<select aria-label="Project requests per page" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}}><option>25</option><option>50</option><option>100</option></select></label><div><button type="button" disabled={safePage<=1} onClick={()=>setPage(value=>Math.max(1,value-1))}>Previous</button><span>Page {safePage} of {pages}</span><button type="button" disabled={safePage>=pages} onClick={()=>setPage(value=>Math.min(pages,value+1))}>Next</button></div></div>
    </>}

    <div className="formStatus" role="status" aria-live="polite">{message}</div>

    {detail&&<div className="modalBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setDetail(null)}}><section className="detailModal" role="dialog" aria-modal="true" aria-labelledby="application-detail-heading"><div className="modalHead"><div><span className="eyebrow">{partner(detail)?'PARTNER PROJECT REVIEW':'OPEN PROJECT REVIEW'}</span><h2 id="application-detail-heading">{detail.name}</h2><p>{detail.username?`@${detail.username} · `:''}{detail.member_id?`${detail.member_id} · `:''}{detail.project}{partner(detail)&&detail.partner_name?` · ${detail.partner_name}`:''}</p></div><button type="button" aria-label={`Close ${requestNoun(detail)} detail`} onClick={()=>setDetail(null)}>×</button></div>
      <div className="contextBanner"><strong>{partner(detail)?'Human review is mandatory':'This Open Project is configured for human review'}</strong><span>Selection creates an Offer only. It does not create membership or open Lab.</span></div>
      <div className="detailGrid">
        <section><h3>Self-declared professional profile</h3><p className="sectionHint">Profile claims help reviewers understand context. They are not verified Mettelo Proof.</p><p>{detail.profile.headline||'No professional headline supplied.'}</p><dl><div><dt>Skills</dt><dd>{detail.profile.skills.length?detail.profile.skills.join(', '):'No skills listed.'}</dd></div><div><dt>Experience</dt><dd>{detail.profile.experience_level||'Not supplied'}</dd></div><div><dt>Availability</dt><dd>{detail.availability||detail.profile.project_availability||detail.profile.weekly_capacity||'Not supplied'}</dd></div></dl></section>
        <section><h3>Project context</h3><dl><div><dt>Project type</dt><dd>{partner(detail)?'Partner Project':'Open Project · REVIEW_REQUIRED'}</dd></div>{partner(detail)&&<div><dt>Partner organisation</dt><dd>{detail.partner_name||'Not supplied'}</dd></div>}<div><dt>Participation mode</dt><dd>{detail.participation_mode||'Not supplied'}</dd></div><div><dt>Participation preference</dt><dd>{detail.participation_preference||'Project default'}</dd></div><div><dt>Difficulty</dt><dd>{detail.difficulty||'Not supplied'}</dd></div><div><dt>Commitment</dt><dd>{detail.weekly_commitment||'Not supplied'}</dd></div><div><dt>Recruitment</dt><dd>{detail.recruitment_state||'Open for review'}</dd></div><div><dt>Leadership</dt><dd>{detail.leadership_interest?'Willing to be considered for Project Lead.':'Not volunteering for Project Lead.'}</dd></div><div><dt>Capacity</dt><dd>{detail.capacity.confirmed} confirmed · {detail.capacity.reservedOffers||0} offered · {openPlaces(detail)} open · minimum {detail.capacity.minimum} · target {detail.capacity.target} · maximum {detail.capacity.maximum}</dd></div></dl></section>
        <section><h3>{isInterest(detail)?'Interest / contribution statement':'Application statement'}</h3><p>{detail.statement}</p>{detail.portfolio_url&&<a href={detail.portfolio_url} target="_blank" rel="noopener noreferrer">Open submitted evidence →</a>}</section>
        <section className="verifiedProof"><h3>Verified Mettelo Proof</h3><p className="sectionHint">Only evidence carrying Mettelo verification appears in this section.</p>{detail.proof.length?detail.proof.map((proof,index)=><article className="proofItem" key={`${proof.title}-${index}`}><strong>{proof.title}</strong>{proof.description&&<p>{proof.description}</p>}{proof.evidence_url&&<a href={proof.evidence_url} target="_blank" rel="noopener noreferrer">Open verified evidence →</a>}</article>):<p>No verified Proof is currently available for this member.</p>}</section>
      </div>
      {nextActions(detail).length>0&&<div className="detailActions">{nextActions(detail).map(status=><button className={status==='declined'?'button ghost dangerAction':'button dark'} type="button" key={status} onClick={()=>{setDetail(null);openAction(status,[detail.id])}}>{actionLabel(status,detail.status)}</button>)}</div>}
    </section></div>}

    {pending&&<div className="modalBackdrop"><section className="confirmModal" role="dialog" aria-modal="true" aria-labelledby="application-confirm-heading"><span className="eyebrow">Confirm review decision</span><h2 id="application-confirm-heading">{actionLabel(pending.status,items.find(item=>item.id===pending.ids[0])?.status)} for {pending.ids.length===1?items.find(item=>item.id===pending.ids[0])?.name||'member':`${pending.ids.length} members`}?</h2><p>{pending.status==='offered'?'Capacity is revalidated server-side before the Offer is recorded. Selection still does not create membership; explicit member acceptance remains required.':pending.status==='clarification_requested'?'Tell the member exactly what information is needed. The request remains in human review and creates no membership.':'This updates the canonical request state and records the Admin actor, previous state, new state and review note in the existing audit history.'}</p>{pending.ids.length===1&&<><label className="messagePreview"><span>Reviewer note / reason</span><textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value)} rows={3} placeholder={pending.status==='clarification_requested'?'What information is missing?':'Optional internal review note'}/></label><label className="messagePreview"><span>Member message</span><textarea value={customMessage} onChange={e=>setCustomMessage(e.target.value)} rows={5}/></label></>}<div className="confirmActions"><button type="button" disabled={working} onClick={()=>{setPending(null);setCustomMessage('');setReviewNote('')}}>Cancel</button><button className={pending.status==='declined'?'danger':'primary'} type="button" disabled={working} onClick={()=>void confirmUpdate()}>{working?'Working…':actionLabel(pending.status,items.find(item=>item.id===pending.ids[0])?.status)}</button></div></section></div>}

    <style jsx>{`
      .adminApplications{display:grid;gap:14px}.applicationToolbar{display:grid;grid-template-columns:1.2fr 1fr 1fr repeat(3,minmax(130px,.7fr));gap:8px;padding:12px;border:1px solid #d9dde2;border-radius:12px;background:#fff}.applicationToolbar label,.messagePreview{display:grid;gap:5px;font-size:.64rem;font-weight:800;color:#5b6470}.applicationToolbar select,.applicationToolbar input,.messagePreview textarea{min-height:44px;border:1px solid #cfd4da;border-radius:8px;background:#fff;color:#10131d;padding:8px;font:inherit}.applicationBulkBar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:1px solid #d8dde3;border-radius:10px;background:#fbfaf7}.applicationBulkBar button,.pagination button,.rowMenu button,.confirmActions button{min-height:44px;border:1px solid #cfd4da;border-radius:8px;background:#fff;padding:0 12px;font-weight:750;cursor:pointer}.applicationTableWrap{overflow-x:auto;border:1px solid #d9dde2;border-radius:12px;background:#fff}.applicationTable{width:100%;border-collapse:collapse;min-width:1040px}.applicationTable th,.applicationTable td{padding:11px 10px;text-align:left;border-bottom:1px solid #eceef0;vertical-align:top;font-size:.7rem}.applicationTable th{font-size:.62rem;text-transform:uppercase;color:#67707c;background:#fbfaf7}.applicationTable input[type=checkbox],.applicationMobileList input[type=checkbox]{width:18px;height:18px}.applicantButton{border:0;background:transparent;display:flex;align-items:center;gap:8px;text-align:left;cursor:pointer;min-height:44px}.applicantButton small,.projectCell small{display:block;color:#69727d;margin-top:3px}.miniAvatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#ece6d9;background-size:cover;background-position:center;font-weight:850}.projectCell{display:grid;gap:4px}.projectBadges{display:flex;gap:5px;flex-wrap:wrap}.partnerBadge,.openBadge,.partnerName,.leadershipBadge{width:max-content;padding:3px 6px;border-radius:999px;font-size:.56rem;font-weight:850;letter-spacing:.03em}.partnerBadge{background:#efe2c5;color:#704d14}.openBadge{background:#edf3fb;color:#214f8f}.partnerName{background:#f4f1ea;color:#5f5748}.leadershipBadge{background:#edf8f1;color:#185b3c}.capacityLine{display:block;font-weight:800}.rowMenu{position:relative}.rowMenu summary{min-width:44px;min-height:44px;display:grid;place-items:center;cursor:pointer;list-style:none;border:1px solid #d9dde2;border-radius:8px}.rowMenu>div{position:absolute;right:0;top:46px;z-index:5;width:210px;padding:6px;display:grid;gap:4px;border:1px solid #d9dde2;border-radius:10px;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.1)}.rowMenu button{text-align:left}.rowMenu .danger,.dangerAction{color:#8a2632}.applicationMobileList{display:none}.pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:8px 0}.pagination>div{display:flex;align-items:center;gap:8px}.pagination label{display:flex;align-items:center;gap:6px;font-size:.65rem}.pagination select{min-height:44px}.formStatus{min-height:24px;font-size:.7rem;color:#5b6470}.adminEmpty{padding:20px;border:1px dashed #b8c0c9;border-radius:12px;background:#fff}.modalBackdrop{position:fixed;inset:0;z-index:1000;background:rgba(15,18,26,.55);display:grid;place-items:center;padding:16px}.detailModal,.confirmModal{width:min(900px,100%);max-height:90vh;overflow:auto;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.2)}.confirmModal{width:min(620px,100%);padding:22px}.modalHead{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid #e3e6e9}.modalHead h2,.confirmModal h2{margin:5px 0}.modalHead p{margin:3px 0 0;color:#5b6470;font-size:.7rem}.modalHead>button{width:44px;height:44px;border:1px solid #cfd4da;border-radius:9px;background:#fff;font-size:1.3rem}.contextBanner{margin:16px 20px 0;padding:12px;border:1px solid #e5d3a5;border-radius:10px;background:#fffaf0;display:grid;gap:3px}.contextBanner strong{font-size:.75rem}.contextBanner span{font-size:.68rem;color:#6b5a34}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px}.detailGrid>section{padding:14px;border:1px solid #e2e5e8;border-radius:12px}.detailGrid h3{margin:0 0 8px;font-size:.9rem}.detailGrid p{font-size:.7rem;line-height:1.55}.sectionHint{color:#6b7280;font-size:.64rem!important}.detailGrid dl{display:grid;margin:0}.detailGrid dl>div{display:grid;grid-template-columns:130px 1fr;gap:8px;padding:7px 0;border-top:1px solid #eceef0}.detailGrid dt{font-size:.62rem;font-weight:800;color:#67707c}.detailGrid dd{margin:0;font-size:.68rem}.verifiedProof{border-color:#b9dfc8!important;background:#f7fcf8}.proofItem{padding:9px 0;border-top:1px solid #d9eadf}.detailActions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:16px 20px;border-top:1px solid #e3e6e9}.detailActions button,.confirmActions button{min-height:44px}.messagePreview{margin-top:12px}.confirmActions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.confirmActions .primary{background:#10131d;color:#fff;border-color:#10131d}.confirmActions .danger{background:#7a1e2c;color:#fff;border-color:#7a1e2c}.adminApplications button:focus-visible,.adminApplications summary:focus-visible,.adminApplications input:focus-visible,.adminApplications select:focus-visible,.adminApplications textarea:focus-visible,.adminApplications a:focus-visible{outline:3px solid #173f8f;outline-offset:3px}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:1050px){.applicationToolbar{grid-template-columns:repeat(3,1fr)}}@media(max-width:760px){.applicationTableWrap{display:none}.applicationMobileList{display:grid;gap:8px}.applicationMobileList article{padding:12px;border:1px solid #d9dde2;border-radius:12px;background:#fff}.mobileAppTop{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:start}.mobileAppTop>button{min-height:44px;border:0;background:transparent;text-align:left}.mobileAppTop small{display:block;margin-top:4px;color:#69727d}.mobileAppMeta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.mobileAppMeta>span{padding:5px 7px;border-radius:999px;background:#f1f2f4;font-size:.6rem}.applicationToolbar{grid-template-columns:1fr 1fr}.detailGrid{grid-template-columns:1fr}}@media(max-width:480px){.applicationToolbar{grid-template-columns:1fr}.pagination{display:grid}.pagination>div{justify-content:space-between}.detailGrid,.modalHead,.detailActions{padding-left:14px;padding-right:14px}.detailGrid dl>div{grid-template-columns:1fr;gap:3px}.detailActions,.confirmActions{display:grid;grid-template-columns:1fr}.detailActions button,.confirmActions button{width:100%}}
    `}</style>
  </div>;
}
