'use client';

import {useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

function maskEmail(value:string){const [local,domain='']=value.split('@');if(!local||!domain)return value||'your email';const visible=local.slice(0,1);return `${visible}${'*'.repeat(Math.max(3,Math.min(8,local.length-1)))}@${domain}`}
function safeNext(value:string|null){return value&&value.startsWith('/')&&!value.startsWith('//')?value:'/member'}

export default function CheckEmailPage(){
  const params=useMemo(()=>typeof window==='undefined'?new URLSearchParams():new URLSearchParams(window.location.search),[]);
  const email=params.get('email')||'';const next=safeNext(params.get('next'));
  const [cooldown,setCooldown]=useState(0);const [status,setStatus]=useState<'idle'|'working'|'success'|'error'>('idle');const [message,setMessage]=useState('');

  async function resend(){if(!email||cooldown>0)return;setStatus('working');setMessage('');try{const supabase=createClient();const redirect=`${window.location.origin}/auth/callback?flow=signup&next=${encodeURIComponent(next)}`;const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:redirect}});if(error)throw error;setStatus('success');setMessage('A new verification email has been sent. Please check your inbox.');setCooldown(60);let remaining=60;const timer=window.setInterval(()=>{remaining-=1;setCooldown(remaining);if(remaining<=0)window.clearInterval(timer)},1000)}catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'We could not send another verification email. Please try again shortly.')}}
  function openEmailApp(){window.location.href='mailto:'}

  return <section className="section softSection"><div className="shell" style={{maxWidth:760}}><div className="panel" style={{padding:'clamp(24px,5vw,52px)'}}><div className="eyebrow">Account verification</div><h1 style={{fontSize:'clamp(2.35rem,7vw,4.25rem)',margin:'0 0 14px'}}>Verify your email address.</h1><p className="lead" style={{marginBottom:12}}>We sent a verification email to <strong>{maskEmail(email)}</strong>. Open the message and select the verification link to confirm your address and continue setting up your Mettelo account.</p><p style={{color:'var(--slate)'}}>If you do not see the email, check your spam or junk folder. You can request another verification email below, or return to sign up if the address is incorrect.</p><div className="actions" style={{alignItems:'stretch',flexWrap:'wrap'}}><button className="button dark" type="button" onClick={openEmailApp}>Open email app</button><button className="button ghost" type="button" onClick={resend} disabled={!email||status==='working'||cooldown>0}>{status==='working'?'Sending…':cooldown>0?`Resend available in ${cooldown}s`:'Resend verification email'}</button><a className="button ghost" href={`/signin?mode=signup&next=${encodeURIComponent(next)}`}>Wrong email? Change it</a></div><div className={`formStatus ${status}`} role="status" aria-live="polite">{message}</div><div style={{marginTop:20,paddingTop:20,borderTop:'1px solid rgba(16,19,29,.12)'}}><strong>Need help?</strong><p style={{marginBottom:10,color:'var(--slate)'}}>Confirm that the email address is correct and check your spam or junk folder. If the message still does not arrive, contact Mettelo Support for assistance.</p><a className="linkArrow" href="/contact">Contact Mettelo support →</a></div></div></div></section>;
}
