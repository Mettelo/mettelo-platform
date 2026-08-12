'use client';

import { useState } from 'react';

type Item={id:string;name:string;title:string;type:string;description:string|null;evidence_url:string|null;status:string;task:string|null;created_at:string;ledger:{type:string;label:string;url:string|null}[]};

export default function ProjectContributionReview({items}:{items:Item[]}){
  const [rows,setRows]=useState(items);const [working,setWorking]=useState('');const [message,setMessage]=useState('');
  async function update(id:string,status:string,notes:string){setWorking(id);setMessage('');try{const response=await fetch('/api/project-contributions',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status,review_notes:notes})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to review contribution.');setRows(current=>current.filter(item=>item.id!==id));setMessage(status==='verified'?'Contribution verified. Linked task is now Done.':'Review saved.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to review contribution.');}finally{setWorking('');}}
  if(!rows.length)return <div className="emptyState"><h3>No contribution evidence waiting for project review.</h3><p>Submitted task/project evidence appears here for the Project Lead or Reviewer.</p></div>;
  return <div className="applicationQueue">{rows.map(item=><ReviewItem key={item.id} item={item} working={working===item.id} onUpdate={update}/>)}<div className="formStatus" role="status" aria-live="polite">{message}</div></div>;
}

function ReviewItem({item,working,onUpdate}:{item:Item;working:boolean;onUpdate:(id:string,status:string,notes:string)=>void}){
  const [notes,setNotes]=useState('');
  return <article className="applicationReview"><div className="panelHead"><div><span className="chip">{item.status.replace('_',' ').toUpperCase()}</span><h3 style={{margin:'10px 0 4px'}}>{item.title}</h3><small>{item.name} · {item.type.replace('_',' ')}{item.task?` · ${item.task}`:''}</small></div><small>{new Date(item.created_at).toLocaleString('en-GB')}</small></div>{item.description&&<p>{item.description}</p>}{item.ledger.length>0&&<div className="reviewLedger"><strong>Linked workspace evidence</strong>{item.ledger.map((entry,index)=><div key={`${entry.type}-${entry.label}-${index}`}><span className="chip">{entry.type.replace('_',' ')}</span>{entry.url?<a className="linkArrow" href={entry.url} target="_blank" rel="noopener noreferrer">{entry.label} →</a>:<span>{entry.label}</span>}</div>)}</div>}{item.evidence_url&&<a className="linkArrow" href={item.evidence_url} target="_blank" rel="noopener noreferrer">Inspect additional evidence →</a>}<label htmlFor={`review-${item.id}`}>Reviewer notes</label><textarea id={`review-${item.id}`} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Specific feedback, decision or changes required."/><div className="reviewActions"><button type="button" className="button ghost" disabled={working||!notes.trim()} onClick={()=>onUpdate(item.id,'needs_changes',notes)}>Changes required</button><button type="button" className="button dark" disabled={working} onClick={()=>onUpdate(item.id,'verified',notes)}>Verify</button><button type="button" className="button ghost" disabled={working} onClick={()=>onUpdate(item.id,'rejected',notes)}>Reject</button></div></article>;
}
