'use client';

import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
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

  const navigation=useMemo(()=>dropdowns.map(dropdown=>dropdown.label==='For Organisations'?{
    label:'Work With Us',
    items:[['Careers','/careers','Join the Mettelo team through current internal roles.'] as NavItem,...dropdown.items.filter(([title,href])=>title!=='For Organisations'&&href!=='/contribute')]
  }:{...dropdown,items:dropdown.items.filter(([,href])=>href!=='/contribute')}),[dropdowns]);

  function closeMobileMenu(){const details=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(details)details.open=false;setOpen(null);}

  useEffect(()=>{
    setMounted(true);const supabase=createClient();let active=true;
    async function applyUser(user:User|null){if(!active)return;if(!user){setAccount(null);document.body.classList.remove('authSignedIn');return;}const email=user.email||'';const authName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';let name=authName||email.split('@')[0]||'Member';let avatarUrl:string|null=null;const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();if(profile?.full_name?.trim())name=profile.full_name.trim();if(profile?.avatar_url)avatarUrl=profile.avatar_url;if(!active)return;setAccount({email,name,isAdmin:user.app_metadata?.role==='admin',avatarUrl});document.body.classList.add('authSignedIn');}
    supabase.auth.getSession().then(({data})=>void applyUser(data.session?.user||null));supabase.auth.getUser().then(({data})=>void applyUser(data.user));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>void applyUser(session?.user||null));return()=>{active=false;subscription.unsubscribe();};
  },[]);

  useEffect(()=>{
    if(!mounted)return;
    document.querySelectorAll<HTMLAnchorElement>('a[href="/contribute"]').forEach(link=>link.remove());
    const mobilePanel=document.querySelector<HTMLElement>('.mobileMenuPanel');
    if(!mobilePanel)return;

    mobilePanel.querySelector('.mobileSocialLinks')?.remove();
    mobilePanel.querySelector<HTMLAnchorElement>('a[href="/contact"]')?.remove();
    mobilePanel.querySelector<HTMLAnchorElement>('a[href="/feedback"]')?.remove();

    Array.from(mobilePanel.querySelectorAll<HTMLElement>('.mobileGroup')).forEach(group=>{
      if(group.tagName==='DETAILS')return;
      const heading=group.querySelector(':scope > strong')?.textContent?.trim();
      if(!heading)return;
      const details=document.createElement('details');details.className='mobileGroup mobileAccordion';
      const summary=document.createElement('summary');summary.className='mobileAccordionSummary';summary.innerHTML=`<span>${heading}</span><span class="mobileAccordionChevron" aria-hidden="true">⌄</span>`;
      details.appendChild(summary);
      Array.from(group.querySelectorAll<HTMLAnchorElement>(':scope > a')).forEach(link=>details.appendChild(link));
      group.replaceWith(details);
    });

    const mobileDetails=mobilePanel.closest('details');
    const onClick=(event:Event)=>{const target=event.target as Element|null;if(target?.closest('a')){if(mobileDetails instanceof HTMLDetailsElement)mobileDetails.open=false;setOpen(null);}};
    mobilePanel.addEventListener('click',onClick);
    return()=>mobilePanel.removeEventListener('click',onClick);
  },[mounted]);

  useEffect(()=>{function onPointerDown(event:MouseEvent){const target=event.target as Element|null;const insideAccount=Boolean(target?.closest('.accountMenu'));if(open&&!insideAccount&&navRef.current&&!navRef.current.contains(event.target as Node))setOpen(null);}function onKeyDown(event:KeyboardEvent){if(event.key==='Escape'){setOpen(null);const details=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(details)details.open=false;}}document.addEventListener('mousedown',onPointerDown);document.addEventListener('keydown',onKeyDown);return()=>{document.removeEventListener('mousedown',onPointerDown);document.removeEventListener('keydown',onKeyDown);};},[open]);

  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);document.body.classList.remove('authSignedIn');window.location.assign('/');}

  const accountPanel=account?<div className="accountMenu"><button className="accountTrigger" type="button" aria-expanded={open==='Account'} aria-controls="nav-account-panel" onClick={()=>setOpen(open==='Account'?null:'Account')}><span className="accountAvatar" aria-hidden="true" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span><span className="accountTriggerText"><strong>{account.name.split(' ')[0]}</strong><small>{account.isAdmin?'Admin':'Member'}</small></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></button><div className={`accountPanel${open==='Account'?' isOpen':''}`} id="nav-account-panel"><div className="accountIdentity"><strong>{account.name}</strong><small>{account.email}</small></div><Link href="/member" onClick={()=>setOpen(null)}>My dashboard <span>→</span></Link><Link href="/member/profile" onClick={()=>setOpen(null)}>Edit profile <span>→</span></Link>{account.isAdmin&&<Link href="/admin" onClick={()=>setOpen(null)}>Admin console <span>→</span></Link>}<div className="accountSecondaryLinks" aria-label="More Mettelo links"><Link href="/about" onClick={()=>setOpen(null)}>About Mettelo <span>→</span></Link><Link href="/careers" onClick={()=>setOpen(null)}>Careers <span>→</span></Link></div><button type="button" onClick={signOut}>Sign out <span>→</span></button></div></div>:null;

  const desktopTarget=mounted?document.querySelector('.navActions'):null;
  const mobileTarget=mounted?document.querySelector('.mobileMenuPanel'):null;
  const mobileSummaryTarget=mounted?document.querySelector('.mobileMenu > summary'):null;

  return <><nav ref={navRef} className={`${styles.headerNavigation} primaryNav`} aria-label="Primary navigation"><Link className="primaryNavLink" href="/about">About Mettelo</Link><Link className="primaryNavLink" href="/search">Search</Link>{navigation.map(({label,items})=>{const isOpen=open===label;const panelId=`nav-${label.toLowerCase().replaceAll(' ','-')}-panel`;return <div className={`navDropdown${isOpen?' isOpen':''}`} key={label}><button className="navDropdownTrigger" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={()=>setOpen(isOpen?null:label)}><span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg></button><div className="navDropdownPanel" id={panelId} aria-hidden={!isOpen}>{items.map(([title,href,copy])=><Link key={`${label}-${href}`} href={href} onClick={()=>setOpen(null)}><strong>{title}</strong><small>{copy}</small></Link>)}</div></div>;})}</nav>
    {account&&desktopTarget&&createPortal(<div className="desktopAccountPortal">{accountPanel}</div>,desktopTarget)}
    {account&&mobileSummaryTarget&&createPortal(<span className="mobileSignedInTrigger"><span className="mobileSignedInAvatar" aria-hidden="true" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span><span className="mobileSignedInName">{account.name.split(' ')[0]}</span><span className="mobileSignedInChevron" aria-hidden="true">⌄</span></span>,mobileSummaryTarget)}
    {account&&mobileTarget&&createPortal(<div className="mobileAccountPortal"><div className="mobileAccountIdentity"><span className="mobileAccountAvatar" aria-hidden="true" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span><span><strong>{account.name}</strong><small>{account.email}</small></span></div><Link className="mobileDashboardPrimary" href="/member" onClick={closeMobileMenu}>My dashboard <span>→</span></Link><div className="mobileAccountQuickLinks"><Link href="/member/profile" onClick={closeMobileMenu}>Edit profile <span>→</span></Link>{account.isAdmin&&<Link href="/admin" onClick={closeMobileMenu}>Admin console <span>→</span></Link>}</div><button className="mobileSignOut" type="button" onClick={signOut}>Sign out <span>→</span></button></div>,mobileTarget)}
    <style jsx global>{`
      .authSignedIn .topbar{display:none}.authSignedIn .siteHeader{box-shadow:0 1px 0 rgba(16,19,29,.08);background:rgba(252,251,247,.97);backdrop-filter:blur(14px)}.authSignedIn .nav{height:72px}.authSignedIn .navActions>a[href="/signin"],.authSignedIn .navActions>a[href="/join"]{display:none}.authSignedIn .primaryNav{gap:4px}.authSignedIn .navDropdownTrigger{color:#3f4754;font-weight:650}.authSignedIn .navDropdownTrigger:hover,.authSignedIn .navDropdownTrigger:focus-visible{color:#10131d;background:#f7efdd}.authSignedIn .navDropdownPanel{border-color:rgba(16,19,29,.09);box-shadow:0 18px 48px rgba(16,19,29,.11)}.authSignedIn .navDropdownPanel a strong{color:#202633}.authSignedIn .navDropdownPanel a small{color:#6d7581}.desktopAccountPortal{margin-left:6px}.accountTrigger{min-height:44px;border:1px solid rgba(16,19,29,.09);border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(16,19,29,.035);transition:border-color .16s ease,box-shadow .16s ease,background-color .16s ease}.accountTrigger:hover,.accountTrigger:focus-visible{border-color:rgba(198,137,42,.36);background:#fffdfa;box-shadow:0 7px 20px rgba(16,19,29,.06)}.accountPanel{border:1px solid rgba(16,19,29,.09);border-radius:16px;box-shadow:0 18px 46px rgba(16,19,29,.12)}.accountIdentity{padding-bottom:11px;margin-bottom:5px;border-bottom:1px solid rgba(16,19,29,.08)}.accountIdentity strong{color:#10131d}.accountIdentity small{color:#747d89}.accountSecondaryLinks{margin-top:5px;padding-top:5px;border-top:1px solid rgba(16,19,29,.08)}.accountSecondaryLinks>a{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:9px 11px;border-radius:10px;color:#69717d;font-size:.75rem;font-weight:600}.accountSecondaryLinks>a:hover,.accountSecondaryLinks>a:focus-visible{background:#f7efdd;color:#10131d}.authSignedIn .siteHeader a:focus-visible,.authSignedIn .siteHeader button:focus-visible{outline:3px solid rgba(198,137,42,.36);outline-offset:2px}

      .mobileSignedInTrigger{display:none}.mobileAccountPortal{display:none}
      footer .instagramNote{display:none!important}footer a[href="/signin"]{display:none!important}.footerGrid>.footerLinksColumn:nth-of-type(4){display:none!important}

      @media(max-width:1080px){
        .desktopAccountPortal{display:none}.mobileMenu[open] .mobileMenuPanel{display:flex;flex-direction:column}.mobileMenuPanel{padding:10px 12px 12px;gap:2px;overscroll-behavior:contain}.mobileSocialLinks{display:none!important}.mobileMenuPanel>.mobileDivider{display:none}.mobileMenuPanel>a{min-height:44px;padding:10px 12px}.mobileMenuPanel>a[href="/join"]{order:-30;margin:2px 0 3px}.mobileMenuPanel>a[href="/signin"]{order:-29}.mobileMenuPanel>a[href="/search"]{order:-28}.mobileMenuPanel>a[href="/about"]{order:20;margin-top:3px;border-top:1px solid rgba(16,19,29,.09);border-radius:0;padding-top:13px}.mobileAccordion{order:0;border:0!important;padding:0!important;margin:0;border-top:1px solid rgba(16,19,29,.08)!important}.mobileAccordion:first-of-type{margin-top:4px}.mobileAccordionSummary{min-height:46px;padding:0 10px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:pointer;list-style:none;color:#202633;font-family:var(--font-inter);font-size:.84rem;font-weight:750;letter-spacing:0;text-transform:none}.mobileAccordionSummary::-webkit-details-marker{display:none}.mobileAccordionChevron{font-size:1rem;color:#7b8390;transition:transform .15s ease}.mobileAccordion[open] .mobileAccordionChevron{transform:rotate(180deg)}.mobileAccordion>a{padding:10px 12px 10px 20px!important;min-height:40px;color:#545d69;font-size:.82rem;font-weight:620}.mobileAccordion>a:last-child{padding-bottom:13px!important}.mobileAccordion>a:hover,.mobileAccordion>a:focus-visible{background:#f7efdd;color:#10131d}.authSignedIn .mobileMenuPanel>a[href="/signin"],.authSignedIn .mobileMenuPanel>a[href="/join"]{display:none}.authSignedIn .mobileMenu summary>.hamburgerIcon,.authSignedIn .mobileMenu summary>.menuLabel{display:none}.authSignedIn .mobileMenu summary{width:auto;min-width:48px;max-width:148px;padding:0 9px;border-radius:14px}.mobileSignedInTrigger{align-items:center;gap:7px;min-width:0}.authSignedIn .mobileSignedInTrigger{display:flex}.mobileSignedInAvatar,.mobileAccountAvatar{display:grid;place-items:center;flex:none;background:#2a2f52;color:#fff;font-weight:800}.mobileSignedInAvatar{width:28px;height:28px;border-radius:9px;font-size:.72rem}.mobileSignedInName{max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.76rem;font-weight:750}.mobileSignedInChevron{color:#777f8a;font-size:.8rem}.mobileAccountPortal{order:-40;margin:0 0 5px;padding:10px;border:1px solid rgba(16,19,29,.09);border-radius:15px;background:#fbfaf7}.authSignedIn .mobileAccountPortal{display:block}.mobileAccountIdentity{display:flex;align-items:center;gap:10px;padding:2px 2px 10px}.mobileAccountIdentity>span:last-child{display:grid;min-width:0}.mobileAccountIdentity strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.84rem;color:#161a23}.mobileAccountIdentity small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.7rem;color:#737c88}.mobileAccountAvatar{width:38px;height:38px;border-radius:12px}.mobileAccountPortal .mobileDashboardPrimary{display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:10px 12px;border-radius:11px;background:#2a2f52;color:#fff;font-size:.84rem;font-weight:750}.mobileAccountPortal .mobileDashboardPrimary:hover,.mobileAccountPortal .mobileDashboardPrimary:focus-visible{background:#202540;color:#fff}.mobileAccountQuickLinks{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.mobileAccountQuickLinks>a{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:38px;padding:8px 9px;border:1px solid rgba(16,19,29,.08);border-radius:9px;background:#fff;color:#505965;font-size:.72rem;font-weight:650}.mobileSignOut{width:100%;min-height:36px;margin-top:7px;padding:7px 9px;display:flex;align-items:center;justify-content:space-between;border:0;background:transparent;color:#a33128;font-size:.72rem;font-weight:700;text-align:left;cursor:pointer}.mobileSignOut:hover,.mobileSignOut:focus-visible{background:#fff1ef;border-radius:9px}.authSignedIn .mobileMenuPanel{padding-top:10px}
        .footerGrid>.footerLinksColumn:nth-of-type(4){display:none!important}.footerGrid{grid-template-columns:minmax(230px,1.25fr) minmax(150px,.8fr) minmax(165px,.85fr) minmax(220px,1fr)!important;gap:28px!important}
      }
      @media(max-width:900px){.footerGrid{grid-template-columns:1fr 1fr!important}.footerBrandColumn,.footerNewsletterColumn{grid-column:1/-1}.footerNewsletterColumn{max-width:520px}.footerLinksColumn a{padding:3px 0}}
      @media(max-width:600px){.mobileMenuPanel{left:8px!important;right:8px!important;top:80px!important;max-height:calc(100dvh - 92px)!important;border-radius:16px!important}.authSignedIn .mobileMenuPanel{top:80px!important}.footerGrid{grid-template-columns:1fr 1fr!important;gap:24px 18px!important}.footerBrandColumn,.footerNewsletterColumn{grid-column:1/-1}.footerBrandColumn p{max-width:34ch}.footerSocial{margin-top:14px}.footerLinksColumn h4{font-size:.72rem}.footerLinksColumn a{font-size:.78rem;line-height:1.35}.footerNewsletterColumn{order:4}}
      @media(prefers-reduced-motion:reduce){.accountTrigger,.mobileAccordionChevron{transition:none}}
    `}</style>
  </>;
}
