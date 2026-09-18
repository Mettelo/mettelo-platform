'use client';

import {FormEvent,useMemo,useState} from 'react';
import CollaborationShareActions from '@/components/CollaborationShareActions';

type Option={id:string;label:string};
type Props={
 projectId:string;projectRunId:string;recruitmentContextToken:string;projectTitle:string;projectType:string|null;
 activeNeedId:string|null;activeNeedStatus:string|null;activeNeedLabel:string|null;activeNeedMessage:string|null;
 activeRoleId:string|null;activeDomainId:string|null;activeCapabilityIds:string[];weeklyCommitment:string|null;
 joiningCutoff:string|null;teamOccupied:number;teamMinimum:number;teamTarget:number;teamMaximum:number;openPlaces:number;
 runStatus:string;canRecruit:boolean;canManage:boolean;canFind:boolean;canPost:boolean;canShare:boolean;
 stateLabel:string;stateMessage:string;roleOptions:Option[];domainOptions:Option[];capabilityOptions:Option[];
 suggestedResponsibility:string|null;suggestedSourceProjectRoleId:string|null
};

const commitments=['1–3 hours / week','3–5 hours / week','5–10 hours / week','10+ hours / week','Flexible'];

function dateLabel(value:string|null){if(!value)return'No cutoff';return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(value))}
function normalizeCommitment(value:string|null){if(!value)return'Flexible';const exact=commitments.find(item=>item.toLocaleLowerCase('en-GB')===value.toLocaleLowerCase('en-GB'));if(exact)return exact;const n=Number((value.match(/\d+/)||[])[0]||0);if(n>=10)return'10+ hours / week';if(n>=5)return'5–10 hours / week';if(n>=3)return'3–5 hours / week';if(n>=1)return'1–3 hours / week';return'Flexible'}

export default function ProjectGrowTeamActions(props:Props){
 const{
  projectId,projectRunId,recruitmentContextToken,projectTitle,projectType,activeNeedId,activeNeedStatus,activeNeedLabel,activeNeedMessage,
  activeRoleId,activeCapabilityIds,weeklyCommitment,joiningCutoff,teamOccupied,teamMinimum,teamTarget,teamMaximum,
  openPlaces,runStatus,canRecruit,canManage,canFind,canPost,canShare,stateLabel,stateMessage,roleOptions,
  capabilityOptions,suggestedResponsibility,suggestedSourceProjectRoleId
 }=props;

 const[needId,setNeedId]=useState(activeNeedId);
 const[needStatus,setNeedStatus]=useState(activeNeedStatus);
 const[needLabel,setNeedLabel]=useState(activeNeedLabel);
 const[working,setWorking]=useState(false);
 const[status,setStatus]=useState('');
 const[mode,setMode]=useState<'closed'|'create'|'edit'>(activeNeedId?'closed':'closed');
 const[showShare,setShowShare]=useState(false);
 const[closeReason,setCloseReason]=useState('Position filled');
 const[showClose,setShowClose]=useState(false);
 const[responsibility,setResponsibility]=useState(activeNeedLabel||suggestedResponsibility||'');
 const[roleId,setRoleId]=useState(activeRoleId||'');
 const[roleQuery,setRoleQuery]=useState(roleOptions.find(item=>item.id===activeRoleId)?.label||'');
 const[selectedCapabilities,setSelectedCapabilities]=useState<string[]>(activeCapabilityIds);
 const[capabilityQuery,setCapabilityQuery]=useState('');
 const[commitment,setCommitment]=useState(normalizeCommitment(weeklyCommitment));
 const[message,setMessage]=useState(activeNeedMessage||'');

 const discoveryHref=`/member/collaboration?view=people&project_id=${encodeURIComponent(projectId)}&project_run_id=${encodeURIComponent(projectRunId)}${needId?`&collaboration_need=${encodeURIComponent(needId)}`:''}`;
 const teamsHref='/member/collaboration?view=teams';
 const publicPath=needId?`/collaborate/${encodeURIComponent(needId)}`:null;
 const roleLabel=useMemo(()=>roleOptions.find(item=>item.id===roleId)?.label||null,[roleId,roleOptions]);
 const capabilityLabels=useMemo(()=>capabilityOptions.filter(item=>selectedCapabilities.includes(item.id)),[selectedCapabilities,capabilityOptions]);
 const filteredCapabilities=useMemo(()=>{
  const q=capabilityQuery.trim().toLocaleLowerCase('en-GB');
  return capabilityOptions.filter(item=>!selectedCapabilities.includes(item.id)&&(!q||item.label.toLocaleLowerCase('en-GB').includes(q))).slice(0,8);
 },[capabilityOptions,capabilityQuery,selectedCapabilities]);

 function resetForm(){
  setResponsibility(needLabel||suggestedResponsibility||'');
  setRoleId(activeRoleId||'');
  setRoleQuery(roleOptions.find(item=>item.id===activeRoleId)?.label||'');
  setSelectedCapabilities(activeCapabilityIds);
  setCommitment(normalizeCommitment(weeklyCommitment));
  setMessage(activeNeedMessage||'');
  setCapabilityQuery('');
 }

 function chooseRole(value:string){
  setRoleQuery(value);
  const match=roleOptions.find(item=>item.label.toLocaleLowerCase('en-GB')===value.trim().toLocaleLowerCase('en-GB'));
  setRoleId(match?.id||'');
 }

 function addCapability(id:string){
  setSelectedCapabilities(current=>current.includes(id)?current:[...current,id]);
  setCapabilityQuery('');
 }

 async function saveNeed(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(working||!canPost)return;
  const help=responsibility.trim();
  if(!help){setStatus('Tell potential collaborators what help you need.');return}
  setWorking(true);setStatus('');
  const editing=mode==='edit'&&Boolean(needId);
  try{
   const body=editing?{
    action:'edit',id:needId,responsibility:help,target_role_catalogue_id:roleId||null,
    capability_ids:selectedCapabilities,member_message:message.trim()||null,weekly_commitment:commitment
   }:{
    recruitment_context:recruitmentContextToken,responsibility:help,
    source_project_role_id:help===suggestedResponsibility?suggestedSourceProjectRoleId:null,
    target_role_catalogue_id:roleId||null,capability_ids:selectedCapabilities,
    member_message:message.trim()||null,weekly_commitment:commitment,source:'member'
   };
   const response=await fetch('/api/collaboration-needs',{method:editing?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(result.error||'Unable to save the collaboration need.');
   const id=result.item?.id||needId;
   setNeedId(id);setNeedStatus(result.item?.status||'active');setNeedLabel(help);setMode('closed');setShowClose(false);
   setStatus(editing?'Collaboration need updated.':'Collaboration need published. Your project can now appear to members looking for teams and collaborators.');
  }catch(error){setStatus(error instanceof Error?error.message:'Unable to save this collaboration need.')}finally{setWorking(false)}
 }

 async function closeNeed(){
  if(!needId||working)return;
  setWorking(true);setStatus('');
  try{
   const response=await fetch('/api/collaboration-needs',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'close',id:needId,reason:closeReason})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(result.error||'Unable to close the collaboration need.');
   setNeedId(null);setNeedStatus(null);setNeedLabel(null);setShowShare(false);setShowClose(false);setMode('closed');
   setStatus('Collaboration need closed. The listing has been removed while its history remains preserved.');
  }catch(error){setStatus(error instanceof Error?error.message:'Unable to close this collaboration need.')}finally{setWorking(false)}
 }

 const routeDisabled=!canRecruit||!canManage;
 const recruitment=canRecruit?'Open':'Closed';
 const joining=joiningCutoff?dateLabel(joiningCutoff):(runStatus==='active'?'Open under project policy':'Open while team forms');
 const activeShareable=Boolean(needId&&needStatus==='active'&&canShare&&!routeDisabled);
 const shareText=`We’re looking for a collaborator to join our Mettelo project: ${projectTitle}. Support needed: ${needLabel||'project collaboration'}.${capabilityLabels.length?` Skills: ${capabilityLabels.slice(0,3).map(item=>item.label).join(', ')}.`:''}`;

 return <div className="growTeamRoot">
  <dl className="growTeamSnapshot" aria-label="Current project recruitment context">
   <div><dt>Posting for</dt><dd>{projectTitle}</dd></div>
   <div><dt>Team</dt><dd>{teamOccupied} of {teamMaximum} members · {openPlaces} open</dd></div>
   <div><dt>Joining</dt><dd>{recruitment}</dd></div>
   <div><dt>Deadline</dt><dd>{joining}</dd></div>
  </dl>

  <div className="growTeamState" role="status">
   <strong>{stateLabel}</strong><span>{stateMessage}</span>{projectType&&<small>{projectType} project</small>}
  </div>

  <div className="growTeamActions" aria-label="Grow the team routes">
   {canFind&&!routeDisabled?<a className="growTeamButton growTeamPrimary" href={discoveryHref}>Find people on Mettelo</a>:<span className="growTeamButton growTeamPrimary growTeamDisabled" aria-disabled="true">Find people on Mettelo</span>}
   {!needId?<button className="growTeamButton" type="button" onClick={()=>{resetForm();setMode('create')}} disabled={routeDisabled||!canPost||working}>Post collaborator needed</button>:null}
   <button className="growTeamButton" type="button" onClick={()=>setShowShare(value=>!value)} disabled={!activeShareable||working}>Share to find collaborators</button>
  </div>

  {!needId&&canFind&&canRecruit&&canManage&&<p className="growTeamHint">You can send a private team request without publishing a public need. Sending a request does not create membership.</p>}

  {needId&&<section className={`needSummary ${needStatus==='needs_review'?'needsReview':''}`} aria-label="Current collaboration need">
   <div><span className="miniLabel">{needStatus==='needs_review'?'COLLABORATION NEED NEEDS REVIEW':'ACTIVE COLLABORATION NEED'}</span><strong>{needLabel||'Collaborator needed'}</strong><p>{needStatus==='needs_review'?'Your project settings have changed since this collaboration need was created. Review it before publishing again.':'A collaboration need is already active for this project.'}</p></div>
   <div className="needSummaryActions">
    {needStatus==='active'&&publicPath&&<a className="growTeamButton" href={publicPath}>View need</a>}
    <button className="growTeamButton" type="button" onClick={()=>{resetForm();setMode('edit')}} disabled={working}>{needStatus==='needs_review'?'Review and update':'Edit need'}</button>
    <button className="growTeamButton growTeamDanger" type="button" onClick={()=>setShowClose(value=>!value)} disabled={working}>Close need</button>
   </div>
  </section>}

  {showClose&&needId&&<section className="closePanel" aria-label="Close collaboration need">
   <label>Reason for closing<select value={closeReason} onChange={event=>setCloseReason(event.target.value)}><option>Position filled</option><option>No longer needed</option><option>Project direction changed</option><option>Recruitment closed</option><option>Other</option></select></label>
   <div><button className="growTeamButton growTeamDanger" type="button" onClick={()=>void closeNeed()} disabled={working}>{working?'Closing…':'Close collaboration need'}</button><button className="growTeamButton" type="button" onClick={()=>setShowClose(false)} disabled={working}>Cancel</button></div>
  </section>}

  {showShare&&activeShareable&&publicPath&&<section className="growTeamShare" aria-label="Share to find collaborators">
   <strong>Share to find collaborators</strong><p>Only the safe public collaboration opportunity is shared. Private Lab information and technical IDs are not included.</p>
   <CollaborationShareActions url={publicPath} text={shareText} collaborationNeedId={needId!}/>
  </section>}

  {showShare&&needId&&!activeShareable&&<section className="growTeamNotice" role="status"><strong>Sharing unavailable</strong><p>Review or reopen a valid collaboration need before sharing. Closed, stale, full or non-joinable opportunities cannot be shared.</p></section>}

  {canRecruit&&!canManage?<p className="growTeamNotice">Recruitment is open, but your current team role is not authorized by this project’s recruitment policy.</p>:null}
  {!canRecruit?<p className="growTeamNotice">Recruitment actions are unavailable in the current project state. The controls remain visible so the closure reason is clear.</p>:null}

  {mode!=='closed'&&canRecruit&&canManage&&canPost&&<form className="growTeamForm" onSubmit={saveNeed} aria-label={mode==='edit'?'Review and update collaboration need':'Post collaborator needed'}>
   <div className="formHead"><span className="miniLabel">{mode==='edit'?'REVIEW COLLABORATION NEED':'POST COLLABORATOR NEEDED'}</span><h6>{mode==='edit'?'Update what you need':'Find the help your project needs'}</h6><p>Mettelo already knows the project, team capacity and joining state. Add only what a potential collaborator needs to understand.</p></div>

   <label className="growTeamWide"><span>What help do you need?</span><input required maxLength={160} value={responsibility} onChange={event=>setResponsibility(event.target.value)} placeholder="e.g. Dashboard design and insight"/></label>

   <label><span>Preferred role <small>Optional</small></span><input list="collaboration-role-options" value={roleQuery} onChange={event=>chooseRole(event.target.value)} placeholder="Search roles or choose any suitable role"/><datalist id="collaboration-role-options">{roleOptions.map(item=><option key={item.id} value={item.label}/>)}</datalist></label>

   <label><span>Expected weekly commitment</span><select value={commitment} onChange={event=>setCommitment(event.target.value)}>{commitments.map(item=><option key={item}>{item}</option>)}</select></label>

   <fieldset className="growTeamWide capabilityPicker"><legend>Capabilities needed <small>Optional</small></legend>
    <div className="selectedCapabilities" aria-label="Selected capabilities">{capabilityLabels.map(item=><span key={item.id}>{item.label}<button type="button" aria-label={`Remove ${item.label}`} onClick={()=>setSelectedCapabilities(current=>current.filter(id=>id!==item.id))}>×</button></span>)}</div>
    <label className="capabilitySearch"><span className="srOnly">Search capabilities</span><input value={capabilityQuery} onChange={event=>setCapabilityQuery(event.target.value)} placeholder="Search capabilities"/></label>
    {capabilityQuery.trim()&&<div className="capabilitySuggestions" role="listbox" aria-label="Capability suggestions">{filteredCapabilities.length?filteredCapabilities.map(item=><button key={item.id} type="button" role="option" aria-selected="false" onClick={()=>addCapability(item.id)}>{item.label}</button>):<p>No matching capabilities</p>}</div>}
   </fieldset>

   <label className="growTeamWide"><span>Message to potential collaborators <small>Optional</small></span><textarea maxLength={500} rows={3} value={message} onChange={event=>setMessage(event.target.value)} placeholder="Add a short note about the current stage of work and where support would help."/><small className="characterCount">{message.length} / 500</small></label>

   <div className="formContext growTeamWide" aria-label="Read-only project context">
    <div><span>Posting for</span><strong>{projectTitle}</strong></div>
    <div><span>Team</span><strong>{teamOccupied} of {teamMaximum} · {openPlaces} open</strong></div>
    <div><span>Joining</span><strong>{recruitment}</strong></div>
    <div><span>Deadline</span><strong>{joining}</strong></div>
   </div>

   <div className="growTeamFormActions">
    <button className="growTeamButton growTeamPrimary" type="submit" disabled={working}>{working?'Saving…':mode==='edit'?'Save changes':'Publish collaboration need'}</button>
    <button className="growTeamButton" type="button" onClick={()=>setMode('closed')} disabled={working}>Cancel</button>
   </div>
  </form>}

  {status&&<section className="growTeamStatus" aria-live="polite"><p>{status}</p>{status.startsWith('Collaboration need published')&&<div><a className="growTeamButton growTeamPrimary" href={teamsHref}>View in Collaboration Network</a><button className="growTeamButton" type="button" onClick={()=>setStatus('')}>Done</button></div>}</section>}

  <style jsx>{`
   .growTeamRoot{display:grid;gap:14px;min-width:0;max-width:100%}
   .growTeamSnapshot{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0}
   .growTeamSnapshot div,.growTeamState,.growTeamShare,.needSummary,.closePanel,.growTeamStatus{padding:13px 14px;border:1px solid var(--line);border-radius:12px;background:var(--paper)}
   .growTeamSnapshot dt,.miniLabel,.formContext span{font:800 .64rem/1.2 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--slate)}
   .growTeamSnapshot dd{margin:5px 0 0;font-weight:800;overflow-wrap:anywhere}
   .growTeamState{display:grid;gap:4px}.growTeamState strong{font-size:.78rem;letter-spacing:.04em}.growTeamState span,.growTeamState small,.growTeamHint,.growTeamNotice,.growTeamStatus,.growTeamShare p{color:var(--slate);line-height:1.45}
   .growTeamActions,.needSummaryActions,.closePanel>div,.growTeamStatus>div{display:flex;gap:9px;flex-wrap:wrap}
   .growTeamButton{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:10px 13px;border:1px solid var(--ink);border-radius:10px;background:var(--white);color:var(--ink);font:inherit;font-size:.78rem;font-weight:800;cursor:pointer;text-decoration:none}
   .growTeamButton:focus-visible,.capabilitySuggestions button:focus-visible,.selectedCapabilities button:focus-visible{outline:3px solid #173f8f;outline-offset:3px}
   .growTeamButton:disabled,.growTeamDisabled{opacity:.5;cursor:not-allowed}.growTeamPrimary{background:var(--ink);color:var(--white)}.growTeamDanger{border-color:#7d2929;color:#7d2929}
   .growTeamHint,.growTeamNotice,.growTeamShare p,.growTeamStatus p{margin:0;font-size:.75rem;max-width:780px}.growTeamShare{display:grid;gap:10px}
   .needSummary{display:flex;align-items:center;justify-content:space-between;gap:18px;background:#fff}.needSummary>div:first-child{display:grid;gap:5px}.needSummary p{margin:0;color:var(--slate);font-size:.75rem}.needsReview{border-color:#d7a94f;background:#fffaf0}.needsReview .miniLabel{color:var(--bronze-deep)}
   .closePanel{display:grid;gap:10px;max-width:620px}.closePanel label{display:grid;gap:6px;font-size:.75rem;font-weight:800}.closePanel select{min-height:44px;padding:9px 10px;border:1px solid #cfc7ba;border-radius:9px;background:#fff}
   .growTeamForm{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:13px;width:100%;max-width:860px;padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--white);box-sizing:border-box}
   .formHead{grid-column:1/-1}.formHead h6{margin:5px 0;font-size:1.1rem}.formHead p{margin:0;color:var(--slate);font-size:.76rem;line-height:1.5}
   .growTeamForm label,.growTeamForm fieldset{display:grid;gap:6px;min-width:0;border:0;padding:0;margin:0;font-size:.74rem;font-weight:800}.growTeamForm label span small,.growTeamForm legend small{font-weight:600;color:var(--muted)}
   .growTeamForm input,.growTeamForm textarea,.growTeamForm select{box-sizing:border-box;width:100%;min-width:0;min-height:44px;border:1px solid #cfc7ba;border-radius:9px;padding:10px 11px;background:var(--paper);color:var(--ink);font:inherit}
   .growTeamForm input:focus,.growTeamForm textarea:focus,.growTeamForm select:focus{outline:3px solid rgba(23,63,143,.18);border-color:#173f8f}
   .growTeamWide,.growTeamFormActions{grid-column:1/-1}.capabilityPicker{position:relative}.selectedCapabilities{display:flex;gap:7px;flex-wrap:wrap}.selectedCapabilities span{display:inline-flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #ded7ca;border-radius:999px;background:#f8f5ef;font-size:.7rem}.selectedCapabilities button{width:22px;height:22px;border:0;border-radius:50%;background:transparent;cursor:pointer}
   .capabilitySuggestions{display:flex;gap:7px;flex-wrap:wrap;padding:9px;border:1px solid var(--line);border-radius:10px;background:#fff}.capabilitySuggestions button{min-height:38px;padding:7px 10px;border:1px solid #dedede;border-radius:9px;background:#fff;cursor:pointer}.capabilitySuggestions p{margin:0;color:var(--slate);font-size:.72rem}
   .characterCount{justify-self:end;color:var(--muted);font-weight:600}.formContext{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:11px;border-radius:12px;background:#f8f7f3}.formContext div{display:grid;gap:4px}.formContext strong{font-size:.72rem;overflow-wrap:anywhere}
   .growTeamFormActions{display:flex;gap:8px}.growTeamStatus{display:grid;gap:9px}.srOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
   @media(max-width:800px){.growTeamSnapshot,.formContext{grid-template-columns:repeat(2,minmax(0,1fr))}}
   @media(max-width:640px){.growTeamSnapshot,.growTeamActions,.needSummary,.growTeamForm,.formContext{display:grid;grid-template-columns:1fr}.growTeamButton{width:100%}.growTeamWide,.growTeamFormActions,.formHead{grid-column:1}.growTeamFormActions{display:grid}.needSummaryActions{display:grid}.growTeamForm{padding:14px}}
  `}</style>
 </div>;
}
