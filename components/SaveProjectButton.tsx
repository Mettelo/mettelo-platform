'use client';

import {useState} from 'react';

type Props={projectId:string;initialSaved:boolean;compact?:boolean};

export default function SaveProjectButton({projectId,initialSaved,compact=false}:Props){
  const [saved,setSaved]=useState(initialSaved);const [working,setWorking]=useState(false);const [message,setMessage]=useState('');
  async function toggle(){if(working)return;setWorking(true);setMessage('');try{const response=await fetch('/api/projects/saved',{method:saved?'DELETE':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update saved project.');setSaved(Boolean(body.saved));setMessage(body.message||'Saved project updated.')}catch(error){setMessage(error instanceof Error?error.message:'Unable to update saved project.')}finally{setWorking(false)}}
  return <div className={`mdSave${compact?' mdSaveCompact':''}`}><button type="button" className="mdButton mdButtonSoft mdSaveButton" aria-pressed={saved} disabled={working} onClick={toggle}><span aria-hidden="true">{saved?'♥':'♡'}</span>{working?'Updating…':saved?'Saved':'Save project'}</button><span className="mdSrOnly" role="status" aria-live="polite">{message}</span></div>;
}
