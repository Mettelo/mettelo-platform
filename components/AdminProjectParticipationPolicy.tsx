'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

type Mode='team'|'solo'|'flexible';
type Props={projectId:string;participationMode:Mode;minTeamSize:number;targetTeamSize:number;maxTeamSize:number;currentRun?:{id:string;status:string;has_started:boolean;recruitment_open:boolean}|null};

export default function AdminProjectParticipationPolicy({projectId,participationMode,minTeamSize,targetTeamSize,maxTeamSize,currentRun=null}:Props){
  const router=useRouter();
  const[mode,setMode]=useState<Mode>(participationMode);
  const[minimum,setMinimum]=useState(minTeamSize);
  const[target,setTarget]=useState(targetTeamSize);
  const[maximum,setMaximum]=useState(maxTeamSize);
  const[recruitmentOpen,setRecruitmentOpen]=useState(currentRun?.recruitment_open!==false);
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');

  function chooseMode(next:Mode){
    setMode(next);
    if(next==='solo'){
      setMinimum(1);
      setTarget(current=>Math.max(1,current));
      setMaximum(current=>Math.max(current,target,1));
      return;
    }
    if(mode==='solo'){
      const nextMin=2;
      setMinimum(nextMin);setTarget(current=>Math.max(nextMin,current));setMaximum(current=>Math.max(nextMin,current));
    }
  }

  function setTargetSafe(raw:string){const next=Math.max(minimum,Math.min(50,Number(raw)||minimum));setTarget(next);setMaximum(current=>Math.max(current,next))}
  function setMaximumSafe(raw:string){setMaximum(Math.max(target,Math.min(50,Number(raw)||target)))}

  async function save(){
    setBusy(true);setMessage('Saving participation policy…');
    try{
      const response=await fetch('/api/admin/project-participation',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,participation_mode:mode,min_team_size:mode==='solo'?1:minimum,target_team_size:target,max_team_size:maximum})});
      const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update project participation policy.');
      setMode(body.item.participation_mode);setMinimum(body.item.min_team_size);setTarget(body.item.target_team_size);setMaximum(body.item.max_team_size);
      setMessage('Participation policy updated. Forming-run readiness has been recalculated server-side.');router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update project participation policy.')}finally{setBusy(false)}
  }

  async function setRecruitment(open:boolean){if(!currentRun)return;setBusy(true);setMessage(open?'Reopening recruitment…':'Closing recruitment…');try{const response=await fetch('/api/admin/project-participation',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,action:'set_recruitment',project_run_id:currentRun.id,recruitment_open:open})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update recruitment.');setRecruitmentOpen(Boolean(body.run?.recruitment_open));setMessage(open?'Recruitment reopened for the same active run.':'Recruitment closed for the active run.');router.refresh()}catch(error){setMessage(error instanceof Error?error.message:'Unable to update recruitment.')}finally{setBusy(false)}}

  const solo=mode==='solo';const activeRun=Boolean(currentRun?.has_started&&currentRun?.status==='active');
  return <section className="phase9Policy" aria-labelledby="phase9-policy-title">
    <div><span className="eyebrow">PARTICIPATION &amp; CAPACITY</span><h2 id="phase9-policy-title">How this project forms and stays open</h2><p>Minimum controls participation readiness. Target is desirable planning capacity and never blocks start after the applicable minimum. Maximum is the hard capacity boundary.</p></div>
    <fieldset disabled={busy}><legend>Participation mode</legend><div className="modeGrid">{(['team','solo','flexible'] as Mode[]).map(item=><label key={item}><input type="radio" name="admin-project-participation-mode" checked={mode===item} onChange={()=>chooseMode(item)}/><span><strong>{item.toUpperCase()}</strong><small>{item==='team'?'Configured minimum required before the start process.':item==='solo'?'Starts independently with one member; target and maximum may allow later collaborators on the same run.':'Solo/Either can work independently; Team preference uses the configured minimum.'}</small></span></label>)}</div></fieldset>
    <div className="capacityGrid">
      <label>{mode==='flexible'?'Team minimum':'Minimum to start'}<input type="number" min="1" max="50" value={solo?1:minimum} disabled={busy||solo} onChange={event=>setMinimum(Math.max(mode==='team'?2:1,Math.min(50,Number(event.target.value)||1)))}/></label>
      <label>{solo?'Target capacity':'Target team'}<input type="number" min="1" max="50" value={target} disabled={busy} onChange={event=>setTargetSafe(event.target.value)}/></label>
      <label>Maximum places<input type="number" min="1" max="50" value={maximum} disabled={busy} onChange={event=>setMaximumSafe(event.target.value)}/></label>
    </div>
    {solo&&<p className="soloHelp">Solo remains participation-ready at one. A target/maximum above one only governs optional later collaborators; it does not make Solo incomplete or delay start.</p>}
    <div className="policyActions"><button type="button" className="button dark" disabled={busy} onClick={()=>void save()}>{busy?'Working…':'Save participation policy'}</button></div>
    {activeRun&&<div className="recruitment"><div><strong>{recruitmentOpen?'Recruitment open':'Recruitment closed'}</strong><p>Closing recruitment does not stop or replace the active run. Reopening is permitted only while late joining, the joining window and maximum capacity still allow it.</p></div><button type="button" disabled={busy} onClick={()=>void setRecruitment(!recruitmentOpen)}>{recruitmentOpen?'Close recruitment':'Reopen recruitment'}</button></div>}
    <div className="formStatus" role="status" aria-live="polite">{message}</div>
    <style jsx>{`.phase9Policy{padding:18px;border:1px solid #d9dde2;border-radius:14px;background:#fff}.phase9Policy h2{margin:5px 0 7px;font-size:1.08rem}.phase9Policy p{margin:0;color:#5b6470;font-size:.72rem;line-height:1.55}.phase9Policy fieldset{border:0;padding:0;margin:14px 0 0}.phase9Policy legend{font-size:.68rem;font-weight:850;color:#5b6470;margin-bottom:7px}.modeGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.modeGrid label{display:grid;grid-template-columns:20px minmax(0,1fr);gap:8px;padding:11px;border:1px solid #d9dde2;border-radius:10px;background:#fbfaf7;min-height:72px}.modeGrid input{width:17px;height:17px;margin-top:2px}.modeGrid strong,.modeGrid small{display:block}.modeGrid strong{font-size:.72rem}.modeGrid small{margin-top:4px;color:#5b6470;font-size:.63rem;line-height:1.4}.capacityGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:11px}.capacityGrid label{display:grid;gap:5px;font-size:.68rem;font-weight:800;color:#5b6470}.capacityGrid input{min-height:44px;width:100%;box-sizing:border-box;border:1px solid #cfd4da;border-radius:9px;padding:8px 10px;background:#fff;color:#10131d}.soloHelp{margin-top:9px!important}.policyActions{display:flex;justify-content:flex-end;margin-top:12px}.recruitment{margin-top:14px;padding:13px;border:1px solid #d9dde2;border-radius:10px;background:#fbfaf7;display:flex;align-items:center;justify-content:space-between;gap:14px}.recruitment strong{font-size:.78rem}.recruitment button{min-height:44px;border:1px solid #b8bec7;border-radius:9px;padding:0 12px;background:#fff;font-weight:800}.formStatus{min-height:20px;margin-top:8px;font-size:.69rem;color:#5b6470}@media(max-width:700px){.modeGrid,.capacityGrid{grid-template-columns:1fr}.recruitment{display:grid}.policyActions{justify-content:stretch}.policyActions button,.recruitment button{width:100%}}@media(max-width:340px){.phase9Policy{padding:14px}.modeGrid label{min-width:0}.capacityGrid input{min-width:0}}`}</style>
  </section>;
}