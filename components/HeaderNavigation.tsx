'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/client';
import styles from './HeaderNavigation.module.css';

type NavItem=[string,string,string];
type DropdownConfig={label:string;items:NavItem[]};
type AccountState={email:string;name:string;isAdmin:boolean;avatarUrl:string|null}|null;

export default function HeaderNavigation({dropdowns}:{dropdowns:DropdownConfig[]}){
  const [open,setOpen]=useState<string|null>(null);
  const [account,setAccount]=useState<AccountState>(null);
  const [mounted,setMounted]=useState(false);
  const navRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    setMounted(true);
    const supabase=createClient();
    let active=true;

    async function applyUser(user:User|null){
      if(!active)return;
      if(!user){setAccount(null);document.body.classList.remove('authSignedIn');return;}
      const email=user.email||'';
      const authName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';
      let name=authName||email.split('@')[0]||'Member';
      let avatarUrl:string|null=null;
      const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
      if(profile?.full_name?.trim())name=profile.full_name.trim();
      if(profile?.avatar_url)avatarUrl=profile.avatar_url;
      if(!active)return;
      setAccount({email,name,isAdmin:user.app_metadata?.role==='admin',avatarUrl});
      document.body.classList.add('authSignedIn');
    }

    supabase.auth.getSession().then(({data})=>void applyUser(data.session?.user||null));
    supabase.auth.getUser().then(({data})=>void applyUser(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>void applyUser(session?.user||null));
    return()=>{active=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    function onPointerDown(event:MouseEvent){const target=event.target as Element|null;const insideAccount=Boolean(target?.closest('.accountMenu'));if(open&&!insideAccount&&navRef.current&&!navRef.current.contains(event.target as Node))setOpen(null);}
    function onKeyDown(event:KeyboardEvent){if(event.key==='Escape')setOpen(null);}
    document.addEventListener('mousedown',onPointerDown);document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('mousedown',onPointerDown);document.removeEventListener('keydown',onKeyDown);};
  },[open]);

  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);document.body.classList.remove('authSignedIn');window.location.assign('/');}

  const accountPanel=account?<div className="accountMenu">
    <button className="accountTrigger" type="button" aria-expanded={open==='Account'} aria-controls="nav-account-panel" onClick={()=>setOpen(open==='Account'?null:'Account')}>
      <span className="accountAvatar" aria-hidden="true" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span>
      <span className="accountTriggerText"><strong>{account.name.split(' ')[0]}</strong><small>{account.isAdmin?'Admin':'Member'}</small></span>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <div className={`accountPanel${open==='Account'?' isOpen':''}`} id="nav-account-panel">
      <div className="accountIdentity"><strong>{account.name}</strong><small>{account.email}</small></div>
      <Link href="/member" onClick={()=>setOpen(null)}>My dashboard <span>→</span></Link>
      <Link href="/member/profile" onClick={()=>setOpen(null)}>Edit profile <span>→</span></Link>
      {account.isAdmin&&<Link href="/admin" onClick={()=>setOpen(null)}>Admin console <span>→</span></Link>}
      <div className="accountSecondaryLinks" aria-label="More Mettelo links"><Link href="/about" onClick={()=>setOpen(null)}>About Mettelo <span>→</span></Link></div>
      <button type="button" onClick={signOut}>Sign out <span>→</span></button>
    </div>
  </div>:null;

  const desktopTarget=mounted?document.querySelector('.navActions'):null;
  const mobileTarget=mounted?document.querySelector('.mobileMenuPanel'):null;

  return <>
    <nav ref={navRef} className={`${styles.headerNavigation} primaryNav`} aria-label="Primary navigation">
      <Link className="primaryNavLink" href="/about">About Mettelo</Link>
      {dropdowns.map(({label,items})=>{const isOpen=open===label;const panelId=`nav-${label.toLowerCase().replaceAll(' ','-')}-panel`;return <div className={`navDropdown${isOpen?' isOpen':''}`} key={label}><button className="navDropdownTrigger" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={()=>setOpen(isOpen?null:label)}><span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></button><div className="navDropdownPanel" id={panelId} aria-hidden={!isOpen}>{items.map(([title,href,copy])=><Link key={href} href={href} onClick={()=>setOpen(null)}><strong>{title}</strong><small>{copy}</small></Link>)}</div></div>;})}
    </nav>
    {account&&desktopTarget&&createPortal(<div className="desktopAccountPortal">{accountPanel}</div>,desktopTarget)}
    {account&&mobileTarget&&createPortal(<div className="mobileAccountPortal"><div className="mobileDivider"/><span className="mobileAccountLabel">Workspace</span><Link href="/member">My dashboard <span>→</span></Link>{account.isAdmin&&<Link href="/admin">Admin console <span>→</span></Link>}<Link href="/member/profile">Edit profile <span>→</span></Link><span className="mobileAccountLabel mobileAccountLabelSecondary">More</span><Link href="/about">About Mettelo <span>→</span></Link><button type="button" onClick={signOut}>Sign out <span>→</span></button></div>,mobileTarget)}
    <style jsx global>{`
      .authSignedIn .topbar{display:none}.authSignedIn .siteHeader{box-shadow:0 1px 0 rgba(16,19,29,.08);background:rgba(252,251,247,.97);backdrop-filter:blur(14px)}.authSignedIn .nav{height:72px}.authSignedIn .navActions>a[href="/signin"],.authSignedIn .navActions>a[href="/join"]{display:none}.authSignedIn .mobileMenuPanel>a[href="/about"],.authSignedIn .mobileMenuPanel>a[href="/signin"],.authSignedIn .mobileMenuPanel>a[href="/join"]{display:none}.authSignedIn .primaryNav{gap:4px}.authSignedIn .navDropdownTrigger{color:#3f4754;font-weight:650}.authSignedIn .navDropdownTrigger:hover,.authSignedIn .navDropdownTrigger:focus-visible{color:#10131d;background:#f7efdd}.authSignedIn .navDropdownPanel{border-color:rgba(16,19,29,.09);box-shadow:0 18px 48px rgba(16,19,29,.11)}.authSignedIn .navDropdownPanel a strong{color:#202633}.authSignedIn .navDropdownPanel a small{color:#6d7581}.desktopAccountPortal{margin-left:6px}.accountTrigger{min-height:44px;border:1px solid rgba(16,19,29,.09);border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(16,19,29,.035);transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease}.accountTrigger:hover,.accountTrigger:focus-visible{border-color:rgba(198,137,42,.36);background:#fffdfa;box-shadow:0 7px 20px rgba(16,19,29,.06)}.accountPanel{border:1px solid rgba(16,19,29,.09);border-radius:16px;box-shadow:0 18px 46px rgba(16,19,29,.12)}.accountIdentity{padding-bottom:11px;margin-bottom:5px;border-bottom:1px solid rgba(16,19,29,.08)}.accountIdentity strong{color:#10131d}.accountIdentity small{color:#747d89}.accountSecondaryLinks{margin-top:5px;padding-top:5px;border-top:1px solid rgba(16,19,29,.08)}.accountSecondaryLinks>a{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 11px;border-radius:10px;color:#69717d;font-size:.75rem;font-weight:600}.accountSecondaryLinks>a:hover,.accountSecondaryLinks>a:focus-visible{background:#f7efdd;color:#10131d}.mobileAccountLabel{display:block;margin:16px 0 5px;color:#7a8290;font-size:.64rem;font-weight:750;letter-spacing:.1em;text-transform:uppercase}.mobileAccountLabelSecondary{padding-top:10px;border-top:1px solid rgba(16,19,29,.08)}.authSignedIn .siteHeader a:focus-visible,.authSignedIn .siteHeader button:focus-visible{outline:3px solid rgba(198,137,42,.36);outline-offset:2px}@media(max-width:1080px){.authSignedIn .mobileMenuPanel{padding-top:12px}.desktopAccountPortal{display:none}}@media(prefers-reduced-motion:reduce){.accountTrigger{transition:none}}
    `}</style>
  </>;
}
