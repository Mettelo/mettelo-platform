'use client';

import {FormEvent,useState} from 'react';

const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Status={kind:'success'|'validation'|'server';message:string};

export default function FooterNewsletterForm(){
  const [submitting,setSubmitting]=useState(false);
  const [status,setStatus]=useState<Status|null>(null);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    const email=String(data.get('email')||'').trim();
    const emailInput=form.elements.namedItem('email');

    if(!email){
      setStatus({kind:'validation',message:'Enter your email address.'});
      if(emailInput instanceof HTMLInputElement)emailInput.focus();
      return;
    }
    if(!emailPattern.test(email)){
      setStatus({kind:'validation',message:'Enter a valid email address, such as name@example.com.'});
      if(emailInput instanceof HTMLInputElement)emailInput.focus();
      return;
    }

    setSubmitting(true);
    setStatus(null);
    try{
      const response=await fetch('/api/newsletter',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,preferences:{projects:true,events:true,opportunities:true,insights:true}})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'We could not subscribe you. Please try again.');
      form.reset();
      setStatus({kind:'success',message:'You’re subscribed to Mettelo updates. Check your inbox for your preferences link.'});
    }catch(error){
      setStatus({kind:'server',message:error instanceof Error?error.message:'We could not subscribe you. Please try again.'});
    }finally{
      setSubmitting(false);
    }
  }

  const invalid=status?.kind==='validation';
  const statusId='footer-newsletter-status';

  return <form className="footerNewsletterForm" onSubmit={submit} aria-label="Subscribe to Mettelo updates" noValidate>
    <label className="srOnly" htmlFor="footer-email">Email address for Mettelo updates</label>
    <div className="footerNewsletterInline">
      <input id="footer-email" type="email" name="email" required maxLength={320} inputMode="email" autoComplete="email" spellCheck={false} placeholder="Get Mettelo updates" aria-invalid={invalid} aria-describedby={status?statusId:undefined} onChange={()=>invalid&&setStatus(null)}/>
      <button aria-label="Subscribe to Mettelo updates" type="submit" disabled={submitting}>{submitting?'…':'→'}</button>
    </div>
    {status&&<p id={statusId} className={`footerNewsletterStatus ${status.kind}`} role={status.kind==='success'?'status':'alert'} aria-live="polite">{status.message}</p>}
  </form>;
}
