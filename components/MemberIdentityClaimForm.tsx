'use client';

import {FormEvent,useState} from 'react';
import {normalizeUsername,validateUsername} from '@/lib/member-identity';

export default function MemberIdentityClaimForm({next='/member/profile'}:{next?:string}){
  const [status,setStatus]=useState<'idle'|'working'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('working');setMessage('');
    const form=new FormData(event.currentTarget);const validation=validateUsername(String(form.get('username')||''));
    if(!validation.ok){setStatus('error');setMessage(validation.error);return;}
    const response=await fetch('/api/member-identity',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:normalizeUsername(validation.username)})});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){setStatus('error');setMessage(payload.error||'We could not save your username. Please try again.');return;}
    window.location.assign(next.startsWith('/')&&!next.startsWith('//')?next:'/member/profile');
  }
  return <form onSubmit={submit} className="formCard" style={{maxWidth:620}}><label htmlFor="username">Username *</label><div style={{display:'flex',alignItems:'center',gap:8}}><span aria-hidden="true" style={{fontWeight:700}}>@</span><input id="username" name="username" required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" aria-describedby="username-help" pattern="[A-Za-z][A-Za-z0-9_]{2,29}" style={{minWidth:0,flex:1}}/></div><p id="username-help" className="passwordHelp">3–30 characters. Start with a letter; use letters, numbers or underscores. Usernames are stored in lowercase and must be unique.</p><button className="button dark" type="submit" disabled={status==='working'} style={{width:'100%',marginTop:18}}>{status==='working'?'Saving username…':'Claim username →'}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div></form>;
}
