'use client';

import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {createClient} from '@/lib/supabase/client';

type NavItem=[string,string,string];
type DropdownConfig={label:string;items:NavItem[]};
type AccountState={email:string;name:string;isAdmin:boolean}|null;

export default function HeaderNavigation({dropdowns}:{dropdowns:DropdownConfig[]}){
  const [open,setOpen]=useState<string|null>(null);
  const [account,setAccount]=useState<AccountState>(null);
  const [mounted,setMounted]=useState(false);
  const navRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    setMounted(true);
    const supabase=createClient();
    const applyUser=(user:{email?:string|null;user_metadata?:Record<string,unknown>;app_metadata?:Record<string,unknown>}|null)=>{
      if(!user){
        setAccount(null);
        document.body.classList.remove('authSignedIn');
        return;
      }
      const email=user.email||'';
      const rawName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:'';
      const name=rawName.trim()||email.split('@')[0]||'Member';
      setAccount({email,name,isAdmin:user.app_metadata?.role==='admin'});
      document.body.classList.add('authSignedIn');
    };
    supabase.auth.getUser().then(({data})=>applyUser(data.user));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>applyUser(session?.user||null));
    return()=>{
      subscription.unsubscribe();
      document.body.classList.remove('authSignedIn');
    };
  },[]);

  useEffect(()=>{
    function onPointerDown(event:MouseEvent){
      if(open&&navRef.current&&!navRef.current.contains(event.target as Node))setOpen(null);
    }
    function onKeyDown(event:KeyboardEvent){
      if(event.key==='Escape')setOpen(null);
    }
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
    document.body.classList.remove('authSignedIn');
    window.location.assign('/');
  }

  const accountPanel=account?<div className="accountMenu">
    <button className="accountTrigger" type="button" aria-expanded={open==='Account'} aria-controls="nav-account-panel" onClick={()=>setOpen(open==='Account'?null:'Account')}>
      <span className="accountAvatar" aria-hidden="true">{account.name.slice(0,1).toUpperCase()}</span>
      <span className="accountTriggerText"><strong>{account.name.split(' ')[0]}</strong><small>{account.isAdmin?'Admin':'Member'}</small></span>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </button>
    <div className={`accountPanel${open==='Account'?' isOpen':''}`} id="nav-account-panel">
      <div className="accountIdentity"><strong>{account.name}</strong><small>{account.email}</small></div>
      <a href="/member" onClick={()=>setOpen(null)}>My dashboard <span>→</span></a>
      <a href="/member#profile" onClick={()=>setOpen(null)}>Profile <span>→</span></a>
      {account.isAdmin&&<a href="/admin" onClick={()=>setOpen(null)}>Admin console <span>→</span></a>}
      <button type="button" onClick={signOut}>Sign out <span>→</span></button>
    </div>
  </div>:null;

  const desktopTarget=mounted?document.querySelector('.navActions'):null;
  const mobileTarget=mounted?document.querySelector('.mobileMenuPanel'):null;

  return <>
    <nav ref={navRef} className="primaryNav" aria-label="Primary navigation">
      <a className="primaryNavLink" href="/about">About</a>
      {dropdowns.map(({label,items})=>{
        const isOpen=open===label;
        const panelId=`nav-${label.toLowerCase()}-panel`;
        return <div className={`navDropdown${isOpen?' isOpen':''}`} key={label}>
          <button className="navDropdownTrigger" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={()=>setOpen(isOpen?null:label)}>
            <span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="navDropdownPanel" id={panelId} aria-hidden={!isOpen}>
            {items.map(([title,href,copy])=><a key={href} href={href} onClick={()=>setOpen(null)}><strong>{title}</strong><small>{copy}</small></a>)}
          </div>
        </div>;
      })}
      <a className="primaryNavLink" href="/partnership">Partner</a>
    </nav>
    {account&&desktopTarget&&createPortal(<div className="desktopAccountPortal">{accountPanel}</div>,desktopTarget)}
    {account&&mobileTarget&&createPortal(<div className="mobileAccountPortal"><div className="mobileDivider"/><a href="/member">My dashboard <span>→</span></a>{account.isAdmin&&<a href="/admin">Admin console <span>→</span></a>}<a href="/member#profile">Profile <span>→</span></a><button type="button" onClick={signOut}>Sign out <span>→</span></button></div>,mobileTarget)}
  </>;
}
