'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

function safeNext(){
  if(typeof window==='undefined')return '/onboarding';
  const value=new URLSearchParams(window.location.search).get('next')||'/onboarding';
  return value.startsWith('/')&&!value.startsWith('//')?value:'/onboarding';
}

export default function SocialAccountCompletePage(){
  const configured=useMemo(()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),[]);
  const [email,setEmail]=useState('');
  const [provider,setProvider]=useState('your social provider');
  const [status,setStatus]=useState<'idle'|'working'|'error'>('idle');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(!configured)return;
    const supabase=createClient();
    void supabase.auth.getUser().then(({data,error})=>{
      if(error||!data.user){window.location.replace('/signin?error=expired-link');return;}
      setEmail(data.user.email||'');
      const value=data.user.app_metadata?.provider;
      if(value==='google')setProvider('Google');
      else if(value==='github')setProvider('GitHub');
    });
  },[configured]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setStatus('working');
    setMessage('');
    const form=new FormData(event.currentTarget);
    const password=String(form.get('password')||'');
    const confirmPassword=String(form.get('confirmPassword')||'');
    if(password.length<8){setStatus('error');setMessage('Your password must contain at least 8 characters.');return;}
    if(password!==confirmPassword){setStatus('error');setMessage('The passwords do not match.');return;}
    try{
      if(!configured)throw new Error('Authentication is not available on this deployment. Please contact Mettelo Support.');
      const supabase=createClient();
      const {error}=await supabase.auth.updateUser({password});
      if(error)throw error;
      window.location.assign(`/auth/verified?next=${encodeURIComponent(safeNext())}`);
    }catch(error){
      setStatus('error');
      setMessage(error instanceof Error?error.message:'We could not save your password. Please try again.');
    }
  }

  return <section className="section softSection"><div className="shell" style={{maxWidth:760}}><div className="panel" style={{padding:'clamp(24px,5vw,52px)'}}><div className="eyebrow">Complete account setup</div><h1 style={{fontSize:'clamp(2.35rem,7vw,4.25rem)',margin:'0 0 14px'}}>Secure your Mettelo account.</h1><p className="lead">{provider} has verified {email?<strong>{email}</strong>:'your email address'}. Create a Mettelo password to provide an additional sign-in and account-recovery method.</p><form onSubmit={submit} style={{marginTop:24}}><label htmlFor="password">Create password *</label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" aria-describedby="password-help"/><p id="password-help" style={{fontSize:'.76rem',color:'var(--slate)',marginTop:4}}>Use at least 8 characters. For stronger security, use a unique password that you do not use elsewhere.</p><label htmlFor="confirmPassword">Confirm password *</label><input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required autoComplete="new-password"/><button className="button dark" type="submit" disabled={status==='working'} style={{width:'100%',marginTop:20}}>{status==='working'?'Saving password…':'Save password and continue →'}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div></form><p style={{color:'var(--slate)',marginBottom:0}}>You can continue to sign in with {provider}. Your Mettelo password provides an additional secure way to access and recover your account.</p></div></div></section>;
}
