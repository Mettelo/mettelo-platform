'use client';

import { FormEvent, useState } from 'react';

type Milestone={id:string;title:string};
type TeamMember={id:string;name:string;role:string};
type Workstream={id:string;name:string};

export default function ProjectDeliveryControls({projectId,projectRunId,milestones,workstreams,team}:{projectId:string;projectRunId:string|null;milestones:Milestone[];workstreams:Workstream[];team:TeamMember[]}){
  const [resource,setResource]=useState<'milestone'|'task'>('milestone');
  const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('saving');setMessage('');
    const form=event.currentTarget;const values=Object.fromEntries(new FormData(form).entries());
    const payload={...values,resource,project_id:projectId,project_run_id:projectRunId,is_required:new FormData(form).get('is_required')==='on'};
    try{
      const response=await fetch('/api/project-delivery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(body.error||'Unable to save delivery item.');
      setStatus('success');setMessage(`${resource==='milestone'?'Milestone':'Task'} created. Refresh to see it in the delivery board.`);form.reset();
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to save delivery item.');}
  }
  return <section className="panel"><div className="panelHead"><div><span className="cardNumber">PROJECT LEAD CONTROLS</span><h3 style={{marginTop:8}}>Plan delivery and ownership</h3></div><div className="filterBar" style={{margin:0}}><button type="button" className={`filter ${resource==='milestone'?'active':''}`} onClick={()=>setResource('milestone')}>Milestone</button><button type="button" className={`filter ${resource==='task'?'active':''}`} onClick={()=>setResource('task')}>Task</button></div></div><form className="formCard" onSubmit={submit}>
    <label htmlFor="delivery-title">Title *</label><input id="delivery-title" name="title" required maxLength={180}/>
    <label htmlFor="delivery-description">Description</label><textarea id="delivery-description" name="description"/>
    <label htmlFor="delivery-workstream">Data workstream</label><select id="delivery-workstream" name="workstream_id" defaultValue=""><option value="">No workstream</option>{workstreams.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
    {resource==='task'&&<><div className="fieldRow"><div><label htmlFor="delivery-milestone">Milestone</label><select id="delivery-milestone" name="milestone_id" defaultValue=""><option value="">No milestone</option>{milestones.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div><label htmlFor="delivery-assignee">Assigned owner</label><select id="delivery-assignee" name="assignee_user_id" defaultValue=""><option value="">Unassigned</option>{team.map(member=><option key={member.id} value={member.id}>{member.name} · {member.role.replace('_',' ')}</option>)}</select></div></div></>}
    <div className="fieldRow"><div><label htmlFor="delivery-status">Status</label><select id="delivery-status" name="status" defaultValue={resource==='milestone'?'planned':'todo'}>{resource==='milestone'?<><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="blocked">Blocked</option></>:<><option value="todo">To do</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="done">Done</option><option value="blocked">Blocked</option></>}</select></div><div><label htmlFor="delivery-due">Due date</label><input id="delivery-due" name="due_at" type="datetime-local"/></div></div>
    <label className="consent"><input name="is_required" type="checkbox" defaultChecked/><span>Required for project completion. Uncheck only for optional/stretch work.</span></label>
    <button className="button dark" type="submit" disabled={status==='saving'} style={{width:'100%',marginTop:20}}>{status==='saving'?'Saving…':`Create ${resource} →`}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>
  </form></section>;
}
