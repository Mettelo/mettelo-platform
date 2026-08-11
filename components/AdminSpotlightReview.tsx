'use client';

import {useState} from 'react';

type Item={id:string;name:string;headline:string|null;title:string;category:string;summary:string|null;award_month:string|null;score:number|null;score_breakdown:Record<string,number>|null;status:string;is_excluded:boolean;exclusion_reason:string|null};

export default function AdminSpotlightReview({initialItems}:{initialItems:Item[]}){
  const [items,setItems]=useState(initialItems);const [message,setMessage]=useState('');const [busy,setBusy]=useState('');
  async function act(id:string,action:'publish'|'exclude'|'restore'){
    let reason='';if(action==='exclude'){reason=window.prompt('Reason for excluding this candidate from this month?')?.trim()||'';if(!reason)return;}
    setBusy(`${id}:${action}`);setMessage('');
    const response=await fetch('/api/admin/spotlights',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,action,reason})});const data=await response.json().catch(()=>({}));setBusy('');
    if(!response.ok){setMessage(data.error||'Spotlight action failed.');return;}
    if(action==='publish'){setItems(current=>current.map(item=>item.award_month===data.publishedMonth?{...item,status:'published'}:item));setMessage('All three awards for this month are now published.');return;}
    setItems(current=>current.map(item=>item.id===id?{...item,is_excluded:action==='exclude',exclusion_reason:action==='exclude'?reason:null}:item));setMessage(action==='exclude'?'Candidate excluded. Generate/review a replacement before publishing.':'Candidate restored.');
  }
  if(!items.length)return <div className="emptyState"><h3>No monthly Spotlight draft yet.</h3><p>The monthly job runs on the first day of each month for the previous month. It only creates a cohort when three distinct members have qualifying activity.</p></div>;
  return <div style={{display:'grid',gap:18}}>{message&&<div className="panel"><strong>{message}</strong></div>}{items.map(item=><article className="card" key={item.id} style={{opacity:item.is_excluded?.65:1}}><div className="metaRow"><span className="chip">{item.category.toUpperCase()}</span><span className="metaPill">{item.award_month||'No month'}</span><span className="metaPill">Score {item.score??0}</span><span className="metaPill">{item.status}</span>{item.is_excluded&&<span className="metaPill">EXCLUDED</span>}</div><h3>{item.title} — {item.name}</h3>{item.headline&&<p><strong>{item.headline}</strong></p>}<p>{item.summary}</p>{item.score_breakdown&&<div className="metaRow">{Object.entries(item.score_breakdown).map(([key,value])=><span className="metaPill" key={key}>{key}: {value}</span>)}</div>}{item.exclusion_reason&&<p><strong>Exclusion reason:</strong> {item.exclusion_reason}</p>}<div className="actions">{item.status==='draft'&&!item.is_excluded&&<button className="button dark" type="button" disabled={Boolean(busy)} onClick={()=>act(item.id,'publish')}>Publish month →</button>}{!item.is_excluded&&item.status==='draft'&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>act(item.id,'exclude')}>Exclude candidate</button>}{item.is_excluded&&item.status==='draft'&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>act(item.id,'restore')}>Restore candidate</button>}</div></article>)}</div>;
}
