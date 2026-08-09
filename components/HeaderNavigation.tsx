'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/client';

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
      if(!user){
        setAccount(null);
        document.body.classList.remove('authSignedIn');
        return;
      }
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

    // Restore the browser session immediately on public-page navigation, then
    // validate/refresh it from Auth so role changes are also picked up.
    supabase.auth.getSession().then(({data})=>void applyUser(data.session?.user||null));
    supabase.auth.getUser().then(({data})=>void applyUser(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>void applyUser(session?.user||null));
    return()=>{
      active=false;
      subscription.unsubscribe();
    };
  },[]);

  useEffect(()=>{
    function onPointerDown(event:MouseEvent){
      const target=event.target as Element|null;
      const insideAccount=Boolean(target?.closest('.accountMenu'));
      if(open&&!insideAccount&&navRef.current&&!navRef.current.contains(event.target as Node))setOpen(null);
    }
    function onKeyDown(event:KeyboardEvent){if(event.key==='Escape')setOpen(null);}
    document.addEventListener('mousedown',onPointerDown);
    document.addEventListener('keydown',onKeyDown);
    return()=>{
      document.removeEventListener('mousedown',onPointerDown);
      document.removeEventListener('keydown',onKeyDown);
    };
  },[open]);

  async function signOut(){
    const supabase=createClient();
    await supabase.auth.signOut();
    setAccount(null);
    document.body.classList.remove('authSignedIn');
    window.location.assign('/');
  }

  const accountPanel=account?<div className="accountMenu">
    <button className="accountTrigger" type="button" aria-expanded={open==='Account'} aria-controls="nav-account-panel" onClick={()=>setOpen(open==='Account'?null:'Account')}>
      <span className="accountAvatar" aria-hidden="true" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span>
      <span className="accountTriggerText"><strong>{account.name.split(' ')[0]}</strong><small>{account.isAdmin?'Admin':'Member'}</small></span>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <div className={`accountPanel${open==='Account'?' isOpen':''}`} id="nav-account-panel">
      <div className="accountIdentity"><strong>{account.name}</strong><small>{account.email}</small></div>
      <Link href="/member" onClick={()=>setOpen(null)}>My dashboard <span>→</span></Link>
      <Link href="/member#profile" onClick={()=>setOpen(null)}>Edit profile <span>→</span></Link>
      {account.isAdmin&&<Link href="/admin" onClick={()=>setOpen(null)}>Admin console <span>→</span></Link>}
      <button type="button" onClick={signOut}>Sign out <span>→</span></button>
    </div>
  </div>:null;

  const desktopTarget=mounted?document.querySelector('.navActions'):null;
  const mobileTarget=mounted?document.querySelector('.mobileMenuPanel'):null;

  return <>
    <nav ref={navRef} className="primaryNav" aria-label="Primary navigation">
      <Link className="primaryNavLink" href="/about">About</Link>
      {dropdowns.map(({label,items})=>{
        const isOpen=open===label;
        const panelId=`nav-${label.toLowerCase()}-panel`;
        return <div className={`navDropdown${isOpen?' isOpen':''}`} key={label}>
          <button className="navDropdownTrigger" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={()=>setOpen(isOpen?null:label)}>
            <span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="navDropdownPanel" id={panelId} aria-hidden={!isOpen}>
            {items.map(([title,href,copy])=><Link key={href} href={href} onClick={()=>setOpen(null)}><strong>{title}</strong><small>{copy}</small></Link>)}
          </div>
        </div>;
      })}
      <Link className="primaryNavLink" href="/partnership">Partner</Link>
    </nav>
    {account&&desktopTarget&&createPortal(<div className="desktopAccountPortal">{accountPanel}</div>,desktopTarget)}
    {account&&mobileTarget&&createPortal(<div className="mobileAccountPortal"><div className="mobileDivider"/><Link href="/member">My dashboard <span>→</span></Link>{account.isAdmin&&<Link href="/admin">Admin console <span>→</span></Link>}<Link href="/member#profile">Edit profile <span>→</span></Link><button type="button" onClick={signOut}>Sign out <span>→</span></button></div>,mobileTarget)}
  </>;
}
