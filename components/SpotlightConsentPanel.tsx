'use client';

import {useState} from 'react';

type Item={id:string;title:string;category:string;summary:string|null;award_month:string|null;status:string;consent_status:string};
const consentCopy:Record<string,string>={not_requested:'Not requested',pending:'Your permission is needed',granted:'Permission granted',declined:'Publication declined',withdrawn:'Permission withdrawn'};

export default function SpotlightConsentPanel({initialItems}:{initialItems:Item[]}){
 const [items,setItems]=useState(initialItems);const [busy,setBusy]=useState('');const [message,setMessage]=useState('');
 async function act(item:Item,action:'grant'|'decline'|'withdraw'){
  setBusy(`${item.id}:${action}`);setMessage('');
  try{const response=await fetch('/api/spotlight-consent',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:item.id,action})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update Spotlight consent.');setItems(current=>current.map(row=>row.id===item.id?{...row,...body.item}:row));setMessage(body.message||'Spotlight consent updated.');}catch(error){setMessage(error instanceof Error?error.message:'Unable to update Spotlight consent.')}finally{setBusy('')}
 }
 if(!items.length)return <div className="emptyState"><h3>No Spotlight decisions need your attention.</h3><p>If Mettelo selects you for monthly recognition, you will review the proposed public recognition here before anything is published.</p></div>;
 return <div className="workspaceCollection">{items.map(item=><article className="card" key={item.id}><div className="metaRow"><span className="chip">{item.category.replaceAll('_',' ').toUpperCase()}</span><span className="metaPill">{consentCopy[item.consent_status]||item.consent_status}</span></div><h3>{item.title}</h3><p>{item.summary||'Recognition based on verified Mettelo contribution signals.'}</p><div className="panelNote"><strong>Your choice controls publication.</strong><p>Granting permission allows Mettelo to publish your name, profile context, award title and this evidence-based summary in Spotlight. Declining does not affect your projects, Proof, credentials or access to Mettelo.</p></div><div className="actions">{item.status==='draft'&&item.consent_status!=='granted'&&<button className="button dark" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'grant')}>Allow public Spotlight</button>}{item.status==='draft'&&item.consent_status!=='declined'&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'decline')}>Decline publication</button>}{item.consent_status==='granted'&&<button className="button ghost" type="button" disabled={Boolean(busy)} onClick={()=>void act(item,'withdraw')}>Withdraw publication consent</button>}</div></article>)}<div className="formStatus" role="status" aria-live="polite">{message}</div></div>;
}
