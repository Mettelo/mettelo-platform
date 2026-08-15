'use client';

import {useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

function maskEmail(value:string){const [local,domain='']=value.split('@');if(!local||!domain)return value||'your email';const visible=local.slice(0,1);return `${visible}${'*'.repeat(Math.max(3,Math.min(8,local.length-1)))}@${domain}`}
function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/member'}

export default function CheckEmailPage(){
  const params=useMemo(()=>typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),[]);
  const email=params.get('email')||'';const next=safeNext(params.get('next'));
  const [cooldown,setCooldown]=useState(0);const [status,setStatus]=useState<'idle'|'working'|'success'|'error'>('idle');const [message,setMessage]=useState('');

  async function resend(){if(!email||cooldown>0)return;setStatus('working');setMessage('');try{const supabase=createClient();const redirect=`${window.location.origin}/auth/callback?flow=signup&next=${encodeURIComponent(next)}`;const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect}});if(error)throw error;setStatus('success');setMessage('A new verification email has been sent.');setCooldown(60);let remaining=60;const timer=window.setInterval(()=>{remaining-=1;setCooldown(remaining);if(remaining<=0)window.clearInterval(timer)},1000)}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'We could not resend the verification email. Please try again.')}}

  return <section className="section softSection"><div className="shell" style={{maxWidth:760}}><div className="panel" style={{padding:'clamp(24px,5vw,52px)'}}><div className="eyebrow">Account verification</div><h1 style={{fontSize:'clamp(2.35rem,7vw,4.25rem)',margin:'0 0 14px'}}>Check your email.</h1><p className="lead" style={{marginBottom:12}}>We sent a verification link to <strong>{maskEmail(email)}</strong>. Open it to confirm your address and continue setting up My Mettelo.</p><p style={{color:'var(--slate)'}}>Didn&apos;t receive it? Check spam or junk first. You can resend the email below, or change the address and create the account again.</p><div className="actions" style={{alignItems:'stretch',flexWrap:'wrap'}}><button className="button dark" type="button" onClick={resend} disabled={!email||status==='working'||cooldown>0}>{status==='working'?'Sending…':cooldown>0?`Resend available in ${cooldown}s`:'Resend verification email'}</button><a className="button ghost" href={`/signin?mode=signup&next=${encodeURIComponent(next)}`}>Wrong email? Change it</a></div><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div><div style={{marginTop:20,paddingTop:20,borderTop:'1px solid rgba(16,19,29,.12)'}}><strong>Still stuck?</strong><p style={{marginBottom:0,color:'var(--slate)'}}>Check that you entered the address correctly, look in spam/junk, then contact Mettelo support if the message still does not arrive.</p></div></div></div></section>;
}
