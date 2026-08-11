'use client';

import { useState } from 'react';

type Item={id:string;name:string;email:string;project:string;role:string;status:string;submitted_at:string;statement:string;portfolio_url:string|null;availability:string|null};

export default function AdminApplicationQueue({initialItems}:{initialItems:Item[]}){
  const [items,setItems]=useState(initialItems);
  const [working,setWorking]=useState('');
  const [message,setMessage]=useState('');
  const [notes,setNotes]=useState<Record<string,string>>({});

  async function update(id:string,status:string){
    setWorking(id);setMessage('');
    try{
      const response=await fetch('/api/admin/applications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status,reviewer_notes:notes[id]||''})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Unable to update application.');
      setItems(current=>current.map(item=>item.id===id?{...item,status:payload.application?.status||status}:item));
      setMessage(status==='approved'?(payload.team?.full?`Approved. Team reached ${payload.team.filled}/${payload.team.threshold}; project kicked off.`:`Approved. Team is forming at ${payload.team?.filled||0}/${payload.team?.threshold||'—'} spots.`):'Application status updated.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update application.');}
    finally{setWorking('');}
  }

  if(!items.length) return <div className="emptyState"><h3>No Labs applications yet.</h3><p>When a project is open for applications, member submissions appear here automatically.</p></div>;

  return <div className="applicationQueue">
    {items.map(item=><article className="applicationReview" key={item.id}>
      <div className="panelHead"><div><span className="chip">{item.status.replaceAll('_',' ').toUpperCase()}</span><h3 style={{margin:'10px 0 4px'}}>{item.name}</h3><small>{item.email}</small></div><small>{new Date(item.submitted_at).toLocaleString('en-GB')}</small></div>
      <div className="metaRow"><span className="metaPill">{item.project}</span><span className="metaPill">{item.role}</span>{item.availability&&<span className="metaPill">{item.availability}</span>}</div>
      <p>{item.statement}</p>
      {item.portfolio_url&&<a className="linkArrow" href={item.portfolio_url} target="_blank" rel="noopener noreferrer">Open evidence →</a>}
      <label style={{display:'block',marginTop:14}}>Reviewer note / decline reason</label><textarea value={notes[item.id]||''} onChange={event=>setNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="Optional for approval; recommended when declining." maxLength={1500}/>
      <div className="reviewActions"><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>update(item.id,'in_review')}>Under review</button><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>update(item.id,'shortlisted')}>Shortlist</button><button className="button dark" type="button" disabled={working===item.id} onClick={()=>update(item.id,'approved')}>Approve → team</button><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>update(item.id,'declined')}>Decline</button></div>
    </article>)}
    <div className="formStatus" role="status" aria-live="polite">{message}</div>
  </div>;
}
