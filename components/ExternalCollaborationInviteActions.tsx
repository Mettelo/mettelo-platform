'use client';

import {useRouter} from 'next/navigation';
import {useState} from 'react';

type Props={token:string;fallbackHref:string};

export default function ExternalCollaborationInviteActions({token,fallbackHref}:Props){
 const router=useRouter();const [working,setWorking]=useState<'accept'|'decline'|null>(null);const [message,setMessage]=useState('');
 async function respond(action:'accept'|'decline'){
  if(working)return;setWorking(action);setMessage(action==='accept'?'Checking this invitation and collaboration place…':'Declining invitation…');
  try{
   const response=await fetch('/api/external-collaboration-invitations',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({token,action})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to update this invitation.');
   if(action==='accept'&&body.interest_target){router.push(body.interest_target);return}setMessage('Invitation declined.');router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update this invitation.')}finally{setWorking(null)}
 }
 return <div><div className="actions"><button className="button dark" type="button" disabled={Boolean(working)} onClick={()=>respond('accept')}>{working==='accept'?'Checking…':'Accept invitation & continue'}</button><button className="button ghost" type="button" disabled={Boolean(working)} onClick={()=>respond('decline')}>{working==='decline'?'Declining…':'Decline invitation'}</button><a className="button ghost" href={fallbackHref}>View without invitation</a></div><p role="status" aria-live="polite">{message}</p></div>;
}