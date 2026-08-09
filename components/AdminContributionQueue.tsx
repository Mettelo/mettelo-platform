'use client';

import { useState } from 'react';

type Item={id:string;name:string;project:string;title:string;type:string;description:string|null;evidence_url:string|null;status:string;review_notes:string|null;created_at:string;is_public:boolean};

export default function AdminContributionQueue({initialItems}:{initialItems:Item[]}){
  const [items,setItems]=useState(initialItems);
  const [working,setWorking]=useState('');
  const [notes,setNotes]=useState<Record<string,string>>({});
  const [message,setMessage]=useState('');

  async function review(id:string,status:string){
    setWorking(id);setMessage('');
    try{
      const response=await fetch('/api/admin/contributions',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status,review_notes:notes[id]||''})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.error||'Unable to update contribution.');
      setItems(current=>current.map(item=>item.id===id?{...item,status,review_notes:notes[id]||null}:item));
      setMessage(status==='verified'?'Contribution verified. Public consent determines whether it can appear in Showcase.':'Contribution review updated.');
    }catch(error){setMessage(error instanceof Error?error.message:'Unable to update contribution.');}
    finally{setWorking('');}
  }

  if(!items.length) return <div className="emptyState"><h3>No contribution evidence waiting.</h3><p>Submitted member evidence appears here for verification.</p></div>;

  return <div className="applicationQueue">{items.map(item=><article className="applicationReview" key={item.id}>
    <div className="panelHead"><div><span className={`chip ${item.status==='verified'?'green':''}`}>{item.status.replace('_',' ').toUpperCase()}</span><h3 style={{margin:'10px 0 4px'}}>{item.title}</h3><small>{item.name} · {item.project}</small></div><small>{new Date(item.created_at).toLocaleString('en-GB')}</small></div>
    <div className="metaRow"><span className="metaPill">{item.type.replace('_',' ')}</span><span className="metaPill">{item.is_public?'Public if verified':'Private proof'}</span></div>
    {item.description&&<p>{item.description}</p>}
    {item.evidence_url&&<a className="linkArrow" href={item.evidence_url} target="_blank" rel="noopener noreferrer">Open evidence →</a>}
    <label htmlFor={`review-${item.id}`}>Reviewer notes</label><textarea id={`review-${item.id}`} value={notes[item.id]??item.review_notes??''} onChange={event=>setNotes(current=>({...current,[item.id]:event.target.value}))} placeholder="Record verification context or explain required changes."/>
    <div className="reviewActions"><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>review(item.id,'needs_changes')}>Needs changes</button><button className="button dark" type="button" disabled={working===item.id} onClick={()=>review(item.id,'verified')}>Verify</button><button className="button ghost" type="button" disabled={working===item.id} onClick={()=>review(item.id,'rejected')}>Reject</button></div>
  </article>)}<div className="formStatus" role="status" aria-live="polite">{message}</div></div>;
}
