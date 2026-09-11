'use client';

import {FormEvent,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import styles from './MemberAccountSettings.module.css';

type Account={email:string;full_name:string;username:string|null;member_id:string|null};
type Privacy={profile_discoverable:boolean;allow_project_invitations:boolean;allow_member_messages:boolean;allow_collaboration_recommendations:boolean};
type NotificationPreference={event_key:string;product_area:string;description:string;default_channel:string;urgency:string;action_required:boolean;required:boolean;in_app_enabled:boolean;email_enabled:boolean};
type Props={account:Account;privacy:Privacy;notifications:NotificationPreference[]};
type Status='idle'|'saving'|'success'|'error';
type Section='identity'|'security'|'privacy'|'notifications';
type Feedback={status:Status;message:string};

const idle:Feedback={status:'idle',message:''};

export default function MemberAccountSettings({account:initialAccount,privacy:initialPrivacy,notifications:initialNotifications}:Props){
  const [account,setAccount]=useState(initialAccount);
  const [privacy,setPrivacy]=useState(initialPrivacy);
  const [notifications,setNotifications]=useState(initialNotifications);
  const [email,setEmail]=useState(initialAccount.email);
  const [username,setUsername]=useState(initialAccount.username||'');
  const [feedback,setFeedback]=useState<Record<Section,Feedback>>({identity:idle,security:idle,privacy:idle,notifications:idle});
  const groups=useMemo(()=>[...new Set(notifications.map(item=>item.product_area))],[notifications]);
  const configurableNotifications=notifications.filter(item=>!item.required);
  const claimingUsername=!account.username;

  function setSectionFeedback(section:Section,status:Status,message:string){setFeedback(current=>({...current,[section]:{status,message}}));}
  function isSaving(section:Section){return feedback[section].status==='saving';}

  async function save(section:Section,payload:Record<string,unknown>,successCopy:string){
    setSectionFeedback(section,'saving','Saving changes…');
    try{
      const response=await fetch('/api/account-preferences',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'We could not save this setting.');
      setSectionFeedback(section,'success',body.message||successCopy);return true;
    }catch(error){setSectionFeedback(section,'error',error instanceof Error?error.message:'We could not save this setting.');return false;}
  }

  async function savePrivacy(event:FormEvent){event.preventDefault();await save('privacy',{section:'privacy',...privacy},'Privacy preferences saved.');}
  async function saveEmail(event:FormEvent){event.preventDefault();const ok=await save('security',{section:'email',email},'Email change started.');if(!ok)setEmail(account.email);}
  async function saveNotifications(event:FormEvent){event.preventDefault();await save('notifications',{section:'notifications',preferences:configurableNotifications.map(({event_key,in_app_enabled,email_enabled})=>({event_key,in_app_enabled,email_enabled}))},'Notification preferences saved.');}

  async function saveUsername(event:FormEvent){
    event.preventDefault();
    const method=claimingUsername?'POST':'PATCH';
    setSectionFeedback('identity','saving',claimingUsername?'Claiming username…':'Updating username…');
    try{
      const response=await fetch('/api/member-identity',{method,headers:{'content-type':'application/json'},body:JSON.stringify({username})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||(claimingUsername?'We could not claim your username.':'We could not change your username.'));
      const next=String(body.identity?.username||username).toLowerCase();
      const nextMemberId=String(body.identity?.member_id||account.member_id||'')||null;
      setUsername(next);setAccount(current=>({...current,username:next,member_id:nextMemberId}));
      setSectionFeedback('identity','success',claimingUsername?'Username claimed. Your permanent Member ID and project history stay attached to this account.':'Username updated. Your Member ID and project history are unchanged.');
    }catch(error){
      setUsername(account.username||username);
      setSectionFeedback('identity','error',error instanceof Error?error.message:(claimingUsername?'We could not claim your username.':'We could not change your username.'));
    }
  }

  async function sendPasswordReset(){
    setSectionFeedback('security','saving','Preparing secure password reset…');
    try{
      const supabase=createClient();
      const redirect=`${window.location.origin}/auth/callback?flow=recovery&next=${encodeURIComponent('/auth/update-password')}`;
      const {error}=await supabase.auth.resetPasswordForEmail(account.email,{redirectTo:redirect});
      if(error)throw error;
      setSectionFeedback('security','success','Password reset email sent. Follow the secure link in your inbox.');
    }catch(error){setSectionFeedback('security','error',error instanceof Error?error.message:'We could not send the reset email.');}
  }

  const status=(section:Section)=><div className={`${styles.sectionStatus} formStatus ${feedback[section].status}`} role="status" aria-live="polite" aria-atomic="true">{feedback[section].message}</div>;

  return <div className={styles.workspace}>
    <header className={styles.hero}>
      <div><span className="eyebrow">Account control centre</span><h1>Your account, without the clutter.</h1><p>Manage identity, security, privacy and communication preferences in one clear place. Your permanent Member ID keeps your projects, contributions and Proof connected even when editable details change.</p></div>
      <aside className={styles.identitySnapshot} aria-label="Account identity summary"><span className={styles.avatar} aria-hidden="true">{(account.full_name||account.email||'M').trim().charAt(0).toUpperCase()}</span><div><small>Mettelo identity</small><strong>{account.full_name||'Member account'}</strong><span>{account.username?`@${account.username}`:'Username not claimed'}</span></div><div className={styles.memberBadge}><small>Member ID</small><strong>{account.member_id||'Preparing…'}</strong></div></aside>
    </header>

    <nav className={styles.sectionNav} aria-label="Account settings sections"><a href="#identity">Identity</a><a href="#security">Security</a><a href="#privacy">Privacy</a><a href="#notifications">Notifications</a></nav>

    <main className={styles.settingsGrid}>
      <article id="identity" className={`${styles.card} ${styles.primaryCard}`} aria-labelledby="identity-heading">
        <header className={styles.cardHeader}><div><span className={styles.kicker}>01 · Identity</span><h2 id="identity-heading">Username & Member ID</h2><p>Use a people-facing username while keeping your permanent Mettelo identity stable.</p></div><span className={`${styles.statePill} ${account.username?styles.complete:styles.attention}`}>{account.username?'Username active':'Action needed'}</span></header>
        <form onSubmit={saveUsername} className={styles.formBlock}>
          <label htmlFor="account-username">{claimingUsername?'Claim your username':'Username'}</label>
          <div className={styles.handleField}><span aria-hidden="true">@</span><input id="account-username" name="username" required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} pattern="[A-Za-z][A-Za-z0-9_]{2,29}" value={username} onChange={event=>setUsername(event.target.value)} aria-describedby="account-username-help"/></div>
          <p id="account-username-help" className={styles.help}>3–30 characters. Start with a letter; use letters, numbers or underscores. Usernames are stored in lowercase and must be unique.</p>
          <button className="button dark" type="submit" disabled={isSaving('identity')||(!claimingUsername&&username.trim().toLowerCase()===(account.username||'').toLowerCase())}>{isSaving('identity')?'Saving…':claimingUsername?'Claim username →':'Change username →'}</button>
        </form>
        {status('identity')}
        <dl className={styles.identityList}><div><dt>Full name</dt><dd>{account.full_name||'Not added yet'}</dd></div><div><dt>Public username</dt><dd>{account.username?`@${account.username}`:'Not claimed yet'}</dd></div><div><dt>Permanent Member ID</dt><dd>{account.member_id||'Preparing Member ID'}</dd></div></dl>
      </article>

      <article id="security" className={styles.card} aria-labelledby="security-heading">
        <header className={styles.cardHeader}><div><span className={styles.kicker}>02 · Security</span><h2 id="security-heading">Email & password</h2><p>Account credentials stay with Supabase Auth and are kept separate from your public profile.</p></div></header>
        <form onSubmit={saveEmail} className={styles.formBlock}><label htmlFor="account-email">Account email</label><input id="account-email" type="email" required autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/><button className="button dark" type="submit" disabled={isSaving('security')||email.trim().toLowerCase()===account.email.toLowerCase()}>Change email →</button></form>
        <div className={styles.securityAction}><div><strong>Password & recovery</strong><p>Send a verified recovery link to your current account email.</p></div><button className="button ghost" type="button" onClick={sendPasswordReset} disabled={isSaving('security')}>{isSaving('security')?'Working…':'Send reset link'}</button></div>
        {status('security')}
      </article>

      <article id="privacy" className={styles.card} aria-labelledby="privacy-heading">
        <header className={styles.cardHeader}><div><span className={styles.kicker}>03 · Privacy</span><h2 id="privacy-heading">Discovery & contact</h2><p>Choose how other members and project teams can discover or contact you.</p></div></header>
        <form onSubmit={savePrivacy} className={styles.stack}>
          <label className={styles.toggle}><input type="checkbox" checked={privacy.profile_discoverable} onChange={event=>setPrivacy(current=>({...current,profile_discoverable:event.target.checked}))}/><span><strong>Profile discoverability</strong><small>Allow eligible Mettelo members to find your professional profile.</small></span></label>
          <label className={styles.toggle}><input type="checkbox" checked={privacy.allow_project_invitations} onChange={event=>setPrivacy(current=>({...current,allow_project_invitations:event.target.checked}))}/><span><strong>Project invitations</strong><small>Allow eligible project teams to invite you to relevant work.</small></span></label>
          <label className={styles.toggle}><input type="checkbox" checked={privacy.allow_member_messages} onChange={event=>setPrivacy(current=>({...current,allow_member_messages:event.target.checked}))}/><span><strong>Member messages</strong><small>Allow direct member contact where member-to-member messaging is available.</small></span></label>
          <label className={styles.toggle}><input type="checkbox" checked={privacy.allow_collaboration_recommendations} onChange={event=>setPrivacy(current=>({...current,allow_collaboration_recommendations:event.target.checked}))}/><span><strong>Collaboration recommendations</strong><small>Show explainable collaborator-needed opportunities on Member Home.</small></span></label>
          <button className="button dark" type="submit" disabled={isSaving('privacy')}>{isSaving('privacy')?'Saving…':'Save privacy →'}</button>
        </form>{status('privacy')}
      </article>

      <article id="notifications" className={`${styles.card} ${styles.notifications}`} aria-labelledby="notifications-heading">
        <header className={styles.cardHeader}><div><span className={styles.kicker}>04 · Notifications</span><h2 id="notifications-heading">Communication preferences</h2><p>Control optional alerts by purpose. Essential account and security communications remain protected.</p></div><span className={styles.statePill}>{configurableNotifications.length} configurable</span></header>
        <form onSubmit={saveNotifications}>
          <div className={styles.notificationGrid}>{groups.length?groups.map(group=><section className={styles.notificationGroup} key={group} aria-labelledby={`notification-group-${group.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`}><h3 id={`notification-group-${group.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`}>{group}</h3>{notifications.filter(item=>item.product_area===group).map(item=><div className={styles.notificationRow} key={item.event_key}><div><strong>{item.description}</strong>{item.required?<small className={styles.actionRequired}>Required</small>:item.action_required&&<small className={styles.actionRequired}>Action may be required</small>}</div><label><input type="checkbox" disabled={item.required} checked={item.in_app_enabled} onChange={event=>setNotifications(current=>current.map(entry=>entry.event_key===item.event_key?{...entry,in_app_enabled:event.target.checked}:entry))}/><span>In-app</span></label><label><input type="checkbox" disabled={item.required} checked={item.email_enabled} onChange={event=>setNotifications(current=>current.map(entry=>entry.event_key===item.event_key?{...entry,email_enabled:event.target.checked}:entry))}/><span>Email</span></label></div>)}</section>):<div className={styles.empty}><strong>No configurable notification events yet.</strong><p>Your essential account communications remain available.</p></div>}</div>
          {configurableNotifications.length>0&&<div className={styles.notificationActions}><button className="button dark" type="submit" disabled={isSaving('notifications')}>{isSaving('notifications')?'Saving…':'Save notifications →'}</button></div>}
        </form>{status('notifications')}
      </article>
    </main>
  </div>;
}
