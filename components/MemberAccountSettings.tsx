'use client';

import {FormEvent,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import styles from './MemberAccountSettings.module.css';

type Account={email:string;full_name:string;username:string|null;member_id:string|null};
type Privacy={profile_discoverable:boolean;allow_project_invitations:boolean;allow_member_messages:boolean};
type NotificationPreference={event_key:string;product_area:string;description:string;default_channel:string;urgency:string;action_required:boolean;in_app_enabled:boolean;email_enabled:boolean};
type Props={account:Account;privacy:Privacy;notifications:NotificationPreference[]};
type Status='idle'|'saving'|'success'|'error';

export default function MemberAccountSettings({account,privacy:initialPrivacy,notifications:initialNotifications}:Props){
  const [privacy,setPrivacy]=useState(initialPrivacy);
  const [notifications,setNotifications]=useState(initialNotifications);
  const [email,setEmail]=useState(account.email);
  const [status,setStatus]=useState<Status>('idle');
  const [message,setMessage]=useState('');
  const groups=useMemo(()=>[...new Set(notifications.map(item=>item.product_area))],[notifications]);

  async function save(payload:Record<string,unknown>,successCopy:string){
    setStatus('saving');setMessage('Saving…');
    try{
      const response=await fetch('/api/account-preferences',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'We could not save this setting.');
      setStatus('success');setMessage(body.message||successCopy);
      return true;
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'We could not save this setting.');return false;}
  }

  async function savePrivacy(event:FormEvent){event.preventDefault();await save({section:'privacy',...privacy},'Privacy preferences saved.');}
  async function saveEmail(event:FormEvent){event.preventDefault();await save({section:'email',email},'Email change started.');}
  async function saveNotifications(event:FormEvent){event.preventDefault();await save({section:'notifications',preferences:notifications.map(({event_key,in_app_enabled,email_enabled})=>({event_key,in_app_enabled,email_enabled}))},'Notification preferences saved.');}
  async function sendPasswordReset(){
    setStatus('saving');setMessage('Preparing secure password reset…');
    try{
      const supabase=createClient();
      const redirect=`${window.location.origin}/auth/callback?flow=recovery&next=${encodeURIComponent('/auth/update-password')}`;
      const {error}=await supabase.auth.resetPasswordForEmail(account.email,{redirectTo:redirect});
      if(error)throw error;
      setStatus('success');setMessage('Password reset email sent. Follow the secure link in your inbox.');
    }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'We could not send the reset email.');}
  }

  return <div className={styles.workspace}>
    <header className={styles.hero}><div><span className="eyebrow">Account & preferences</span><h1>Control your Mettelo account.</h1></div><p>Keep account security, privacy and communication choices separate from your professional Profile. Your underlying Supabase Auth identity and Mettelo Member ID stay stable as these settings change.</p></header>

    <section className={styles.grid} aria-label="Member account settings">
      <article className={styles.card} aria-labelledby="identity-heading"><div className={styles.cardHead}><div><span className="cardNumber">IDENTITY</span><h2 id="identity-heading">Mettelo identity</h2></div><a className="button ghost" href="/member/identity">View identity</a></div><dl className={styles.identityList}><div><dt>Full name</dt><dd>{account.full_name||'Not added yet'}</dd></div><div><dt>Username</dt><dd>{account.username?`@${account.username}`:'Not claimed yet'}</dd></div><div><dt>Member ID</dt><dd>{account.member_id||'Preparing Member ID'}</dd></div></dl><p className={styles.help}>Your username is your people-facing handle. Member ID is a permanent support/reference identifier. Neither replaces your internal Auth ID.</p></article>

      <article className={styles.card} aria-labelledby="security-heading"><span className="cardNumber">SECURITY</span><h2 id="security-heading">Email & password</h2><form onSubmit={saveEmail}><label htmlFor="account-email">Account email</label><input id="account-email" type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/><p className={styles.help}>Changing email uses Supabase Auth and requires confirmation. Your projects, Proof and Member ID remain attached to the same account.</p><button className="button dark" type="submit" disabled={status==='saving'||email.trim().toLowerCase()===account.email.toLowerCase()}>Change email →</button></form><div className={styles.securityAction}><div><strong>Password</strong><p>Use Mettelo's existing verified recovery flow to set a new password.</p></div><button className="button ghost" type="button" onClick={sendPasswordReset} disabled={status==='saving'}>Send password reset</button></div></article>

      <article className={styles.card} aria-labelledby="privacy-heading"><span className="cardNumber">PRIVACY</span><h2 id="privacy-heading">Discovery & contact</h2><form onSubmit={savePrivacy} className={styles.stack}>
        <label className={styles.toggle}><input type="checkbox" checked={privacy.profile_discoverable} onChange={event=>setPrivacy(current=>({...current,profile_discoverable:event.target.checked}))}/><span><strong>Profile discoverability</strong><small>Allow your professional profile to appear in Mettelo People when public-profile requirements are satisfied.</small></span></label>
        <label className={styles.toggle}><input type="checkbox" checked={privacy.allow_project_invitations} onChange={event=>setPrivacy(current=>({...current,allow_project_invitations:event.target.checked}))}/><span><strong>Project invitations</strong><small>Allow eligible Mettelo members and project leads to invite you when invitation functionality is available.</small></span></label>
        <label className={styles.toggle}><input type="checkbox" checked={privacy.allow_member_messages} onChange={event=>setPrivacy(current=>({...current,allow_member_messages:event.target.checked}))}/><span><strong>Member messages</strong><small>Allow direct member-to-member contact when messaging outside project teams becomes available.</small></span></label>
        <button className="button dark" type="submit" disabled={status==='saving'}>Save privacy →</button>
      </form></article>

      <article className={`${styles.card} ${styles.notifications}`} aria-labelledby="notifications-heading"><span className="cardNumber">NOTIFICATIONS</span><h2 id="notifications-heading">Communication preferences</h2><p className={styles.help}>Choose how Mettelo contacts you for configurable events. Critical security or legally required messages may still be sent where necessary.</p><form onSubmit={saveNotifications}>
        {groups.length?groups.map(group=><section className={styles.notificationGroup} key={group}><h3>{group}</h3>{notifications.filter(item=>item.product_area===group).map(item=><div className={styles.notificationRow} key={item.event_key}><div><strong>{item.description}</strong>{item.action_required&&<small className={styles.actionRequired}>Action may be required</small>}</div><label><input type="checkbox" checked={item.in_app_enabled} onChange={event=>setNotifications(current=>current.map(entry=>entry.event_key===item.event_key?{...entry,in_app_enabled:event.target.checked}:entry))}/> In-app</label><label><input type="checkbox" checked={item.email_enabled} onChange={event=>setNotifications(current=>current.map(entry=>entry.event_key===item.event_key?{...entry,email_enabled:event.target.checked}:entry))}/> Email</label></div>)}</section>):<div className={styles.empty}><strong>No configurable notification events yet.</strong><p>Your essential account communications remain available.</p></div>}
        {groups.length>0&&<button className="button dark" type="submit" disabled={status==='saving'}>Save notifications →</button>}
      </form></article>
    </section>

    <div className={`${styles.status} formStatus ${status}`} role="status" aria-live="polite" aria-atomic="true">{message}</div>
  </div>;
}
