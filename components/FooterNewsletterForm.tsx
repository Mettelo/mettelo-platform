'use client';

import {FormEvent,useState} from 'react';

export default function FooterNewsletterForm(){
  const [submitting,setSubmitting]=useState(false);
  const [status,setStatus]=useState<{kind:'success'|'error';message:string}|null>(null);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    const email=String(data.get('email')||'').trim();
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
      setStatus({kind:'error',message:error instanceof Error?error.message:'We could not subscribe you. Please try again.'});
    }finally{
      setSubmitting(false);
    }
  }

  return <form className="footerNewsletterForm" onSubmit={submit} aria-label="Subscribe to Mettelo updates">
    <label className="srOnly" htmlFor="footer-email">Email address for Mettelo updates</label>
    <div className="footerNewsletterInline">
      <input id="footer-email" type="email" name="email" required autoComplete="email" placeholder="Get Mettelo updates"/>
      <button aria-label="Subscribe to Mettelo updates" type="submit" disabled={submitting}>{submitting?'…':'→'}</button>
    </div>
    {status&&<p className={`footerNewsletterStatus ${status.kind}`} role="status" aria-live="polite">{status.message}</p>}
  </form>;
}
