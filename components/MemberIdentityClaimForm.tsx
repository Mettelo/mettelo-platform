'use client';

import {FormEvent,useState} from 'react';
import {normalizeUsername,validateUsername} from '@/lib/member-identity';

export default function MemberIdentityClaimForm({next='/member/profile'}:{next?:string}){
  const [status,setStatus]=useState<'idle'|'working'|'error'|'success'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('working');setMessage('');
    const form=new FormData(event.currentTarget);const validation=validateUsername(String(form.get('username')||''));
    if(!validation.ok){setStatus('error');setMessage(validation.error);return;}
    try{
      const response=await fetch('/api/member-identity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:normalizeUsername(validation.username)})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok){setStatus('error');setMessage(payload.error||'We could not save your username. Please try again.');return;}
      setStatus('success');setMessage(`@${payload.identity?.username||validation.username} is now your Mettelo username. Continuing to your profile…`);
      const destination=next.startsWith('/')&&!next.startsWith('//')?next:'/member/profile';window.setTimeout(()=>window.location.assign(destination),400);
    }catch{
      setStatus('error');setMessage('We could not reach the identity service. Check your connection and try again.');
    }
  }
  const working=status==='working'||status==='success';
  return <form onSubmit={submit} className="formCard" style={{maxWidth:620}} aria-busy={status==='working'}><label htmlFor="username">Username *</label><div style={{display:'flex',alignItems:'center',gap:8}}><span aria-hidden="true" style={{fontWeight:700}}>@</span><input id="username" name="username" required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" aria-describedby="username-help username-status" pattern="[A-Za-z][A-Za-z0-9_]{2,29}" disabled={working} style={{minWidth:0,flex:1,minHeight:44}}/></div><p id="username-help" className="passwordHelp">3–30 characters. Start with a letter; use letters, numbers or underscores. Usernames are stored in lowercase and must be unique.</p><button className="button dark" type="submit" disabled={working} style={{width:'100%',minHeight:44,marginTop:18}}>{status==='working'?'Saving username…':status==='success'?'Username saved ✓':'Claim username →'}</button><div id="username-status" className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div></form>;
}
