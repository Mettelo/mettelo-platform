'use client';

import {useEffect,useState} from 'react';

type Props={opportunityId:string;compact?:boolean};

export default function SaveOpportunityButton({opportunityId,compact=false}:Props){
  const [saved,setSaved]=useState(false);const [loading,setLoading]=useState(true);const [message,setMessage]=useState('');
  useEffect(()=>{let active=true;fetch(`/api/opportunities/saved?opportunity_id=${encodeURIComponent(opportunityId)}`).then(async r=>{if(r.status===401){if(active)setLoading(false);return;}const body=await r.json();if(active){setSaved(Boolean(body.saved));setLoading(false);}}).catch(()=>active&&setLoading(false));return()=>{active=false};},[opportunityId]);
  async function toggle(){setMessage('');if(loading)return;setLoading(true);try{const response=await fetch('/api/opportunities/saved',{method:saved?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({opportunity_id:opportunityId})});if(response.status===401){window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname)}`);return;}const body=await response.json();if(!response.ok){setMessage(body.error||'Unable to update saved opportunity.');return;}setSaved(Boolean(body.saved));}catch{setMessage('Unable to update saved opportunity.');}finally{setLoading(false);}}
  return <div className={compact?'saveOpportunity compact':'saveOpportunity'}><button className="button ghost" type="button" disabled={loading} aria-pressed={saved} onClick={toggle}>{loading?'Checking…':saved?'✓ Saved':'Save role'}</button>{message&&<small role="status">{message}</small>}</div>;
}
