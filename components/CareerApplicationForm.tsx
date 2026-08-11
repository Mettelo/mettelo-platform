'use client';

import {useState} from 'react';

export default function CareerApplicationForm({roleId,roleTitle}:{roleId:string;roleTitle:string}){
  const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setStatus('');
    const form=event.currentTarget;const data=new FormData(form);data.set('role_id',roleId);
    try{const response=await fetch('/api/careers/apply',{method:'POST',body:data});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to submit application.');form.reset();setStatus('Application submitted. Check your email for confirmation.');}
    catch(error){setStatus(error instanceof Error?error.message:'Unable to submit application.');}finally{setBusy(false);}
  }
  return <form className="formCard" onSubmit={submit}>
    <div className="formGrid">
      <label>Full name<input name="full_name" required maxLength={140}/></label>
      <label>Email<input name="email" type="email" required autoComplete="email"/></label>
      <label>Phone<input name="phone" maxLength={50}/></label>
      <label>Current location<input name="location" maxLength={160}/></label>
      <label>LinkedIn URL<input name="linkedin_url" type="url" placeholder="https://linkedin.com/in/..."/></label>
      <label>Portfolio / GitHub URL<input name="portfolio_url" type="url" placeholder="https://..."/></label>
      <label>Work eligibility / authorisation<input name="work_authorisation" maxLength={300} placeholder="For example: UK unrestricted / requires sponsorship"/></label>
      <label>CV (PDF or DOCX, max 5MB)<input name="cv" type="file" required accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"/></label>
    </div>
    <label>Why do you want to join Mettelo?<textarea name="motivation" required minLength={80} maxLength={3000} rows={6}/></label>
    <label>Relevant experience for {roleTitle}<textarea name="relevant_experience" required minLength={100} maxLength={4000} rows={7}/></label>
    <div className="panel" style={{margin:'16px 0'}}><strong>Application privacy</strong><p style={{marginBottom:0}}>Your application is used only for Mettelo recruitment. CV files are stored privately and are not exposed on your public profile.</p></div>
    <button className="button dark" disabled={busy} type="submit">{busy?'Submitting…':'Apply to Mettelo →'}</button>
    <div className="formStatus" role="status" aria-live="polite">{status}</div>
  </form>;
}
