'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';

type Props={
  projectId:string;
  projectType:'open'|'partner'|string;
  partnerName?:string|null;
  admissionMode:'auto'|'review_required';
  autoStartDelayMinutes:number;
  autoStartPaused:boolean;
  lateJoiningEnabled?:boolean;
  lateJoiningCutoffAt?:string|null;
  projectSharingEnabled?:boolean;
  memberInvitesEnabled?:boolean;
};
type Policy={project_type?:string;partner_name?:string|null;admission_mode?:string;effective_admission_mode?:string;auto_start_delay_minutes?:number;auto_start_paused_at?:string|null;late_joining_enabled?:boolean;late_joining_cutoff_at?:string|null;project_sharing_enabled?:boolean;member_invites_enabled?:boolean};
type Run={id:string;run_number:number;status:string;has_started:boolean;required_team_size:number;scheduled_start_at:string|null;start_scheduled_at:string|null;start_ready_at:string|null;auto_start_paused_at:string|null;auto_start_pause_reason:string|null;auto_start_blocked_at:string|null;auto_start_block_reason:string|null;auto_start_failure:string|null;recruitment_open:boolean};
type RunAction='pause_run'|'resume_run'|'block_run'|'unblock_run'|'retry_run'|'start_run';

function inputDate(value:string|null|undefined){if(!value)return'';const date=new Date(value);if(Number.isNaN(date.getTime()))return'';const pad=(part:number)=>String(part).padStart(2,'0');return`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`}
function cutoffIso(value:string){if(!value)return null;const date=new Date(value);return Number.isNaN(date.getTime())?undefined:date.toISOString()}
function remaining(value:string|null){if(!value)return null;const ms=new Date(value).getTime()-Date.now();if(ms<=0)return'Due now';const minutes=Math.ceil(ms/60_000);if(minutes<60)return`${minutes} min remaining`;const hours=Math.floor(minutes/60);const mins=minutes%60;return`${hours}h${mins?` ${mins}m`:''} remaining`}

export default function AdminProjectAdmissionPolicy({projectId,projectType,partnerName=null,admissionMode,autoStartDelayMinutes,autoStartPaused,lateJoiningEnabled=true,lateJoiningCutoffAt=null,projectSharingEnabled=true,memberInvitesEnabled=false}:Props){
 const router=useRouter();
 const partner=projectType==='partner';
 const[mode,setMode]=useState<'auto'|'review_required'>(partner?'review_required':admissionMode);
 const[delay,setDelay]=useState(Math.max(360,Math.min(360,autoStartDelayMinutes||360)));
 const[paused,setPaused]=useState(autoStartPaused);
 const[lateJoining,setLateJoining]=useState(lateJoiningEnabled);
 const[cutoff,setCutoff]=useState(inputDate(lateJoiningCutoffAt));
 const[sharing,setSharing]=useState(projectSharingEnabled);
 const[invites,setInvites]=useState(memberInvitesEnabled);
 const[runs,setRuns]=useState<Run[]>([]);
 const[reasons,setReasons]=useState<Record<string,string>>({});
 const[conversionReason,setConversionReason]=useState('');
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');

 const load=useCallback(async()=>{
  const response=await fetch(`/api/admin/project-admission?project_id=${encodeURIComponent(projectId)}`);
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||'Unable to load admission policy.');
  const item=body.item as Policy;
  const effective=item.effective_admission_mode==='auto'?'auto':'review_required';
  setMode(effective);
  setDelay(360);
  setPaused(Boolean(item.auto_start_paused_at));
  setLateJoining(item.late_joining_enabled!==false);
  setCutoff(inputDate(item.late_joining_cutoff_at));
  setSharing(item.project_sharing_enabled!==false);
  setInvites(item.member_invites_enabled===true);
  setRuns(Array.isArray(body.runs)?body.runs:[]);
 },[projectId]);
 useEffect(()=>{let active=true;void load().catch(()=>{if(active)setMessage('Admission policy could not be refreshed. Existing values remain unchanged until you save.')});return()=>{active=false}},[load]);

 async function save(){
  const lateJoiningCutoff=cutoffIso(cutoff);
  if(lateJoiningCutoff===undefined){setMessage('Choose a valid late-joining cutoff date and time.');return}
  if(partner&&mode==='auto'){setMessage('Partner Projects always require human review.');return}
  setBusy(true);setMessage('Saving admission policy…');
  try{
   const response=await fetch('/api/admin/project-admission',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,admission_mode:mode,auto_start_delay_minutes:360,auto_start_paused:paused,late_joining_enabled:lateJoining,late_joining_cutoff_at:lateJoiningCutoff,project_sharing_enabled:sharing,member_invites_enabled:invites})});
   const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update admission policy.');
   setMessage('Admission and recruitment policy updated.');await load();router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update admission policy.')}finally{setBusy(false)}
 }

 async function runAction(run:Run,action:RunAction){
  const reason=(reasons[run.id]||'').trim();
  if(action==='block_run'&&!reason){setMessage(`Add a reason before blocking Team ${run.run_number}.`);return}
  setBusy(true);setMessage(`${action==='pause_run'?'Pausing':action==='resume_run'?'Resuming':action==='block_run'?'Blocking':action==='unblock_run'?'Unblocking':action==='start_run'?'Starting':'Retrying'} Team ${run.run_number}…`);
  try{
   const response=await fetch('/api/admin/project-admission',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:run.id,action,reason})});
   const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.blockers?.length?`Start still needs attention: ${body.blockers.join(', ')}.`:body.error||'Unable to update automatic start.');
   const copy:Record<RunAction,string>={pause_run:'Automatic start paused safely.',resume_run:'Automatic start resumed with a new valid start window.',block_run:'Automatic start blocked. It will not start until explicitly unblocked.',unblock_run:'Block removed and a new valid start window established.',retry_run:'Start retry completed safely.',start_run:'The ready run started safely after final readiness checks.'};
   setMessage(copy[action]);setReasons(current=>({...current,[run.id]:''}));await load();router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update automatic start.')}finally{setBusy(false)}
 }

 async function convertToReview(){
  if(!conversionReason.trim()){setMessage('Record why this AUTO project is being converted to human review.');return}
  setBusy(true);setMessage('Converting this Open AUTO project to review required…');
  try{
   const response=await fetch('/api/admin/project-admission',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,action:'convert_to_review_required',reason:conversionReason.trim()})});
   const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to convert this project.');
   setConversionReason('');setMessage('Project converted to REVIEW_REQUIRED. Waiting AUTO places and schedules were safely unwound into the human review path.');await load();router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to convert this project.')}finally{setBusy(false)}
 }

 const activeRuns=useMemo(()=>runs.filter(run=>!run.has_started&&run.status==='forming'),[runs]);
 return <section className="admissionPolicy" aria-labelledby="admission-policy-title">
  <div className="intro"><span className="eyebrow">ADMISSION &amp; START POLICY</span><h2 id="admission-policy-title">How members enter this project</h2>{partner?<p><strong>Partner Project — human review required.</strong> {partnerName?`${partnerName} `:''}applications can never enter AUTO qualification or the six-hour scheduler.</p>:<p>Open Projects may use AUTO or REVIEW_REQUIRED. Healthy AUTO runs need no approval: once start conditions are met, the six-hour window begins, Admin may intervene or start early, and otherwise the scheduler starts the run automatically after final readiness revalidation.</p>}</div>
  <div className="admissionGrid">
   <label>Admission mode<select value={partner?'review_required':mode} disabled={partner} onChange={event=>setMode(event.target.value as 'auto'|'review_required')}><option value="review_required">Review required</option>{!partner&&<option value="auto">Automatic qualification</option>}</select><small>{partner?'Locked by Partner Project policy.':'Canonical server policy; browser selection alone never grants AUTO.'}</small></label>
   <label>Auto-start intervention window<input type="text" value={mode==='auto'?'6 hours':'Not applicable'} disabled readOnly/><small>{mode==='auto'?'Fixed Phase 9 policy. The window begins only when participation readiness is first reached.':'REVIEW_REQUIRED projects do not use the AUTO intervention window.'}</small></label>
   <label className="checkControl"><input type="checkbox" checked={paused} disabled={partner||mode!=='auto'} onChange={event=>setPaused(event.target.checked)}/><span><strong>Pause new automatic starts</strong><small>AUTO qualification may continue, but new start scheduling is held while the project-level pause is active.</small></span></label>
   <label className="checkControl"><input type="checkbox" checked={lateJoining} disabled={partner&&mode!=='auto'} onChange={event=>setLateJoining(event.target.checked)}/><span><strong>Allow late joining</strong><small>Eligible members may join the same active run while policy and capacity allow.</small></span></label>
   <label>Late-joining cutoff <span>(optional)</span><input type="datetime-local" value={cutoff} disabled={!lateJoining} onChange={event=>setCutoff(event.target.value)}/></label>
   <label className="checkControl"><input type="checkbox" checked={sharing} onChange={event=>setSharing(event.target.checked)}/><span><strong>Allow project sharing</strong><small>Only the canonical public project URL is shared; it grants no membership or Lab authority.</small></span></label>
   <label className="checkControl"><input type="checkbox" checked={invites} onChange={event=>setInvites(event.target.checked)}/><span><strong>Enable invitation readiness</strong><small>Policy hook only. Invitations do not silently create membership.</small></span></label>
  </div>
  <div className="actions"><button className="button dark" type="button" disabled={busy} onClick={save}>{busy?'Working…':'Save admission policy'}</button></div>

  {!partner&&mode==='auto'&&<section className="convertBox" aria-labelledby="convert-review-title"><div><strong id="convert-review-title">Need human selection instead?</strong><p>Converting an unstarted Open AUTO project safely releases waiting AUTO places, cancels forming schedules and returns affected requests to the review queue. Started projects cannot be moved backwards.</p></div><label>Conversion reason<input value={conversionReason} onChange={event=>setConversionReason(event.target.value)} placeholder="Why human review is now required"/></label><button type="button" disabled={busy} onClick={()=>void convertToReview()}>Convert to review required</button></section>}

  {!partner&&mode==='auto'&&activeRuns.length>0&&<div className="runOps"><span className="eyebrow">AUTO START OVERSIGHT</span>{activeRuns.map(run=>{
   const state=run.auto_start_blocked_at?'START BLOCKED':run.auto_start_failure?'START NEEDS ATTENTION':run.auto_start_paused_at?'START PAUSED':run.scheduled_start_at?'START SCHEDULED':'TEAM FORMING';
   const noAction=Boolean(run.scheduled_start_at&&!run.auto_start_paused_at&&!run.auto_start_blocked_at&&!run.auto_start_failure);
   return <article key={run.id}><div className="runHead"><div><strong>Team {run.run_number}</strong><span>{state}</span></div>{noAction&&<em>No action required</em>}</div><dl><div><dt>Minimum</dt><dd>{run.required_team_size||1}</dd></div><div><dt>Ready since</dt><dd>{run.start_ready_at?new Date(run.start_ready_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not ready'}</dd></div><div><dt>Scheduled start</dt><dd>{run.scheduled_start_at?new Date(run.scheduled_start_at).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'}):'Not scheduled'}</dd></div><div><dt>Time remaining</dt><dd>{remaining(run.scheduled_start_at)||'—'}</dd></div></dl><p>{run.auto_start_blocked_at?'This run is explicitly blocked and cannot start until Admin unblocks it.':run.auto_start_failure?`Last issue: ${run.auto_start_failure}`:run.auto_start_paused_at?'The automatic start is paused. Members should only see a safe paused status, not the internal reason.':run.scheduled_start_at?'The scheduler will start this run automatically at the scheduled time after final readiness checks. Admin may intervene only if needed.':'Waiting for canonical minimum/readiness conditions before a start window can exist.'}</p><label className="reasonField">Admin intervention note<input value={reasons[run.id]||''} onChange={event=>setReasons(current=>({...current,[run.id]:event.target.value}))} placeholder="Non-sensitive operational reason"/></label><div className="runButtons">{run.scheduled_start_at&&!run.auto_start_paused_at&&!run.auto_start_blocked_at&&!run.auto_start_failure&&<button type="button" disabled={busy} onClick={()=>void runAction(run,'start_run')}>Start now</button>}{run.auto_start_blocked_at?<button type="button" disabled={busy} onClick={()=>void runAction(run,'unblock_run')}>Unblock</button>:<button type="button" disabled={busy} onClick={()=>void runAction(run,'block_run')}>Block start</button>}{run.auto_start_paused_at?<button type="button" disabled={busy||Boolean(run.auto_start_blocked_at)} onClick={()=>void runAction(run,'resume_run')}>Resume</button>:<button type="button" disabled={busy||Boolean(run.auto_start_blocked_at)} onClick={()=>void runAction(run,'pause_run')}>Pause</button>}{run.auto_start_failure&&<button type="button" disabled={busy||Boolean(run.auto_start_blocked_at)} onClick={()=>void runAction(run,'retry_run')}>Retry start</button>}</div></article>})}</div>}
  <div className="formStatus" role="status" aria-live="polite">{message}</div>
  <style jsx>{`
   .admissionPolicy{padding:18px;border:1px solid #d9dde2;border-radius:14px;background:#fff}.intro h2{margin:5px 0 7px;font-size:1.08rem}.intro p{margin:0;color:#5b6470;font-size:.72rem;line-height:1.55}.admissionGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.admissionGrid>label:not(.checkControl),.convertBox label,.reasonField{display:grid;gap:5px;font-size:.68rem;font-weight:800;color:#5b6470}.admissionGrid>label>span{font-weight:600}.admissionGrid small{font-size:.62rem;line-height:1.4;font-weight:600;color:#6b7280}.admissionGrid select,.admissionGrid input[type=number],.admissionGrid input[type=text],.admissionGrid input[type=datetime-local],.convertBox input,.reasonField input{min-height:44px;width:100%;box-sizing:border-box;border:1px solid #cfd4da;border-radius:9px;padding:8px 10px;background:#fff;color:#10131d}.checkControl{grid-column:1/-1;display:grid;grid-template-columns:22px minmax(0,1fr);gap:9px;padding:12px;border:1px solid #d9dde2;border-radius:10px;background:#fbfaf7}.checkControl input{width:18px;height:18px;margin-top:2px}.checkControl strong,.checkControl small{display:block}.checkControl strong{font-size:.72rem}.checkControl small{margin-top:3px;color:#5b6470;font-size:.66rem;line-height:1.45}.actions{display:flex;justify-content:flex-end;margin-top:12px}.convertBox{margin-top:16px;padding:14px;border:1px solid #e5c46c;border-radius:12px;background:#fffaf0;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.6fr) auto;gap:12px;align-items:end}.convertBox strong{font-size:.78rem}.convertBox p{margin:4px 0 0;color:#6b5a34;font-size:.67rem;line-height:1.45}.convertBox button,.runButtons button{min-height:44px;border:1px solid #cfd4da;border-radius:8px;background:#fff;padding:0 12px;font-weight:750;cursor:pointer}.runOps{display:grid;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #e6e8eb}.runOps article{padding:12px;border:1px solid #e2e5e8;border-radius:10px;background:#fbfaf7}.runHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.runHead>div{display:grid;gap:3px}.runHead span{font-size:.62rem;font-weight:850;color:#72501b}.runHead em{font-style:normal;font-size:.65rem;font-weight:800;color:#185b3c;background:#edf8f1;padding:5px 8px;border-radius:999px}.runOps dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.runOps dl>div{padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:#fff}.runOps dt{font-size:.58rem;color:#6b7280;text-transform:uppercase}.runOps dd{margin:3px 0 0;font-size:.68rem;font-weight:750}.runOps p{margin:6px 0 10px;color:#5b6470;font-size:.68rem;line-height:1.45}.runButtons{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.formStatus{min-height:20px;margin-top:10px;font-size:.7rem;color:#5b6470}.runButtons button:focus-visible,.convertBox button:focus-visible,.admissionPolicy input:focus-visible,.admissionPolicy select:focus-visible,.actions button:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:840px){.convertBox{grid-template-columns:1fr}.runOps dl{grid-template-columns:1fr 1fr}}@media(max-width:620px){.admissionGrid{grid-template-columns:1fr}.checkControl{grid-column:auto}.actions .button{width:100%}.runHead{display:grid}.runOps dl{grid-template-columns:1fr}.runButtons{display:grid;grid-template-columns:1fr}.runButtons button,.convertBox button{width:100%}}
  `}</style>
 </section>
}