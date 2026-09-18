'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';

type Props={
  projectId:string;
  runId:string;
  projectTitle:string;
  state:'TEAM_FORMING'|'ELIGIBILITY_WINDOW'|'READY_TO_START'|'NEEDS_ATTENTION'|'STARTED';
  confirmed:number;
  minimum:number;
  eligibleFrom:string|null;
  blockers:string[];
};

function words(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase())}

export default function AdminAutoStartAction({projectId,runId,projectTitle,state,confirmed,minimum,eligibleFrom,blockers}:Props){
  const router=useRouter();
  const[confirming,setConfirming]=useState(false);
  const[working,setWorking]=useState(false);
  const[message,setMessage]=useState('');

  async function start(){
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/admin/project-admission',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({project_id:projectId,project_run_id:runId,action:'start_run'})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok){
        const reason=Array.isArray(body.blockers)&&body.blockers.length
          ?body.blockers.map((item:string)=>words(item)).join(', ')
          :body.error||'The project is no longer ready to start.';
        throw new Error(reason);
      }
      setConfirming(false);
      setMessage(body.result?.alreadyStarted?'This project had already started.':'Project started successfully.');
      router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:'Project cannot start yet.')}finally{setWorking(false)}
  }

  if(state==='STARTED')return <div className="autoActionState"><a href={`/member/projects/${encodeURIComponent(projectId)}`}>Open Lab</a><a href={`/admin/project-operations/projects/${encodeURIComponent(projectId)}`}>View project</a></div>;
  if(state!=='READY_TO_START')return <div className="autoActionState"><a href={`/admin/project-operations/projects/${encodeURIComponent(projectId)}`}>{state==='NEEDS_ATTENTION'?'View issue':'View status'}</a>{state==='ELIGIBILITY_WINDOW'&&eligibleFrom?<small>Eligible after {new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(eligibleFrom))}</small>:null}{state==='NEEDS_ATTENTION'&&blockers.length?<small>{blockers.map(words).join(' · ')}</small>:null}</div>;

  return <div className="autoActionState">
    <button className="startNow" type="button" onClick={()=>setConfirming(true)}>Start project now</button>
    <a href={`/admin/project-operations/projects/${encodeURIComponent(projectId)}`}>View status</a>
    {message&&<span className="actionMessage" role="status">{message}</span>}
    {confirming&&<div className="startBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!working)setConfirming(false)}}>
      <section className="startDialog" role="dialog" aria-modal="true" aria-labelledby={`start-project-${runId}`}>
        <span className="eyebrow">AUTO · READY TO START</span>
        <h3 id={`start-project-${runId}`}>Start project?</h3>
        <p><strong>{projectTitle}</strong> has met its minimum participation requirement and completed the six-hour eligibility window.</p>
        <dl><div><dt>Confirmed members</dt><dd>{confirmed}</dd></div><div><dt>Required minimum</dt><dd>{minimum}</dd></div></dl>
        <p>Starting will activate this current run and member access to the project Lab. The server will revalidate participation, capacity, readiness and lifecycle state before activation.</p>
        <div className="startDialogActions"><button type="button" onClick={()=>setConfirming(false)} disabled={working}>Cancel</button><button className="confirmStart" type="button" onClick={()=>void start()} disabled={working}>{working?'Revalidating…':'Start project'}</button></div>
      </section>
    </div>}
    <style jsx>{`
      .autoActionState{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.autoActionState>a,.startNow{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border:1px solid #cfd4da;border-radius:8px;background:#fff;color:#10131d;font:800 .68rem/1.2 inherit;text-decoration:none;cursor:pointer}.startNow{border-color:#10131d;background:#10131d;color:#fff}.autoActionState small{width:100%;color:#66707c;font-size:.62rem;line-height:1.4}.actionMessage{width:100%;color:#5b6470;font-size:.68rem}.startBackdrop{position:fixed;inset:0;z-index:1500;display:grid;place-items:center;padding:16px;background:rgba(15,18,26,.58)}.startDialog{width:min(520px,100%);padding:22px;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.22)}.startDialog h3{margin:6px 0 8px;font-size:1.35rem}.startDialog p{color:#5b6470;line-height:1.55}.startDialog dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0}.startDialog dl>div{padding:10px;border:1px solid #e0e3e7;border-radius:9px}.startDialog dt{font-size:.6rem;text-transform:uppercase;color:#6b7280}.startDialog dd{margin:4px 0 0;font-weight:850}.startDialogActions{display:flex;justify-content:flex-end;gap:8px}.startDialogActions button{min-height:44px;padding:9px 13px;border:1px solid #cfd4da;border-radius:8px;background:#fff;font-weight:800;cursor:pointer}.startDialogActions .confirmStart{border-color:#10131d;background:#10131d;color:#fff}.autoActionState button:focus-visible,.autoActionState a:focus-visible,.startDialog button:focus-visible{outline:3px solid #173f8f;outline-offset:3px}@media(max-width:480px){.autoActionState>a,.startNow{width:100%}.startDialog dl{grid-template-columns:1fr}.startDialogActions{display:grid}.startDialogActions button{width:100%}}
    `}</style>
  </div>;
}