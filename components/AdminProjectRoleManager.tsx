'use client';

import { FormEvent, useState } from 'react';

type Project={id:string;title:string;status:string};

export default function AdminProjectRoleManager({projects}:{projects:Project[]}){
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('saving');setMessage('');
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    try{
      const response=await fetch('/api/admin/project-roles',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Unable to save role.');
      setStatus('success');setMessage('Project role saved. The public project and application form can now use it.');
      form.reset();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to save role.');}
  }

  return <section className="panel" id="project-roles">
    <div className="panelHead"><div><span className="cardNumber">LABS ROLES</span><h3 style={{marginTop:8}}>Define project roles and openings</h3></div><span className="chip">RECRUITMENT</span></div>
    {projects.length?<form className="formCard" onSubmit={submit}>
      <label htmlFor="role-project">Project *</label><select id="role-project" name="project_id" required defaultValue=""><option value="" disabled>Select project</option>{projects.map(project=><option key={project.id} value={project.id}>{project.title} · {project.status}</option>)}</select>
      <div className="fieldRow"><div><label htmlFor="role-title">Role title *</label><input id="role-title" name="title" required placeholder="Data Analyst"/></div><div><label htmlFor="role-discipline">Discipline</label><input id="role-discipline" name="discipline" placeholder="Data Analysis"/></div></div>
      <label htmlFor="role-description">What will this role own?</label><textarea id="role-description" name="description" placeholder="Responsibilities, expected contribution and boundaries."/>
      <div className="fieldRow"><div><label htmlFor="role-skills">Skills</label><input id="role-skills" name="skills" placeholder="SQL, Python, Power BI"/></div><div><label htmlFor="role-openings">Openings *</label><input id="role-openings" name="openings" type="number" min="1" max="50" defaultValue="1" required/></div></div>
      <button className="button dark" type="submit" disabled={status==='saving'} style={{width:'100%',marginTop:20}}>{status==='saving'?'Saving…':'Save project role →'}</button>
      <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
    </form>:<div className="emptyState"><h3>Create a project first.</h3><p>Roles belong to a Labs project and define what applicants can apply for.</p></div>}
  </section>;
}
