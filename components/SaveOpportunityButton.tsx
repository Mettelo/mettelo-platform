'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';

type Props={opportunityId:string;compact?:boolean;initialSaved?:boolean};

export default function SaveOpportunityButton({opportunityId,compact=false,initialSaved}:Props){
  const hasKnownState=typeof initialSaved==='boolean';
  const [saved,setSaved]=useState(initialSaved??false);const [loading,setLoading]=useState(!hasKnownState);const [message,setMessage]=useState('');
  useEffect(()=>{if(hasKnownState)return;let active=true;fetch(`/api/opportunities/saved?opportunity_id=${encodeURIComponent(opportunityId)}`).then(async r=>{if(r.status===401){if(active)setLoading(false);return;}const body=await r.json();if(active){setSaved(Boolean(body.saved));setLoading(false);}}).catch(()=>active&&setLoading(false));return()=>{active=false};},[hasKnownState,opportunityId]);
  async function toggle(){setMessage('');if(loading)return;setLoading(true);try{const response=await fetch('/api/opportunities/saved',{method:saved?'DELETE':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({opportunity_id:opportunityId})});if(response.status===401){window.location.assign(`/signin?next=${encodeURIComponent(window.location.pathname)}`);return;}const body=await response.json();if(!response.ok){setMessage(body.error||'Unable to update saved opportunity.');return;}setSaved(Boolean(body.saved));setMessage(body.message|| (body.saved?'Saved to My Saved Opportunities.':'Removed from saved opportunities.'));}catch{setMessage('Unable to update saved opportunity.');}finally{setLoading(false);}}
  return <div className={compact?'saveOpportunity compact':'saveOpportunity'}><button className="button ghost" type="button" disabled={loading} aria-pressed={saved} onClick={toggle}>{loading?'Checking…':saved?'✓ Saved':'Save role'}</button>{message&&<small role="status" aria-live="polite">{message}{saved&&<> <Link href="/member/saved-opportunities">View saved roles →</Link></>}</small>}</div>;
}
