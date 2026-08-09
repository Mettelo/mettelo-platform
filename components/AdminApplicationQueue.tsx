'use client';

import { useState } from 'react';

type Item={id:string;name:string;email:string;project:string;role:string;status:string;submitted_at:string;statement:string;portfolio_url:string|null;availability:string|null};

export default function AdminApplicationQueue({initialItems}:{initialItems:Item[]}){
  const [items,setItems]=useState(initialItems);
  const [working,setWorking]=useState('');
  const [message,setMessage]=useState('');

  async function update(id:string,status:string){
    setWorking(id);setMessage('');
    try{
      const response=await fetch('/api/admin/applications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Unable to update application.');
      setItems(current=>current.map(item=>item.id===id?{...item,status}:item));
      setMessage(status==='accepted'?'Application accepted and member added to the project team.':'Application status updated.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update application.');}
    finally{setWorking('');}
  }

  if(!items.length) return <div className="emptyState"><h3>No Labs applications yet.</h3><p>When a project is Recruiting, member applications appear here automatically.</p></div>;

  return <div className="applicationQueue">
    {items.map(item=><article className="applicationReview" key={item.id}>
      <div className="panelHead"><div><span className="chip">{item.status.replace('_',' ').toUpperCase()}</span><h3 style={{margin:'10px 0 4px'}}>{item.name}</h3><small>{item.email}</small></div><small>{new Date(item.submitted_at).toLocaleString('en-GB')}</small></div>
      <div className="metaRow"><span className="metaPill">{item.project}</span><span className="metaPill">{item.role}</span>{item.availability&&<span className="metaPill">{item.availability}</span>}</div>
      <p>{item.statement}</p>
      {item.portfolio_url&&<a className="linkArrow" href={item.portfolio_url} target="_blank" rel="noopener noreferrer">Open evidence →</a>}
      <div className="reviewActions"><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>update(item.id,'in_review')}>In review</button><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>update(item.id,'shortlisted')}>Shortlist</button><button className="button dark" type="button" disabled={working===item.id} onClick={()=>update(item.id,'accepted')}>Accept</button><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>update(item.id,'declined')}>Decline</button></div>
    </article>)}
    <div className="formStatus" role="status" aria-live="polite">{message}</div>
  </div>;
}
