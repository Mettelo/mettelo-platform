'use client';

import { FormEvent, useState } from 'react';

type Project={id:string;title:string};

export default function ContributionForm({projects}:{projects:Project[]}){
  const [status,setStatus]=useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('submitting');setMessage('');
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    const payload={...data,is_public:data.is_public==='on'};
    try{
      const response=await fetch('/api/contributions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to submit contribution.');
      setStatus('success');setMessage('Evidence submitted for review. Its verification status now appears in My Mettelo.');form.reset();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to submit contribution.');}
  }
  if(!projects.length) return <div className="emptyState"><h3>No active project membership.</h3><p>You can submit project evidence after you are accepted into a Labs team.</p></div>;
  return <form className="formCard" onSubmit={submit}>
    <div className="panelHead"><div><span className="cardNumber">CONTRIBUTION EVIDENCE</span><h3 style={{marginTop:8}}>Submit work for verification</h3></div><span className="chip">PROOF</span></div>
    <label htmlFor="proof-project">Project *</label><select id="proof-project" name="project_id" required defaultValue=""><option value="" disabled>Select project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.title}</option>)}</select>
    <label htmlFor="proof-type">Contribution type *</label><select id="proof-type" name="contribution_type" required defaultValue=""><option value="" disabled>Select type</option><option value="analysis">Analysis</option><option value="engineering">Engineering</option><option value="research">Research</option><option value="design">Design</option><option value="documentation">Documentation</option><option value="qa">QA / Review</option><option value="leadership">Leadership</option><option value="mentoring">Mentoring</option><option value="open_source">Open source</option><option value="other">Other</option></select>
    <label htmlFor="proof-title">What did you own? *</label><input id="proof-title" name="title" required minLength={6} maxLength={180} placeholder="e.g. Built the validation dashboard and anomaly checks"/>
    <label htmlFor="proof-description">What did you do and what changed? *</label><textarea id="proof-description" name="description" required minLength={30} placeholder="Describe your ownership, method, decisions, output and result. Be specific enough for a reviewer to verify."/>
    <label htmlFor="proof-url">Evidence URL *</label><input id="proof-url" name="evidence_url" required type="url" placeholder="GitHub PR, repository, dashboard, document or published output"/>
    <label className="consent"><input name="is_public" type="checkbox"/><span>If verified, allow this contribution to appear in public Mettelo Proof/Showcase. You can leave this unchecked to keep the verified record private.</span></label>
    <button className="button dark" type="submit" disabled={status==='submitting'} style={{width:'100%',marginTop:20}}>{status==='submitting'?'Submitting…':'Submit for verification →'}</button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form>;
}
