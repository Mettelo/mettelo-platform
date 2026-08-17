'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/client';

type AccountState={email:string;name:string;isAdmin:boolean;avatarUrl:string|null}|null;
type OpenSection='account'|'explore'|null;
type IconName='home'|'projects'|'opportunities'|'proof'|'events'|'organisations'|'about'|'explore';

const primaryLinks=[['Home','/','home'],['Projects','/projects','projects'],['Opportunities','/opportunities','opportunities'],['Proof','/showcase','proof'],['Events','/events','events']] as const;
const secondaryLinks=[['For organisations','/organisations','organisations'],['About Mettelo','/about','about']] as const;
const exploreLinks=[['Community','/community'],['Insights','/blog'],['Spotlight','/spotlight'],['Careers','/careers'],['FAQ','/faq'],['Contact','/contact'],['Feedback','/feedback']] as const;

function NavIcon({name}:{name:IconName}){
  const common={width:20,height:20,viewBox:'0 0 24 24','aria-hidden':true} as const;
  if(name==='home')return <svg {...common}><path d="M4 10.5 12 4l8 6.5V20H5.5A1.5 1.5 0 0 1 4 18.5v-8Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9.5 20v-5h5v5" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
  if(name==='projects')return <svg {...common}><rect x="4" y="7" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M4 11h16" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
  if(name==='opportunities')return <svg {...common}><path d="m12 3 2.2 4.6 5.1.7-3.7 3.6.9 5.1-4.5-2.4L7.5 17l.9-5.1-3.7-3.6 5.1-.7L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
  if(name==='proof')return <svg {...common}><path d="M12 3.5 19 6v5.3c0 4.1-2.7 7.6-7 9.2-4.3-1.6-7-5.1-7-9.2V6l7-2.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if(name==='events')return <svg {...common}><rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M8 3.5V8M16 3.5V8M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
  if(name==='organisations')return <svg {...common}><path d="M5 20V7h8v13M13 11h6v9M8 10h2M8 13h2M8 16h2M16 14h1M16 17h1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  if(name==='about')return <svg {...common}><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M12 10.5v5M12 7.5h.01" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="m14.8 9.2-2 5.6-5.6 2 2-5.6 5.6-2Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>;
}

function Chevron({open=false}:{open?:boolean}){return <span className="mobilePublicChevron" aria-hidden="true">{open?'⌃':'⌄'}</span>}

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
  function active(href:string){return href==='/'?pathname==='/':pathname===href||pathname.startsWith(`${href}/`)}
  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);closeMenu();window.location.assign('/')}

  if(!mounted)return null;
  const target=document.querySelector('.mobileMenuPanel');
  if(!target)return null;

  const nav=<div className="mobilePublicNav" aria-label="Mobile website navigation">
    <nav className="mobilePublicPrimary" aria-label="Primary mobile navigation">
      {primaryLinks.map(([label,href,icon])=><Link href={href} key={href} className={active(href)?'isActive':undefined} aria-current={active(href)?'page':undefined} onClick={closeMenu}><span className="mobilePublicNavIcon"><NavIcon name={icon}/></span><span>{label}</span></Link>)}
    </nav>

    <nav className="mobilePublicSecondary" aria-label="Mettelo navigation">
      {secondaryLinks.map(([label,href,icon])=><Link href={href} key={href} className={active(href)?'isActive':undefined} aria-current={active(href)?'page':undefined} onClick={closeMenu}><span className="mobilePublicNavIcon"><NavIcon name={icon}/></span><span>{label}</span></Link>)}
    </nav>

    <section className="mobilePublicExplore" aria-labelledby="mobile-public-explore-label">
      <button id="mobile-public-explore-label" type="button" className="mobilePublicDisclosure" aria-expanded={openSection==='explore'} aria-controls="mobile-public-explore" onClick={()=>toggle('explore')}><span className="mobilePublicDisclosureLabel"><span className="mobilePublicNavIcon"><NavIcon name="explore"/></span><span>Explore</span></span><Chevron open={openSection==='explore'}/></button>
      <div id="mobile-public-explore" className="mobilePublicExploreGrid" hidden={openSection!=='explore'}>{exploreLinks.map(([label,href])=><Link href={href} key={href} className={active(href)?'isActive':undefined} aria-current={active(href)?'page':undefined} onClick={closeMenu}>{label}</Link>)}</div>
    </section>

    <div className="mobilePublicFooter">
      {!account&&<div className="mobilePublicGuestActions"><Link className="mobilePublicJoin" href="/auth/signup" onClick={closeMenu}>Join Mettelo</Link><Link className="mobilePublicSignIn" href="/signin" onClick={closeMenu}>Sign in</Link></div>}

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

  const closeControl=<button type="button" className="mobilePublicFloatingClose" onClick={closeMenu} aria-label="Close navigation menu">×</button>;

  return <>{createPortal(nav,target)}{createPortal(closeControl,document.body)}</>;
}
