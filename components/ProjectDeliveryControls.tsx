'use client';

import {FormEvent,useState} from 'react';

type Milestone={id:string;title:string};
type TeamMember={id:string;name:string;role:string};
type Workstream={id:string;name:string};

export default function ProjectDeliveryControls({projectId,projectRunId,milestones,workstreams,team}:{projectId:string;projectRunId:string|null;milestones:Milestone[];workstreams:Workstream[];team:TeamMember[]}){
  const [resource,setResource]=useState<'milestone'|'task'>('milestone');
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('saving');setMessage('');
    const form=event.currentTarget;const formData=new FormData(form);const values=Object.fromEntries(formData.entries());
    const payload={...values,resource,project_id:projectId,project_run_id:projectRunId,is_required:formData.get('is_required')==='on',status:resource==='task'?'todo':String(formData.get('status')||'planned')};
    try{
      const response=await fetch('/api/project-delivery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to save delivery item.');
      setStatus('success');setMessage(`${resource==='milestone'?'Milestone':'Task'} created successfully.`);form.reset();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to save delivery item.');}
  }
  return <section className="panel" aria-labelledby="delivery-controls-title"><div className="panelHead"><div><span className="cardNumber">PROJECT LEAD CONTROLS</span><h3 id="delivery-controls-title" style={{marginTop:8}}>Plan delivery and ownership</h3></div><div className="filterBar" style={{margin:0}} role="group" aria-label="Create delivery item"><button type="button" className={`filter ${resource==='milestone'?'active':''}`} aria-pressed={resource==='milestone'} onClick={()=>setResource('milestone')}>Milestone</button><button type="button" className={`filter ${resource==='task'?'active':''}`} aria-pressed={resource==='task'} onClick={()=>setResource('task')}>Task</button></div></div><form className="formCard" onSubmit={submit}>
    <label htmlFor="delivery-title">Title <span aria-hidden="true">*</span></label><input id="delivery-title" name="title" required maxLength={180} aria-required="true"/>
    <label htmlFor="delivery-description">Description</label><textarea id="delivery-description" name="description"/>
    {resource==='task'&&<><label htmlFor="delivery-acceptance">Acceptance criteria</label><textarea id="delivery-acceptance" name="acceptance_criteria" maxLength={2500} placeholder="Describe what must be true for this task to be ready for review."/><label htmlFor="delivery-priority">Priority</label><select id="delivery-priority" name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></>}
    <label htmlFor="delivery-workstream">Data workstream</label><select id="delivery-workstream" name="workstream_id" defaultValue=""><option value="">No workstream</option>{workstreams.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
    {resource==='task'&&<><div className="fieldRow"><div><label htmlFor="delivery-milestone">Milestone</label><select id="delivery-milestone" name="milestone_id" defaultValue=""><option value="">No milestone</option>{milestones.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div><label htmlFor="delivery-assignee">Assigned owner</label><select id="delivery-assignee" name="assignee_user_id" defaultValue=""><option value="">Unassigned</option>{team.map(member=><option key={member.id} value={member.id}>{member.name} · {member.role.replace('_',' ')}</option>)}</select></div></div><p className="formHint">New tasks start in <strong>To do</strong>. The assignee moves them through In progress, Blocked and Ready for review; a Project Lead approves them as Done.</p></>}
    <div className="fieldRow"><div>{resource==='milestone'?<><label htmlFor="delivery-status">Status</label><select id="delivery-status" name="status" defaultValue="planned"><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="blocked">Blocked</option></select></>:<input type="hidden" name="status" value="todo"/>}</div><div><label htmlFor="delivery-due">Due date</label><input id="delivery-due" name="due_at" type="datetime-local"/></div></div>
    <label className="consent"><input name="is_required" type="checkbox" defaultChecked/><span>Required for project completion. Uncheck only for optional/stretch work.</span></label>
    <button className="button dark" type="submit" disabled={status==='saving'} style={{width:'100%',marginTop:20}}>{status==='saving'?'Saving…':`Create ${resource} →`}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form></section>;
}
