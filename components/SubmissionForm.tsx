'use client';

import { FormEvent, ReactNode, useState } from 'react';

type Props={
  formType:string;
  children:ReactNode;
  submitLabel:string;
  className?:string;
  successMessage?:string;
};

function confirmationType(formType:string){return formType==='project_application'?'project_interest':formType}

export default function SubmissionForm({formType,children,submitLabel,className='formCard'}:Props){
  const [status,setStatus]=useState<'idle'|'submitting'|'error'>('idle');
  const [message,setMessage]=useState('');

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    try{
      const projectInterest=formType==='project_application';
      const requestBody=projectInterest?{project_id:data.project_id,application_kind:'interest',requested_role:data.role,contribution_statement:data.contribution,portfolio_url:data.profile}:{formType,data};
      const response=await fetch(projectInterest?'/api/project-applications':'/api/forms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(requestBody)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'We could not submit this form. Please try again.');
      if(typeof window!=='undefined' && (window as Window & {gtag?:(...args:unknown[])=>void}).gtag){
        (window as Window & {gtag?:(...args:unknown[])=>void}).gtag?.('event',`${formType}_submitted`);
      }
      window.location.assign(`/submitted?type=${encodeURIComponent(confirmationType(formType))}`);
    }catch(error){
      setStatus('error');
      setMessage(error instanceof Error?error.message:'We could not submit this form. Please try again.');
    }
  }

  return <form className={className} onSubmit={submit} noValidate={false}>
    {children}
    <button className="button dark" type="submit" disabled={status==='submitting'} style={{width:'100%',marginTop:20}}>
      {status==='submitting'?'Submitting…':submitLabel}
    </button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form>;
}
