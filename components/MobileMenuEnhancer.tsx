'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import type {User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/client';

type AccountState={email:string;name:string;isAdmin:boolean;avatarUrl:string|null}|null;
type OpenSection='account'|'discover'|'explore'|'support'|null;

const discoverLinks=[['Projects','/projects'],['Opportunities','/opportunities'],['Proof','/showcase'],['Events','/events']] as const;
const exploreLinks=[['Community','/community'],['Insights','/blog'],['Spotlight','/spotlight'],['Careers','/careers'],['FAQ','/faq']] as const;
const supportLinks=[['Contact','/contact'],['Feedback','/feedback']] as const;

function Chevron({open=false}:{open?:boolean}){return <span className="mobilePublicChevron" aria-hidden="true">{open?'−':'+'}</span>}

export default function MobileMenuEnhancer(){
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

  function closeMenu(){const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(menu){menu.open=false;document.body.classList.remove('mobileNavOpen');document.querySelector<HTMLButtonElement>('.mobileMenuBackdrop')?.setAttribute('hidden','')}setOpenSection(null)}
  function toggle(section:Exclude<OpenSection,null>){setOpenSection(current=>current===section?null:section)}
  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);closeMenu();window.location.assign('/')}

  if(!mounted)return null;
  const target=document.querySelector('.mobileMenuPanel');
  if(!target)return null;

  const nav=<div className="mobilePublicNav" aria-label="Mobile website navigation">
    {account&&<section className="mobilePublicAccount" aria-label="Account shortcuts">
      <button className="mobilePublicAccountTrigger" type="button" aria-expanded={openSection==='account'} aria-controls="mobile-public-account-panel" onClick={()=>toggle('account')}>
        <span className="mobilePublicAvatar" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span>
        <span className="mobilePublicIdentity"><strong>{account.name}</strong><small>{account.isAdmin?'Admin access':'Member account'}</small></span>
        <span className="mobilePublicAccountArrow" aria-hidden="true">›</span>
      </button>
      <div id="mobile-public-account-panel" className="mobilePublicSubmenu" hidden={openSection!=='account'}>
        <Link href="/member" onClick={closeMenu}>My dashboard <span aria-hidden="true">→</span></Link>
        <Link href="/member/profile" onClick={closeMenu}>Profile <span aria-hidden="true">→</span></Link>
        {account.isAdmin&&<Link href="/admin" onClick={closeMenu}>Admin console <span aria-hidden="true">→</span></Link>}
        <button type="button" className="mobilePublicSignOut" onClick={signOut}>Sign out <span aria-hidden="true">→</span></button>
      </div>
    </section>}

    {!account&&<div className="mobilePublicGuestActions"><Link href="/auth/signup" onClick={closeMenu}>Join Mettelo</Link><Link href="/signin" onClick={closeMenu}>Sign in</Link></div>}

    <nav className="mobilePublicPrimary" aria-label="Primary mobile navigation">
      <Link className="mobilePublicHome" href="/" onClick={closeMenu}><span aria-hidden="true">⌂</span><span>Home</span><span aria-hidden="true">→</span></Link>

      <button type="button" className="mobilePublicDisclosure" aria-expanded={openSection==='discover'} aria-controls="mobile-public-discover" onClick={()=>toggle('discover')}><span>Discover &amp; participate</span><Chevron open={openSection==='discover'}/></button>
      <div id="mobile-public-discover" className="mobilePublicSubmenu" hidden={openSection!=='discover'}>{discoverLinks.map(([label,href])=><Link href={href} key={href} onClick={closeMenu}>{label}<span aria-hidden="true">→</span></Link>)}</div>

      <button type="button" className="mobilePublicDisclosure" aria-expanded={openSection==='explore'} aria-controls="mobile-public-explore" onClick={()=>toggle('explore')}><span>Explore Mettelo</span><Chevron open={openSection==='explore'}/></button>
      <div id="mobile-public-explore" className="mobilePublicSubmenu" hidden={openSection!=='explore'}>{exploreLinks.map(([label,href])=><Link href={href} key={href} onClick={closeMenu}>{label}<span aria-hidden="true">→</span></Link>)}</div>

      <Link href="/organisations" onClick={closeMenu}>For organisations <span aria-hidden="true">→</span></Link>
      <Link href="/about" onClick={closeMenu}>About Mettelo <span aria-hidden="true">→</span></Link>

      <button type="button" className="mobilePublicDisclosure" aria-expanded={openSection==='support'} aria-controls="mobile-public-support" onClick={()=>toggle('support')}><span>Help &amp; support</span><Chevron open={openSection==='support'}/></button>
      <div id="mobile-public-support" className="mobilePublicSubmenu" hidden={openSection!=='support'}>{supportLinks.map(([label,href])=><Link href={href} key={href} onClick={closeMenu}>{label}<span aria-hidden="true">→</span></Link>)}</div>
    </nav>
  </div>;

  return createPortal(nav,target);
}
