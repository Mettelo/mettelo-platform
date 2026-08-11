'use client';

import { FormEvent, useState } from 'react';

type Role={id:string;title:string};
type Project={id:string;title:string;roles:Role[]};

export default function ProjectApplicationForm({projects,selectedProjectId}:{projects:Project[];selectedProjectId?:string}){
  const [status,setStatus]=useState<'idle'|'submitting'|'error'>('idle');
  const [message,setMessage]=useState('');
  const selected=projects.find(project=>project.id===selectedProjectId)||null;

  if(!selected){
    return <div className="formCard projectSelectionRequired">
      <span className="chip">CHOOSE A PROJECT</span>
      <h3 style={{fontSize:'1.7rem',margin:'16px 0 8px'}}>Select a project before you apply.</h3>
      <p style={{color:'var(--slate)',margin:0}}>Start from a project card so your application stays linked to the correct brief.</p>
      <div className="actions"><a className="button dark" href="#projects">Choose a project →</a></div>
      <style jsx>{`.projectSelectionRequired{min-height:260px;display:flex;flex-direction:column;justify-content:center}@media(max-width:560px){.projectSelectionRequired{min-height:220px}}`}</style>
    </div>;
  }

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('submitting');setMessage('');
    const data=Object.fromEntries(new FormData(event.currentTarget).entries());
    try{
      const response=await fetch('/api/project-applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Unable to submit application.');
      window.location.assign('/submitted?type=project_application');
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to submit application.');}
  }

  return <form className="formCard" onSubmit={submit}>
    <span className="chip green">APPLICATIONS OPEN</span><h3 style={{fontSize:'1.7rem',margin:'16px 0 6px'}}>Apply to this project</h3>
    <div className="selectedProjectBlock"><small>SELECTED PROJECT</small><strong>{selected.title}</strong><a href="#projects">Change project</a></div>
    <input type="hidden" name="project_id" value={selected.id}/>
    <label htmlFor="application-role">Role *</label><select id="application-role" name="project_role_id" required defaultValue=""><option value="" disabled>Select a role</option>{selected.roles.map(role=><option key={role.id} value={role.id}>{role.title}</option>)}</select>
    <label htmlFor="application-portfolio">GitHub / portfolio / LinkedIn</label><input id="application-portfolio" name="portfolio_url" type="url" placeholder="https://"/>
    <label htmlFor="application-availability">Weekly availability</label><input id="application-availability" name="availability" placeholder="e.g. 4 hours per week"/>
    <label htmlFor="application-statement">What will you contribute? *</label><textarea id="application-statement" name="contribution_statement" required minLength={40} placeholder="Be specific about the part of the brief you can own, your relevant evidence and how you will contribute to the team."/>
    <button className="button dark" type="submit" disabled={status==='submitting'} style={{width:'100%',marginTop:20}}>{status==='submitting'?'Submitting…':'Submit application →'}</button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
    <style jsx>{`.selectedProjectBlock{display:grid;grid-template-columns:1fr auto;gap:5px 14px;margin:20px 0;padding:15px 16px;border:1px solid var(--line);border-radius:14px;background:var(--sand-2)}.selectedProjectBlock small{grid-column:1/-1;color:var(--bronze-deep);font-size:.65rem;font-weight:850;letter-spacing:.08em}.selectedProjectBlock strong{font-size:1rem}.selectedProjectBlock a{align-self:center;color:var(--bronze-deep);font-size:.73rem;font-weight:750}@media(max-width:560px){.selectedProjectBlock{grid-template-columns:1fr}.selectedProjectBlock a{margin-top:5px}.formCard{padding:20px}}`}</style>
  </form>;
}
