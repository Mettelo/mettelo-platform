'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './ProjectMemberDepartureControls.module.css';

type Props={projectId:string;projectRunId:string;initialState:'none'|'leaving'};

export default function ProjectMemberDepartureControls({projectId,projectRunId,initialState}:Props){
 const router=useRouter();
 const[state,setState]=useState(initialState);
 const[handover,setHandover]=useState('');
 const[busy,setBusy]=useState(false);
 const[feedback,setFeedback]=useState('');
 const[error,setError]=useState(false);
 const submit=async(action:'request'|'complete')=>{
  if(action==='complete'&&!window.confirm('Complete your departure from this project run? You will lose access to the private Lab and Chat, while your previous work and Proof history remain recorded.'))return;
  setBusy(true);setFeedback('');setError(false);
  try{
   const response=await fetch('/api/project-member-departure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,action,handover_note:action==='request'?handover:undefined})});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||'Unable to update departure.');
   if(action==='request'){
    setState('leaving');setFeedback('Handover recorded. You remain an active member until you complete departure.');router.refresh();
   }else{
    setFeedback('Departure completed. Your previous work remains recorded and active project access has ended.');
    window.location.assign('/member/projects');
   }
  }catch(err){setError(true);setFeedback(err instanceof Error?err.message:'Unable to update departure.')}finally{setBusy(false)}
 };
 return <section className={styles.panel} aria-labelledby="member-departure-title">
  <div className={styles.heading}><span>MEMBERSHIP · HANDOVER</span><h3 id="member-departure-title">Leaving this project?</h3><p>Use this only when you need to leave an active project. Your previous work and eligible Proof stay on record. After departure, your private Lab and Chat access ends and the team can fill the available place where project rules allow.</p></div>
  {state==='none'?<div className={styles.form}>
   <label htmlFor="project-handover">Handover for the team</label>
   <p id="project-handover-help">Summarise current work, blockers, useful files or links already stored in Mettelo, and recommended next steps. Do not include passwords, credentials, health information or other sensitive personal data.</p>
   <textarea id="project-handover" value={handover} onChange={event=>setHandover(event.target.value)} minLength={20} maxLength={2000} rows={5} aria-describedby="project-handover-help" disabled={busy}/>
   <div className={styles.meta}><span>{handover.length}/2,000</span><button type="button" onClick={()=>void submit('request')} disabled={busy||handover.trim().length<20}>{busy?'Recording…':'Record handover'}</button></div>
  </div>:<div className={styles.ready}>
   <strong>Handover recorded · Leaving</strong><p>You still have normal project access while your membership is in Leaving state. Complete departure only when you are ready to stop active participation.</p>
   <button type="button" onClick={()=>void submit('complete')} disabled={busy}>{busy?'Completing…':'Complete departure'}</button>
  </div>}
  {feedback&&<p className={error?styles.error:styles.status} role={error?'alert':'status'} aria-live={error?'assertive':'polite'}>{feedback}</p>}
 </section>;
}
