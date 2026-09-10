'use client';

import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './ProjectMemberDepartureControls.module.css';

type Props={projectId:string;projectRunId:string;initialState:'none'|'leaving'};
type Handover={reason_category:string;optional_context:string;completed_work:string;open_work:string;file_references:string;decisions:string;risks:string;recommendations:string;open_responsibilities:string;handover_availability:string};
const initial:Handover={reason_category:'',optional_context:'',completed_work:'',open_work:'',file_references:'',decisions:'',risks:'',recommendations:'',open_responsibilities:'',handover_availability:''};
const hasOperationalContext=(value:Handover)=>[value.completed_work,value.open_work,value.file_references,value.decisions,value.risks,value.recommendations,value.open_responsibilities].some(item=>item.trim());

export default function ProjectMemberDepartureControls({projectId,projectRunId,initialState}:Props){
 const router=useRouter();
 const[state,setState]=useState(initialState);
 const[handover,setHandover]=useState<Handover>(initial);
 const[busy,setBusy]=useState(false);
 const[feedback,setFeedback]=useState('');
 const[error,setError]=useState(false);
 const statusRef=useRef<HTMLParagraphElement>(null);
 const change=(key:keyof Handover,value:string)=>setHandover(current=>({...current,[key]:value}));
 const submit=async(action:'request'|'complete')=>{
  if(action==='complete'&&!window.confirm('Complete your departure from this project run? Your private Lab, Chat, active Tasks and future private project access will end. Historical contribution and eligible verified Proof stay on record, and the project continues for the team.'))return;
  setBusy(true);setFeedback('');setError(false);
  try{
   const response=await fetch('/api/project-member-departure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId,action,...(action==='request'?handover:{})})});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||'Unable to update departure.');
   if(action==='request'){
    setState('leaving');setFeedback('Handover recorded. You remain an active member while your status is Leaving. Capacity is released only when you complete departure.');router.refresh();
   }else{
    setFeedback('Departure completed. Active access has ended; your historical contribution and eligible verified Proof remain recorded.');
    window.location.assign('/member/projects');
   }
  }catch(err){setError(true);setFeedback(err instanceof Error?err.message:'Unable to update departure.');queueMicrotask(()=>statusRef.current?.focus())}finally{setBusy(false)}
 };
 return <section className={styles.panel} aria-labelledby="member-departure-title">
  <div className={styles.heading}><span>MEMBERSHIP · HANDOVER</span><h3 id="member-departure-title">Leaving this project?</h3><p>Use this only when you need to leave an active project. Your project and run are not reset. Historical contribution and eligible verified Proof stay on record. After final departure, private active-member access ends and the team can recover responsibilities or fill the place where joining rules allow.</p></div>
  {state==='none'?<div className={styles.form}>
   <div className={styles.field}><label htmlFor="project-exit-reason">High-level reason</label><p id="project-exit-reason-help">Choose only a broad category. You do not need to disclose medical, family, employment or other sensitive personal information.</p><select id="project-exit-reason" value={handover.reason_category} onChange={event=>change('reason_category',event.target.value)} aria-describedby="project-exit-reason-help" disabled={busy}><option value="">Choose a reason</option><option value="availability_changed">Availability changed</option><option value="workload">Workload</option><option value="personal_circumstances">Personal circumstances</option><option value="role_fit">Role or fit</option><option value="technical_access">Technical or access issue</option><option value="other">Other</option></select></div>
   <div className={styles.field}><label htmlFor="project-exit-context">Optional context</label><p id="project-exit-context-help">Optional. Keep this operational and non-sensitive.</p><textarea id="project-exit-context" value={handover.optional_context} onChange={event=>change('optional_context',event.target.value)} maxLength={1000} rows={2} aria-describedby="project-exit-context-help" disabled={busy}/></div>
   <fieldset className={styles.handoverGroup}><legend>Practical handover</legend><p>Complete the sections that are relevant. Reference existing Mettelo files/resources instead of duplicating them. Do not include passwords, credentials, health information or confidential support-case detail.</p>
    <HandoverField id="completed-work" label="Completed work" value={handover.completed_work} onChange={value=>change('completed_work',value)} disabled={busy}/>
    <HandoverField id="open-work" label="Open work" value={handover.open_work} onChange={value=>change('open_work',value)} disabled={busy}/>
    <HandoverField id="file-references" label="Files and resource references" value={handover.file_references} onChange={value=>change('file_references',value)} disabled={busy}/>
    <HandoverField id="decisions" label="Important decisions" value={handover.decisions} onChange={value=>change('decisions',value)} disabled={busy}/>
    <HandoverField id="risks" label="Known delivery risks" value={handover.risks} onChange={value=>change('risks',value)} disabled={busy}/>
    <HandoverField id="recommendations" label="Recommended next steps" value={handover.recommendations} onChange={value=>change('recommendations',value)} disabled={busy}/>
    <HandoverField id="open-responsibilities" label="Open responsibilities" value={handover.open_responsibilities} onChange={value=>change('open_responsibilities',value)} disabled={busy}/>
    <HandoverField id="handover-availability" label="Limited handover availability (optional)" value={handover.handover_availability} onChange={value=>change('handover_availability',value)} disabled={busy} maxLength={500}/>
   </fieldset>
   <div className={styles.meta}><span>At least one practical delivery handover section is required; availability alone is optional context.</span><button type="button" onClick={()=>void submit('request')} disabled={busy||!handover.reason_category||!hasOperationalContext(handover)}>{busy?'Recording…':'Record handover'}</button></div>
  </div>:<div className={styles.ready}>
   <strong>LEAVING · Handover recorded</strong><p>You still have normal project access while the handover period is open. Complete departure only when you are ready for active membership, private Lab/Chat access and future project privileges to end.</p>
   <button type="button" onClick={()=>void submit('complete')} disabled={busy}>{busy?'Completing…':'Complete departure'}</button>
  </div>}
  {feedback&&<p ref={statusRef} tabIndex={error?-1:undefined} className={error?styles.error:styles.status} role={error?'alert':'status'} aria-live={error?'assertive':'polite'}>{feedback}</p>}
 </section>;
}

function HandoverField({id,label,value,onChange,disabled,maxLength=4000}:{id:string;label:string;value:string;onChange:(value:string)=>void;disabled:boolean;maxLength?:number}){return <div className={styles.field}><label htmlFor={`project-${id}`}>{label}</label><textarea id={`project-${id}`} value={value} onChange={event=>onChange(event.target.value)} maxLength={maxLength} rows={3} disabled={disabled}/></div>}
