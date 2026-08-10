'use client';

import { useState } from 'react';

type Item={id:string;title:string;organisation:string|null;location:string|null;data_ai_relevance_score:number|null;published_at:string|null;source_url:string|null};

export default function AdminPublishedOpportunities({initialItems}:{initialItems:Item[]}){
  const [items,setItems]=useState(initialItems);const [working,setWorking]=useState('');const [message,setMessage]=useState('');
  async function remove(item:Item){
    const reason=window.prompt(`Why are you removing “${item.title}”?`,'Not relevant enough for the Mettelo Data & AI opportunity feed.');if(reason===null)return;
    setWorking(item.id);setMessage('');
    try{const response=await fetch('/api/admin/opportunities/manage',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action:'remove',note:reason})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to remove opportunity.');setItems(current=>current.filter(row=>row.id!==item.id));setMessage('Opportunity removed from the public website.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to remove opportunity.');}finally{setWorking('');}
  }
  return <div>{items.length?<div className="applicationQueue">{items.map(item=><article className="applicationReview" key={item.id}><div className="panelHead"><div><span className="chip green">LIVE</span><h3 style={{margin:'10px 0 4px'}}>{item.title}</h3><small>{item.organisation||'Organisation'}{item.location?` · ${item.location}`:''}</small></div>{item.data_ai_relevance_score&&<span className="metaPill">Data/AI {item.data_ai_relevance_score}/100</span>}</div><div className="reviewActions">{item.source_url&&<a className="button ghost" href={item.source_url} target="_blank" rel="noopener noreferrer">View source →</a>}<button className="button ghost" type="button" disabled={working===item.id} onClick={()=>remove(item)}>{working===item.id?'Removing…':'Remove from website'}</button></div></article>)}</div>:<div className="emptyState"><h3>No published opportunities.</h3><p>Automatically published Data & AI opportunities will appear here for admin oversight.</p></div>}<div className="formStatus" role="status" aria-live="polite">{message}</div></div>;
}
