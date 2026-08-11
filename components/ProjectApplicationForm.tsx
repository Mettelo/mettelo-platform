'use client';

import {FormEvent,useMemo,useState} from 'react';

type Role={id:string;title:string};
type Project={id:string;title:string;roles:Role[]};

export default function ProjectApplicationForm({projects,selectedProjectId}:{projects:Project[];selectedProjectId?:string}){
  const projectId=selectedProjectId||'';
  const [status,setStatus]=useState<'idle'|'submitting'|'error'>('idle');
  const [message,setMessage]=useState('');
  const selected=useMemo(()=>projects.find(p=>p.id===projectId),[projects,projectId]);

  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setStatus('submitting');setMessage('');const form=event.currentTarget;const data=Object.fromEntries(new FormData(form).entries());try{const response=await fetch('/api/project-applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(payload.error||'Unable to submit application.');window.location.assign('/submitted?type=project_application');}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to submit application.');}}

  if(!selected)return <div className="formCard projectSelectionRequired"><span className="chip">PROJECT REQUIRED</span><h3>Choose a project first.</h3><p>Select the project from the Projects page so we can lock the correct brief into your application.</p><a className="button dark" href="/projects#projects">Back to projects →</a><style jsx>{`.projectSelectionRequired{display:grid;gap:14px}.projectSelectionRequired h3{margin:4px 0 0;font-size:1.55rem}.projectSelectionRequired p{margin:0;color:var(--slate)}.projectSelectionRequired .button{width:max-content}@media(max-width:640px){.projectSelectionRequired .button{width:100%;min-height:44px}}`}</style></div>;

  return <form className="formCard" onSubmit={submit}>
    <span className="chip green">APPLICATIONS OPEN</span><h3 style={{fontSize:'1.7rem',margin:'16px 0 6px'}}>Apply to this project</h3>
    <div className="lockedProject"><small>PROJECT</small><strong>{selected.title}</strong><span>Selected from the project card</span></div><input type="hidden" name="project_id" value={selected.id}/>
    <label htmlFor="application-role">Role *</label><select id="application-role" name="project_role_id" required defaultValue=""><option value="" disabled>Select a role</option>{selected.roles.map(role=><option key={role.id} value={role.id}>{role.title}</option>)}</select>
    <label htmlFor="application-portfolio">GitHub / portfolio / LinkedIn</label><input id="application-portfolio" name="portfolio_url" type="url" placeholder="https://"/>
    <label htmlFor="application-availability">Weekly availability</label><input id="application-availability" name="availability" placeholder="e.g. 4 hours per week"/>
    <label htmlFor="application-statement">What will you contribute? *</label><textarea id="application-statement" name="contribution_statement" required minLength={40} placeholder="Be specific about the part of the brief you can own, your relevant evidence and how you will contribute to the team."/>
    <button className="button dark" type="submit" disabled={status==='submitting'} style={{width:'100%',marginTop:20,minHeight:44}}>{status==='submitting'?'Submitting…':'Submit application →'}</button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
    <style jsx>{`.lockedProject{display:grid;gap:4px;margin:16px 0 18px;padding:15px 16px;border:1px solid rgba(16,19,29,.1);border-radius:12px;background:#f8f6f0}.lockedProject small{font-size:.62rem;font-weight:850;letter-spacing:.09em;color:#9b6518}.lockedProject strong{font-size:1rem}.lockedProject span{font-size:.72rem;color:var(--slate)}`}</style>
  </form>;
}
