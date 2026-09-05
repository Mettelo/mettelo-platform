'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

type Item={id:string;projectTitle:string;projectType?:string|null;partnerName?:string|null;reviewerNotes?:string|null;requestedAt?:string|null};

export default function MemberClarificationRequests({items}:{items:Item[]}){
 const router=useRouter();
 const[responses,setResponses]=useState<Record<string,string>>({});
 const[working,setWorking]=useState('');
 const[message,setMessage]=useState('');
 if(!items.length)return null;
 async function submit(item:Item){
  const responseText=(responses[item.id]||'').trim();
  if(responseText.length<10){setMessage('Please add enough detail for Mettelo to continue the review.');return}
  setWorking(item.id);setMessage('Sending clarification…');
  try{
   const response=await fetch('/api/project-applications/clarification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,response:responseText})});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(body.error||'Unable to send clarification.');
   setMessage('Clarification sent. Your request is back in review.');
   setResponses(current=>({...current,[item.id]:''}));
   router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to send clarification.')}finally{setWorking('')}
 }
 return <section className="clarificationSection" aria-labelledby="clarification-title">
  <header><div><span>NEEDS YOU</span><h2 id="clarification-title">Mettelo needs more information</h2><p>Reply here so the same project request can continue through review. A clarification response never creates membership or confirms a place.</p></div><strong>{items.length}</strong></header>
  <div className="clarificationList">{items.map(item=><article key={item.id}><div className="clarificationMeta"><div><span>{item.projectType==='partner'?'PARTNER PROJECT':'PROJECT REVIEW'}</span><h3>{item.projectTitle}</h3>{item.projectType==='partner'&&item.partnerName&&<small>{item.partnerName}</small>}</div>{item.requestedAt&&<time dateTime={item.requestedAt}>Requested {new Date(item.requestedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}</time>}</div><div className="requestText"><strong>What we need</strong><p>{item.reviewerNotes||'Please provide the additional information requested by the Mettelo review team.'}</p></div><label><span>Your clarification</span><textarea rows={5} maxLength={2000} value={responses[item.id]||''} onChange={event=>setResponses(current=>({...current,[item.id]:event.target.value}))} placeholder="Add the missing context or evidence here"/><small>{(responses[item.id]||'').length}/2000</small></label><button type="button" disabled={working===item.id} onClick={()=>void submit(item)}>{working===item.id?'Sending…':'Send clarification'}</button></article>)}</div>
  <div className="clarificationStatus" role="status" aria-live="polite">{message}</div>
  <style jsx>{`.clarificationSection{margin:20px 0;padding:18px;border:1px solid #e5c46c;border-radius:16px;background:#fffaf0}.clarificationSection>header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.clarificationSection header span,.clarificationMeta span{font-family:var(--font-plex-mono),ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.08em;color:#72501b}.clarificationSection h2{margin:5px 0 5px;font-size:1.35rem}.clarificationSection header p{margin:0;max-width:760px;color:#625b4d;font-size:.78rem;line-height:1.55}.clarificationSection>header>strong{font-size:1.7rem}.clarificationList{display:grid;gap:10px;margin-top:15px}.clarificationList article{padding:15px;border:1px solid #e7d5a9;border-radius:12px;background:#fff}.clarificationMeta{display:flex;justify-content:space-between;gap:14px}.clarificationMeta h3{margin:4px 0 2px;font-size:1rem}.clarificationMeta small,.clarificationMeta time{font-size:.65rem;color:#6b7280}.requestText{margin:12px 0;padding:11px;border-left:3px solid #c6892a;background:#fff8e8}.requestText strong{font-size:.7rem}.requestText p{margin:4px 0 0;font-size:.74rem;line-height:1.5}.clarificationList label{display:grid;gap:5px;font-size:.7rem;font-weight:800}.clarificationList textarea{width:100%;box-sizing:border-box;border:1px solid #b8c0c9;border-radius:9px;padding:10px;font:inherit;resize:vertical}.clarificationList label small{text-align:right;color:#6b7280}.clarificationList button{min-height:44px;margin-top:10px;border:1px solid #111318;border-radius:9px;background:#111318;color:#fff;padding:0 15px;font-weight:800;cursor:pointer}.clarificationList button:disabled{opacity:.55}.clarificationList button:focus-visible,.clarificationList textarea:focus-visible{outline:3px solid #173f8f;outline-offset:3px}.clarificationStatus{min-height:22px;margin-top:8px;color:#5b6470;font-size:.7rem}@media(max-width:620px){.clarificationSection{padding:14px}.clarificationSection>header,.clarificationMeta{display:grid}.clarificationList button{width:100%}}`}</style>
 </section>;
}
