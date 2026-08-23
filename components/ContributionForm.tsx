'use client';

import { FormEvent, useMemo, useState } from 'react';

type Project={id:string;title:string};
type Task={id:string;project_id:string;title:string;status:string};
export type EvidenceOption={type:'task'|'data_source'|'deliverable'|'review';id:string;label:string;detail?:string};

export default function ContributionForm({projects,tasks=[],projectRunId,evidenceOptions=[]}:{projects:Project[];tasks?:Task[];projectRunId?:string|null;evidenceOptions?:EvidenceOption[]}){
  const [status,setStatus]=useState<'idle'|'submitting'|'error'>('idle');
  const [message,setMessage]=useState('');
  const [projectId,setProjectId]=useState(projects[0]?.id||'');
  const relevantTasks=useMemo(()=>tasks.filter(task=>task.project_id===projectId&&task.status!=='done'),[tasks,projectId]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('submitting');setMessage('');
    const form=event.currentTarget;const formData=new FormData(form);const data=Object.fromEntries(formData.entries());const evidenceLinks=formData.getAll('evidence_links').map(String).map(value=>{const [type,id]=value.split(':');return{type,id}});const payload={...data,project_run_id:projectRunId||null,is_public:data.is_public==='on',evidence_links:evidenceLinks};
    try{
      const response=await fetch('/api/contributions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to submit contribution.');
      window.location.assign('/submitted?type=contribution');
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to submit contribution.');}
  }
  if(!projects.length) return <div className="emptyState"><h3>No active project membership.</h3><p>You can record a contribution after you are accepted into a Mettelo project team.</p></div>;
  return <form className="formCard" onSubmit={submit}>
    <div className="panelHead"><div><span className="cardNumber">YOUR CONTRIBUTION</span><h3 style={{marginTop:8}}>Record what you contributed</h3><p>Describe the work you completed and link the project records or supporting evidence that help show your contribution. Your submission will be reviewed before it can become Mettelo Proof.</p></div><span className="chip">FOR REVIEW</span></div>
    <label htmlFor="proof-project">Project *</label><select id="proof-project" name="project_id" required value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(project=><option key={project.id} value={project.id}>{project.title}</option>)}</select>
    {tasks.length>0&&<><label htmlFor="proof-task">Assigned task</label><select id="proof-task" name="task_id" defaultValue=""><option value="">Project-level contribution / no task</option>{relevantTasks.map(task=><option key={task.id} value={task.id}>{task.title} · {task.status.replace('_',' ')}</option>)}</select><small>Link the task when it directly supports the contribution you are recording.</small></>}
    {evidenceOptions.length>0&&<fieldset className="evidenceLedger"><legend>Your Contribution Ledger</legend><p>Link project records that help demonstrate what you contributed. These may include tasks, deliverables, data work or reviews connected to your role.</p>{evidenceOptions.map(item=><label className="ledgerOption" key={`${item.type}:${item.id}`}><input type="checkbox" name="evidence_links" value={`${item.type}:${item.id}`}/><span><strong>{item.label}</strong><small>{item.type.replace('_',' ')}{item.detail?` · ${item.detail}`:''}</small></span></label>)}</fieldset>}
    <label htmlFor="proof-type">Contribution type *</label><select id="proof-type" name="contribution_type" required defaultValue=""><option value="" disabled>Select type</option><option value="analysis">Analysis</option><option value="engineering">Engineering</option><option value="research">Research</option><option value="design">Design</option><option value="documentation">Documentation</option><option value="qa">QA / Review</option><option value="leadership">Leadership</option><option value="mentoring">Mentoring</option><option value="open_source">Open source</option><option value="other">Other</option></select>
    <label htmlFor="proof-title">What did you contribute? *</label><input id="proof-title" name="title" required minLength={6} maxLength={180} placeholder="e.g. Built the validation dashboard and anomaly checks"/>
    <label htmlFor="proof-description">Describe your contribution *</label><textarea id="proof-description" name="description" required minLength={30} placeholder="Explain what you were responsible for, what you did, the decisions or methods you used, and the result or output."/>
    <label htmlFor="proof-url">Additional supporting evidence URL</label><input id="proof-url" name="evidence_url" type="url" placeholder="GitHub PR, dashboard, document or published output"/><small>Add a relevant link if the project records above do not fully show your contribution.</small>
    <label className="consent"><input name="is_public" type="checkbox"/><span>If this contribution is verified, allow the resulting Mettelo Proof record to be visible publicly. Spotlight or Showcase publication remains a separate consent process.</span></label>
    <button className="button dark" type="submit" disabled={status==='submitting'} style={{width:'100%',marginTop:20}}>{status==='submitting'?'Submitting…':'Submit contribution for review →'}</button>
    <div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form>;
}
