'use client';

import { FormEvent, ReactNode, useState } from 'react';

type Props={
  formType:string;
  children:ReactNode;
  submitLabel:string;
  className?:string;
  successMessage?:string;
};

export default function SubmissionForm({formType,children,submitLabel,className='formCard',successMessage='Thanks — your submission has been received.'}:Props){
  const [status,setStatus]=useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setStatus('submitting');
    setMessage('');
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    try{
      const response=await fetch('/api/forms',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({formType,data})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'We could not submit this form. Please try again.');
      form.reset();
      setStatus('success');
      setMessage(successMessage);
      if(typeof window!=='undefined' && (window as Window & {gtag?:(...args:unknown[])=>void}).gtag){
        (window as Window & {gtag?:(...args:unknown[])=>void}).gtag?.('event',`${formType}_submitted`);
      }
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
