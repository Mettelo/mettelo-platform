'use client';

import {useState} from 'react';

const labels:Record<string,string>={todo:'To do',in_progress:'In progress',blocked:'Blocked',ready_for_review:'Ready for review',done:'Done'};
const optionsByStatus:Record<string,string[]>={
  todo:['todo','in_progress','blocked'],
  in_progress:['in_progress','blocked','ready_for_review'],
  blocked:['blocked','in_progress'],
  ready_for_review:['ready_for_review','in_progress','done'],
  done:['done']
};

export default function TaskStatusControl({taskId,initialStatus}:{taskId:string;initialStatus:string}){
  const normalised=initialStatus==='review'?'ready_for_review':initialStatus;
  const [status,setStatus]=useState(normalised);
  const [selected,setSelected]=useState(normalised);
  const [blockerReason,setBlockerReason]=useState('');
  const [reviewComment,setReviewComment]=useState('');
  const [working,setWorking]=useState(false);
  const [message,setMessage]=useState('');
  const needsBlocker=selected==='blocked'&&status!=='blocked';
  const needsReviewComment=status==='ready_for_review'&&selected==='in_progress';
  const controlId=`task-status-${taskId}`;
  const blockerId=`task-blocker-${taskId}`;
  const reviewId=`task-review-${taskId}`;

  async function update(next:string){
    setWorking(true);setMessage('');
    try{
      const response=await fetch('/api/project-delivery',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({task_id:taskId,status:next,blocker_reason:next==='blocked'?blockerReason:undefined,review_comment:status==='ready_for_review'&&next==='in_progress'?reviewComment:undefined})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Unable to update task.');
      setStatus(next);setSelected(next);setBlockerReason('');setReviewComment('');setMessage(`Task status changed to ${labels[next]||next}.`);
    }catch(error){
      setSelected(status);setMessage(error instanceof Error?error.message:'Unable to update task.');
    }finally{setWorking(false);}
  }

  function choose(next:string){
    setSelected(next);setMessage('');
    const requiresInput=(next==='blocked'&&status!=='blocked')||(status==='ready_for_review'&&next==='in_progress');
    if(next!==status&&!requiresInput)void update(next);
  }

  return <div className="taskStatusControl">
    <label htmlFor={controlId}><strong>Status</strong></label>
    <select id={controlId} value={selected} disabled={working||status==='done'} onChange={event=>choose(event.target.value)}>
      {(optionsByStatus[status]||[status]).map(value=><option key={value} value={value}>{labels[value]||value}</option>)}
    </select>

    {needsBlocker&&<div className="taskStatusFollowup">
      <label htmlFor={blockerId}><strong>Why is this task blocked?</strong></label>
      <textarea id={blockerId} value={blockerReason} onChange={event=>setBlockerReason(event.target.value)} rows={3} required maxLength={1500} aria-describedby={`${blockerId}-help`}/>
      <small id={`${blockerId}-help`}>Explain what is preventing progress so the Project Lead can intervene.</small>
      <button type="button" disabled={working||!blockerReason.trim()} onClick={()=>update('blocked')}>Mark task blocked</button>
    </div>}

    {needsReviewComment&&<div className="taskStatusFollowup">
      <label htmlFor={reviewId}><strong>What needs to change?</strong></label>
      <textarea id={reviewId} value={reviewComment} onChange={event=>setReviewComment(event.target.value)} rows={3} required maxLength={1500}/>
      <button type="button" disabled={working||!reviewComment.trim()} onClick={()=>update('in_progress')}>Request changes</button>
    </div>}

    {status==='ready_for_review'&&selected==='ready_for_review'&&<small>Project Leads can approve this task or request changes.</small>}
    {message&&<p role="status" aria-live="polite">{message}</p>}
  </div>;
}
