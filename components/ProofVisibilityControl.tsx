'use client';

import {useState} from 'react';

const choices=[
  {value:'public',label:'Public',copy:'Anyone with the link can view and share this verified Proof.'},
  {value:'mettelo_only',label:'Mettelo only',copy:'Only signed-in Mettelo members can see this Proof.'},
  {value:'private',label:'Private',copy:'Only you and authorised Mettelo reviewers can see this Proof.'}
] as const;

export default function ProofVisibilityControl({id,initialVisibility}:{id:string;initialVisibility:string}){
  const [visibility,setVisibility]=useState(initialVisibility||'private');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function change(next:string){
    if(next===visibility||busy)return;
    setBusy(true);setMessage('Saving visibility…');
    try{
      const response=await fetch('/api/proof-visibility',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,visibility:next})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to update visibility.');
      setVisibility(next);setMessage(body.message||'Visibility updated.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update visibility.');}
    finally{setBusy(false);}
  }
  return <fieldset className="proofVisibility" disabled={busy}>
    <legend>Who can see this verified Proof?</legend>
    {choices.map(choice=><label key={choice.value} className="proofVisibilityOption"><input type="radio" name={`proof-visibility-${id}`} value={choice.value} checked={visibility===choice.value} onChange={()=>void change(choice.value)}/><span><strong>{choice.label}</strong><small>{choice.copy}</small></span></label>)}
    <div className="formStatus" role="status" aria-live="polite">{message}</div>
    <style jsx>{`
      .proofVisibility{border:1px solid var(--line);border-radius:14px;padding:14px;margin:16px 0;display:grid;gap:10px}.proofVisibility legend{font-weight:800;padding:0 6px}.proofVisibilityOption{display:flex;gap:10px;align-items:flex-start;min-height:44px;padding:8px;border-radius:10px;cursor:pointer}.proofVisibilityOption:has(input:focus-visible){outline:3px solid #1d4ed8;outline-offset:2px}.proofVisibilityOption input{margin-top:4px}.proofVisibilityOption span{display:grid;gap:2px}.proofVisibilityOption small{color:var(--slate);line-height:1.45}@media(max-width:480px){.proofVisibility{padding:12px}.proofVisibilityOption{padding:10px 6px}}
    `}</style>
  </fieldset>;
}
