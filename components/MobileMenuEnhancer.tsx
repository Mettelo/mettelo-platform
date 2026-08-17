'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/client';

type AccountState={email:string;name:string;isAdmin:boolean;avatarUrl:string|null}|null;
type OpenSection='account'|'explore'|null;

const primaryLinks=[['Home','/','home'],['Projects','/projects','projects'],['Opportunities','/opportunities','opportunities'],['Proof','/showcase','proof'],['Events','/events','events']] as const;
const secondaryLinks=[['For organisations','/organisations','organisations'],['About Mettelo','/about','about']] as const;
const exploreLinks=[['Community','/community'],['Insights','/blog'],['Spotlight','/spotlight'],['Careers','/careers'],['FAQ','/faq'],['Contact','/contact'],['Feedback','/feedback']] as const;

function Chevron({open=false}:{open?:boolean}){return <span className={`mobilePublicChevron${open?' isOpen':''}`} aria-hidden="true">⌄</span>}

function NavIcon({name}:{name:string}){
  const common={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
  if(name==='home')return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m3 10 9-7 9 7v10H3z"/><path {...common} d="M9 20v-6h6v6"/></svg>;
  if(name==='projects')return <svg viewBox="0 0 24 24" aria-hidden="true"><rect {...common} x="3" y="7" width="18" height="13" rx="2"/><path {...common} d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>;
  if(name==='opportunities')return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9z"/></svg>;
  if(name==='proof')return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6z"/><path {...common} d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if(name==='events')return <svg viewBox="0 0 24 24" aria-hidden="true"><rect {...common} x="3" y="5" width="18" height="16" rx="2"/><path {...common} d="M7 3v4M17 3v4M3 10h18"/></svg>;
  if(name==='organisations')return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M3 21V5l7-2v18M10 8h11v13M6 8h1M6 12h1M6 16h1M14 12h1M18 12h1M14 16h1M18 16h1"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="M12 10v6M12 7h.01"/></svg>;
}

export default function MobileMenuEnhancer(){
  const pathname=usePathname();
  const [mounted,setMounted]=useState(false);
  const [target,setTarget]=useState<HTMLElement|null>(null);
  const [account,setAccount]=useState<AccountState>(null);
  const [openSection,setOpenSection]=useState<OpenSection>(null);
  const returnFocus=useRef<HTMLElement|null>(null);

  useEffect(()=>{
    setMounted(true);
    setTarget(document.querySelector<HTMLElement>('.mobileMenuPanel'));
    document.body.classList.add('publicMobileNavV2');
    const supabase=createClient();
    let active=true;
    async function applyUser(user:User|null){
      if(!active)return;
      if(!user){setAccount(null);return;}
      const email=user.email||'';
      let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||email.split('@')[0]||'Member';
      let avatarUrl:string|null=null;
      const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
      if(profile?.full_name?.trim())name=profile.full_name.trim();
      if(profile?.avatar_url)avatarUrl=profile.avatar_url;
      if(active)setAccount({email,name,isAdmin:user.app_metadata?.role==='admin',avatarUrl});
    }
    void supabase.auth.getSession().then(({data})=>applyUser(data.session?.user||null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>void applyUser(session?.user||null));
    return()=>{active=false;subscription.unsubscribe();document.body.classList.remove('publicMobileNavV2','mobileNavOpen')};
  },[]);

  useEffect(()=>{
    if(!mounted||!target)return;
    const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');
    if(!menu)return;
    let backdrop=document.querySelector<HTMLButtonElement>('.mobileMenuBackdrop');
    if(!backdrop){
      backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='mobileMenuBackdrop';
      backdrop.setAttribute('aria-label','Close navigation menu');
      backdrop.hidden=true;
      // The panel is inside the header. Keeping the backdrop in that same
      // stacking context prevents it from painting over every drawer control.
      menu.insertBefore(backdrop,target);
    }
    const focusable=()=>Array.from(target?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')||[]).filter(element=>element.tabIndex!==-1&&!element.hidden);
    const sync=()=>{
      document.body.classList.toggle('mobileNavOpen',menu.open);
      backdrop!.hidden=!menu.open;
      if(menu.open){
        returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
        requestAnimationFrame(()=>target?.querySelector<HTMLElement>('.mobilePublicClose')?.focus());
      }else{
        setOpenSection(null);
        const opener=returnFocus.current||menu.querySelector<HTMLElement>('summary');
        requestAnimationFrame(()=>opener?.focus());
      }
    };
    const close=()=>{menu.open=false};
    const outside=(event:PointerEvent)=>{if(menu.open&&!menu.contains(event.target as Node)&&event.target!==backdrop)close()};
    const key=(event:KeyboardEvent)=>{
      if(!menu.open)return;
      if(event.key==='Escape'){event.preventDefault();close();return}
      if(event.key!=='Tab')return;
      const controls=focusable();
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    const backdropClick=()=>close();
    menu.addEventListener('toggle',sync);backdrop.addEventListener('click',backdropClick);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);sync();
    return()=>{menu.removeEventListener('toggle',sync);backdrop?.removeEventListener('click',backdropClick);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);backdrop?.remove()};
  },[mounted,target]);

  function closeMenu(){const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(menu)menu.open=false;setOpenSection(null)}
  function toggle(section:Exclude<OpenSection,null>){setOpenSection(current=>current===section?null:section)}
  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);closeMenu();window.location.assign('/')}

  if(!mounted)return null;
  if(!target)return null;

  const exploreOpen=openSection==='explore';
  const nav=<div className="mobilePublicNav" aria-label="Mobile website navigation">
    <header className="mobilePublicMenuHead">
      <strong>Menu</strong>
      <button type="button" className="mobilePublicClose" onClick={closeMenu} aria-label="Close navigation menu"><span aria-hidden="true">×</span></button>
    </header>
    <div className="mobilePublicScroll">
      <nav className="mobilePublicPrimary" aria-label="Primary mobile navigation">
        {primaryLinks.map(([label,href,icon])=><Link href={href} key={href} onClick={closeMenu} className={pathname===href?'isActive':undefined}><NavIcon name={icon}/><span>{label}</span></Link>)}
      </nav>

      <nav className="mobilePublicSecondary" aria-label="Secondary mobile navigation">
        {secondaryLinks.map(([label,href,icon])=><Link href={href} key={href} onClick={closeMenu} className={pathname===href?'isActive':undefined}><NavIcon name={icon}/><span>{label}</span></Link>)}
      </nav>

      <section className="mobilePublicExplore" aria-labelledby="mobile-public-explore-label">
        <button id="mobile-public-explore-label" type="button" className="mobilePublicDisclosure" aria-expanded={exploreOpen} aria-controls="mobile-public-explore" onClick={()=>toggle('explore')}><NavIcon name="explore"/><span>Explore</span><Chevron open={exploreOpen}/></button>
        <div id="mobile-public-explore" className={`mobilePublicExploreGrid${exploreOpen?' isOpen':''}`} aria-hidden={!exploreOpen}><div className="mobilePublicExploreInner">{exploreLinks.map(([label,href])=><Link href={href} key={href} tabIndex={exploreOpen?0:-1} onClick={closeMenu}>{label}</Link>)}</div></div>
      </section>
    </div>

    <div className="mobilePublicFooter">
      {!account&&<div className="mobilePublicGuestActions"><Link className="mobilePublicJoin" href="/signin?mode=signup" onClick={closeMenu}>Join Mettelo</Link><Link className="mobilePublicSignIn" href="/signin" onClick={closeMenu}>Sign in</Link></div>}

      {account&&<section className="mobilePublicAccount" aria-label="Account shortcuts">
        <button className="mobilePublicAccountTrigger" type="button" aria-expanded={openSection==='account'} aria-controls="mobile-public-account-panel" onClick={()=>toggle('account')}>
          <span className="mobilePublicAvatar" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span>
          <span className="mobilePublicIdentity"><strong>{account.name}</strong><small>{account.isAdmin?'Admin access':'Member account'}</small></span>
          <Chevron open={openSection==='account'}/>
        </button>
        <div id="mobile-public-account-panel" className="mobilePublicAccountLinks" hidden={openSection!=='account'}>
          <Link href="/member" onClick={closeMenu}>Dashboard</Link>
          <Link href="/member/profile" onClick={closeMenu}>Profile</Link>
          {account.isAdmin&&<Link href="/admin" onClick={closeMenu}>Admin console</Link>}
          <button type="button" className="mobilePublicSignOut" onClick={signOut}>Sign out</button>
        </div>
      </section>}
    </div>
  </div>;

  return createPortal(nav,target);
}
