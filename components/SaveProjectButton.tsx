'use client';

import {useState} from 'react';
import styles from './SaveProjectButton.module.css';

type Props={projectId:string;initialSaved:boolean;compact?:boolean};

export default function SaveProjectButton({projectId,initialSaved,compact=false}:Props){
  const [saved,setSaved]=useState(initialSaved);
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState('');
  const [failed,setFailed]=useState(false);

  async function toggle(){
    if(working)return;
    const previous=saved;
    const next=!saved;
    setWorking(true);
    setFailed(false);
    setMessage(next?'Saving…':'Removing…');
    setSaved(next);
    try{
      const response=await fetch('/api/projects/saved',{method:previous?'DELETE':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({project_id:projectId})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to update saved project.');
      const confirmed=Boolean(body.saved);
      setSaved(confirmed);
      setMessage(confirmed?'Saved to My Mettelo':'Removed from Saved');
    }catch(error){
      setSaved(previous);
      setFailed(true);
      setMessage(error instanceof Error?error.message:'Unable to update saved project.');
    }finally{
      setWorking(false);
    }
  }

  return <div className={`${styles.wrap} ${compact?styles.compact:''}`}>
    <button type="button" className="mdButton mdButtonSoft mdSaveButton" aria-pressed={saved} disabled={working} onClick={toggle}>
      <span aria-hidden="true">{saved?'♥':'♡'}</span>{working?'Updating…':saved?'Saved':'Save project'}
    </button>
    {message&&<span className={`${styles.feedback} ${failed?styles.error:''}`} role="status" aria-live="polite">{message}</span>}
  </div>;
}
