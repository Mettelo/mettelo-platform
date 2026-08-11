'use client';

import { FormEvent, useMemo, useState } from 'react';

type Role={id:string;title:string};
type Project={id:string;title:string;roles:Role[]};

export default function ProjectApplicationForm({projects}:{projects:Project[]}){
  const [projectId,setProjectId]=useState(projects[0]?.id||'');
  const [status,setStatus]=useState<'idle'|'submitting'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  const selected=useMemo(()=>projects.find(p=>p.id===projectId),[projects,projectId]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('submitting');setMessage('');
    const form=event.currentTarget;const data=Object.fromEntries(new FormData(form).entries());
    try{
      const response=await fetch('/api/project-applications',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Unable to submit application.');
      setStatus('success');setMessage('Application received. It is now visible on your dashboard and application tracker.');form.reset();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to submit application.');}
  }

  return <form className="formCard" onSubmit={submit}>
    <span className="chip green">APPLICATIONS OPEN</span><h3 style={{fontSize:'1.7rem',margin:'16px 0 6px'}}>Apply to a recruiting project</h3>
    <label htmlFor="application-project">Project *</label><select id="application-project" name="project_id" required value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(project=><option key={project.id} value={project.id}>{project.title}</option>)}</select>
    <label htmlFor="application-role">Role *</label><select id="application-role" name="project_role_id" required defaultValue=""><option value="" disabled>Select a role</option>{(selected?.roles||[]).map(role=><option key={role.id} value={role.id}>{role.title}</option>)}</select>
    <label htmlFor="application-portfolio">GitHub / portfolio / LinkedIn</label><input id="application-portfolio" name="portfolio_url" type="url" placeholder="https://"/>
    <label htmlFor="application-availability">Weekly availability</label><input id="application-availability" name="availability" placeholder="e.g. 4 hours per week"/>
    <label htmlFor="application-statement">What will you contribute? *</label><textarea id="application-statement" name="contribution_statement" required minLength={40} placeholder="Be specific about the part of the brief you can own, your relevant evidence and how you will contribute to the team."/>
    <button className="button dark" type="submit" disabled={status==='submitting'} style={{width:'100%',marginTop:20}}>{status==='submitting'?'Submitting…':'Submit application →'}</button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
    {status==='success'&&<div className="actions" style={{marginTop:12}}><a className="button dark" href="/member/applications">Track application →</a><a className="button ghost" href="/member">Open dashboard</a></div>}
  </form>;
}
