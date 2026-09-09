'use client';

import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import styles from './ProjectTeamRecoverySection.module.css';

export default function ProjectTeamRecoveryControls({projectId,projectRunId,recruitmentOpen}:{projectId:string;projectRunId:string;recruitmentOpen:boolean}){
 const router=useRouter();const[busy,setBusy]=useState(false);const[feedback,setFeedback]=useState('');const[error,setError]=useState(false);const ref=useRef<HTMLParagraphElement>(null);
 const request=async()=>{setBusy(true);setFeedback('');setError(false);try{const response=await fetch('/api/project-replacement-recovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId,project_run_id:projectRunId})});const body=await response.json();if(!response.ok)throw new Error(body.error||'Unable to request replacement recovery.');setFeedback(body.already_recovered?'The vacancy has already been recovered.':'Replacement recovery is recorded and normal recruitment is open for this same run.');router.refresh()}catch(err){setError(true);setFeedback(err instanceof Error?err.message:'Unable to request replacement recovery.');queueMicrotask(()=>ref.current?.focus())}finally{setBusy(false)}};
 return <div className={styles.recoveryAction}><p>{recruitmentOpen?'Recruitment is already open for this run. You can record the replacement request without creating another run.':'Requesting recovery opens normal recruitment only when the project mode, joining cutoff and capacity policy allow it.'}</p><button type="button" onClick={()=>void request()} disabled={busy}>{busy?'Requesting…':'Request replacement'}</button>{feedback&&<p ref={ref} tabIndex={error?-1:undefined} role={error?'alert':'status'} aria-live={error?'assertive':'polite'} className={error?styles.error:styles.success}>{feedback}</p>}</div>;
}
