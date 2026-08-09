'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function SignInPage(){
  const [mode,setMode]=useState<'signin'|'signup'|'reset'>('signin');
  const [status,setStatus]=useState<'idle'|'working'|'success'|'error'>('idle');
  const [message,setMessage]=useState('');
  const configured=useMemo(()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),[]);

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    setStatus('working');setMessage('');
    try{
      if(!configured) throw new Error('Account access is temporarily unavailable on this deployment.');
      const form=new FormData(event.currentTarget);
      const email=String(form.get('email')||'').trim();
      const password=String(form.get('password')||'');
      const fullName=String(form.get('fullName')||'').trim();
      const supabase=createClient();
      if(mode==='signup'){
        const {data,error}=await supabase.auth.signUp({
          email,
          password,
          options:{
            data:{full_name:fullName},
            emailRedirectTo:`${window.location.origin}/auth/callback?next=/member`
          }
        });
        if(error) throw error;
        if(data.session){window.location.assign('/member');return;}
        setStatus('success');setMessage('Account created. Check your email to confirm your address, then continue to My Mettelo.');
      }else if(mode==='reset'){
        const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/update-password`});
        if(error) throw error;
        setStatus('success');setMessage('Password reset email sent. Check your inbox.');
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;
        window.location.assign('/member');
      }
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Something went wrong. Please try again.');}
  }

  return <section className="section softSection"><div className="shell formShell"><div><div className="eyebrow">My Mettelo</div><h1 style={{fontSize:'clamp(2.8rem,6vw,5.2rem)',margin:0}}>{mode==='signup'?'Create your Mettelo account':mode==='reset'?'Reset your password':'Sign in to My Mettelo'}</h1><p className="lead">One account connects your profile, applications, projects, contribution and proof record.</p><div className="actions"><button className="button ghost" type="button" onClick={()=>{setMode('signin');setStatus('idle');setMessage('')}}>Sign in</button><button className="button ghost" type="button" onClick={()=>{setMode('signup');setStatus('idle');setMessage('')}}>Create account</button><button className="button ghost" type="button" onClick={()=>{setMode('reset');setStatus('idle');setMessage('')}}>Reset password</button></div></div><form className="formCard" onSubmit={submit}>{mode==='signup'&&<><label htmlFor="fullName">Full name *</label><input id="fullName" name="fullName" required autoComplete="name"/></>}<label htmlFor="email">Email address *</label><input id="email" name="email" type="email" required autoComplete="email"/>{mode!=='reset'&&<><label htmlFor="password">Password *</label><input id="password" name="password" type="password" minLength={8} required autoComplete={mode==='signup'?'new-password':'current-password'}/></>}<button className="button dark" type="submit" disabled={status==='working'} style={{width:'100%',marginTop:20}}>{status==='working'?'Please wait…':mode==='signup'?'Create free account →':mode==='reset'?'Send reset link →':'Sign in →'}</button><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div><p style={{fontSize:'.76rem',color:'var(--slate)'}}>By creating an account, you agree to the <a href="/terms"><u>Terms of Use</u></a> and acknowledge the <a href="/privacy"><u>Privacy Policy</u></a>.</p></form></div></section>;
}
