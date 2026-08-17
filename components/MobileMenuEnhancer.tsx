'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/client';

type AccountState={email:string;name:string;isAdmin:boolean;avatarUrl:string|null}|null;
type OpenSection='account'|'explore'|null;

const primaryLinks=[['Home','/','home'],['Projects','/projects','projects'],['Opportunities','/opportunities','opportunities'],['Proof','/showcase','proof'],['Events','/events','events']] as const;
const secondaryLinks=[['For organisations','/organisations','organisations'],['About Mettelo','/about','about']] as const;
const exploreLinks=[['Community','/community'],['Insights','/blog'],['Spotlight','/spotlight'],['Careers','/careers'],['FAQ','/faq'],['Contact','/contact'],['Feedback','/feedback']] as const;

function Chevron({open=false}:{open?:boolean}){return <span className="mobilePublicChevron" aria-hidden="true">{open?'⌃':'⌄'}</span>}

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
  const [account,setAccount]=useState<AccountState>(null);
  const [openSection,setOpenSection]=useState<OpenSection>(null);

  useEffect(()=>{
    setMounted(true);
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
    if(!mounted)return;
    const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');
    if(!menu)return;
    let backdrop=document.querySelector<HTMLButtonElement>('.mobileMenuBackdrop');
    if(!backdrop){backdrop=document.createElement('button');backdrop.type='button';backdrop.className='mobileMenuBackdrop';backdrop.setAttribute('aria-label','Close navigation menu');backdrop.hidden=true;document.body.appendChild(backdrop)}
    const sync=()=>{document.body.classList.toggle('mobileNavOpen',menu.open);backdrop!.hidden=!menu.open;if(!menu.open)setOpenSection(null)};
    const close=()=>{menu.open=false;sync();menu.querySelector<HTMLElement>('summary')?.focus()};
    const outside=(event:PointerEvent)=>{if(menu.open&&!menu.contains(event.target as Node)&&event.target!==backdrop)close()};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&menu.open)close()};
    const backdropClick=()=>close();
    menu.addEventListener('toggle',sync);backdrop.addEventListener('click',backdropClick);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);sync();
    return()=>{menu.removeEventListener('toggle',sync);backdrop?.removeEventListener('click',backdropClick);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);backdrop?.remove()};
  },[mounted]);

  function closeMenu(){const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(menu){menu.open=false;document.body.classList.remove('mobileNavOpen');document.querySelector<HTMLButtonElement>('.mobileMenuBackdrop')?.setAttribute('hidden','')}setOpenSection(null);menu?.querySelector<HTMLElement>('summary')?.focus()}
  function toggle(section:Exclude<OpenSection,null>){setOpenSection(current=>current===section?null:section)}
  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);closeMenu();window.location.assign('/')}

  if(!mounted)return null;
  const target=document.querySelector('.mobileMenuPanel');
  if(!target)return null;

  const nav=<div className="mobilePublicNav" aria-label="Mobile website navigation">
    <button type="button" className="mobilePublicClose" onClick={closeMenu} aria-label="Close navigation menu">×</button>

    <nav className="mobilePublicPrimary" aria-label="Primary mobile navigation">
      {primaryLinks.map(([label,href,icon])=><Link href={href} key={href} onClick={closeMenu} className={pathname===href?'isActive':undefined}><NavIcon name={icon}/><span>{label}</span></Link>)}
    </nav>

    <nav className="mobilePublicSecondary" aria-label="Secondary mobile navigation">
      {secondaryLinks.map(([label,href,icon])=><Link href={href} key={href} onClick={closeMenu} className={pathname===href?'isActive':undefined}><NavIcon name={icon}/><span>{label}</span></Link>)}
    </nav>

    <section className="mobilePublicExplore" aria-labelledby="mobile-public-explore-label">
      <button id="mobile-public-explore-label" type="button" className="mobilePublicDisclosure" aria-expanded={openSection==='explore'} aria-controls="mobile-public-explore" onClick={()=>toggle('explore')}><NavIcon name="explore"/><span>Explore</span><Chevron open={openSection==='explore'}/></button>
      <div id="mobile-public-explore" className="mobilePublicExploreGrid" hidden={openSection!=='explore'}>{exploreLinks.map(([label,href])=><Link href={href} key={href} onClick={closeMenu}>{label}</Link>)}</div>
    </section>

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
