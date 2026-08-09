'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage(){
  const [status,setStatus]=useState<'idle'|'working'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setStatus('working');setMessage('');
    try{
      const password=String(new FormData(event.currentTarget).get('password')||'');
      const supabase=createClient();
      const {error}=await supabase.auth.updateUser({password});
      if(error) throw error;
      setStatus('success');setMessage('Password updated. You can now continue to My Mettelo.');
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Unable to update password.');}
  }
  return <section className="section softSection"><div className="shell formShell"><div><div className="eyebrow">Account security</div><h1 style={{fontSize:'clamp(2.8rem,6vw,5rem)',margin:0}}>Choose a new password.</h1><p className="lead">Use at least eight characters and keep it unique to Mettelo.</p></div><form className="formCard" onSubmit={submit}><label htmlFor="password">New password *</label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password"/><button className="button dark" type="submit" disabled={status==='working'} style={{width:'100%',marginTop:20}}>{status==='working'?'Updating…':'Update password →'}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div>{status==='success'&&<a className="button ghost" href="/member" style={{width:'100%'}}>Open My Mettelo →</a>}</form></div></section>;
}
