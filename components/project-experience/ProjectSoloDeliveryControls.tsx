'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './ProjectSoloDeliveryControls.module.css';

type Props={
 projectId:string;
 projectRunId:string;
 participationMode:string;
 targetTeamSize:number;
 availablePlaces:number;
 recruitmentOpen:boolean;
 canOpenCollaboration:boolean;
 joiningCutoffAt:string|null;
};

function dateLabel(value:string|null){
 if(!value)return'No fixed joining deadline';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return'Joining deadline unavailable';
 return `Joining closes ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date)}`;
}

export default function ProjectSoloDeliveryControls(props:Props){
 const router=useRouter();
 const[open,setOpen]=useState(props.recruitmentOpen);
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState('');
 const[error,setError]=useState(false);
 const flexible=props.participationMode==='flexible';
 const joiningAvailable=flexible&&open&&props.availablePlaces>0;

 async function setAvailability(next:boolean){
  setBusy(true);setError(false);setMessage(next?'Opening a collaboration place…':'Closing the collaboration place…');
  try{
   const response=await fetch('/api/project-joining-availability',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:props.projectId,project_run_id:props.projectRunId,recruitment_open:next})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Unable to update joining availability.');
   setOpen(Boolean(body.recruitment_open));
   setMessage(next?'A collaboration place is now open. Eligible collaborators must still use the governed joining flow.':'The collaboration place is closed. Your existing project work is unchanged.');
   router.refresh();
  }catch(caught){setError(true);setMessage(caught instanceof Error?caught.message:'Unable to update joining availability.')}finally{setBusy(false)}
 }

 return <section className={styles.panel} aria-labelledby="solo-delivery-title" data-solo-delivery-controls>
  <div className={styles.intro}>
   <span>WORKING INDEPENDENTLY</span>
   <h3 id="solo-delivery-title">Your project is active now</h3>
   <p>You can continue tasks, milestones, resources and evidence in this same project run. Adding a collaborator later does not restart or replace your work.</p>
  </div>
  <dl className={styles.meta}>
   <div><dt>Current project state</dt><dd>Active · independent delivery</dd></div>
   <div><dt>Target team</dt><dd>{props.targetTeamSize} member{props.targetTeamSize===1?'':'s'}</dd></div>
   <div><dt>Joining availability</dt><dd>{joiningAvailable?`${props.availablePlaces} place${props.availablePlaces===1?'':'s'} available`:flexible?'Closed':'Independent only'}</dd></div>
   <div><dt>Joining window</dt><dd>{flexible?dateLabel(props.joiningCutoffAt):'Not applicable'}</dd></div>
  </dl>
  {flexible?<div className={styles.action}>
   <div><strong>{open?'Collaboration place open':'Need another collaborator?'}</strong><p>{open?'An eligible member may join this same run after the normal admission, capacity and joining checks.':'Open one governed collaboration place without creating another project or run.'}</p></div>
   {open?<button type="button" disabled={busy} onClick={()=>void setAvailability(false)}>{busy?'Updating…':'Close collaboration place'}</button>:<button type="button" disabled={busy||!props.canOpenCollaboration} onClick={()=>void setAvailability(true)}>{busy?'Updating…':'Open collaboration place'}</button>}
  </div>:<div className={styles.note}><strong>Independent delivery only</strong><p>This project is configured for Solo participation, so collaborator joining is not available in the current capacity contract.</p></div>}
  {flexible&&!open&&!props.canOpenCollaboration?<p className={styles.unavailable}>A collaboration place cannot be opened because the joining window or available capacity no longer permits it.</p>:null}
  <p className={styles.proof}>Independent work can support evidence such as technical delivery, ownership, problem solving, documentation and communication. Collaboration or peer-leadership evidence requires actual collaborative activity and is never inferred from solo delivery.</p>
  <div className={styles.status} role={error?'alert':'status'} aria-live={error?'assertive':'polite'}>{message}</div>
 </section>;
}
