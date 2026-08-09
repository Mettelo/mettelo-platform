'use client';

import { useState } from 'react';

export default function TaskStatusControl({taskId,initialStatus}:{taskId:string;initialStatus:string}){
  const [status,setStatus]=useState(initialStatus);const [working,setWorking]=useState(false);const [message,setMessage]=useState('');
  async function update(next:string){setWorking(true);setMessage('');try{const response=await fetch('/api/project-delivery',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({task_id:taskId,status:next})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update task.');setStatus(next);setMessage('Saved.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to update task.');}finally{setWorking(false);}}
  return <div className="taskStatusControl"><select aria-label="Task status" value={status} disabled={working} onChange={e=>update(e.target.value)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="review">Review</option><option value="done">Done</option><option value="blocked">Blocked</option></select>{message&&<small>{message}</small>}</div>;
}
