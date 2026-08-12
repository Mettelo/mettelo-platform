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
const PAGE_SIZE=6;

function SearchIcon(){return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}

export default function HeaderNavigation({dropdowns}:{dropdowns:DropdownConfig[]}){
  const [open,setOpen]=useState<string|null>(null);
  const [account,setAccount]=useState<AccountState>(null);
  const [mounted,setMounted]=useState(false);
  const navRef=useRef<HTMLElement>(null);
  const navigation=useMemo(()=>dropdowns.map(dropdown=>dropdown.label==='For Organisations'?{label:'Work With Us',items:[['Careers','/careers','Join the Mettelo team through current roles.'] as NavItem,...dropdown.items.filter(([,href])=>href!=='/contribute')]}:{...dropdown,items:dropdown.items.filter(([,href])=>href!=='/contribute')}),[dropdowns]);

  function closeMobileMenu(){const details=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(details)details.open=false;setOpen(null)}

  useEffect(()=>{
    setMounted(true);
    const supabase=createClient();
    let active=true;
    async function applyUser(user:User|null){
      if(!active)return;
      if(!user){setAccount(null);document.body.classList.remove('authSignedIn','authAdmin');return}
      const email=user.email||'';
      let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||email.split('@')[0]||'Member';
      let avatarUrl:string|null=null;
      const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
      if(profile?.full_name?.trim())name=profile.full_name.trim();
      if(profile?.avatar_url)avatarUrl=profile.avatar_url;
      if(!active)return;
      const isAdmin=user.app_metadata?.role==='admin';
      setAccount({email,name,isAdmin,avatarUrl});
      document.body.classList.add('authSignedIn');
      document.body.classList.toggle('authAdmin',isAdmin);
    }
    void supabase.auth.getSession().then(({data})=>applyUser(data.session?.user||null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>void applyUser(session?.user||null));
    return()=>{active=false;subscription.unsubscribe()};
  },[]);

  useEffect(()=>{
    if(!mounted)return;
    document.querySelectorAll<HTMLAnchorElement>('a[href="/contribute"]').forEach(link=>link.remove());
    const footerColumns=Array.from(document.querySelectorAll<HTMLElement>('footer .footerLinksColumn'));
    if(footerColumns[1])footerColumns[1].querySelectorAll<HTMLAnchorElement>('a[href="/contact"],a[href="/feedback"],a[href="/signin"]').forEach(link=>link.remove());
    if(footerColumns[2]){
      const column=footerColumns[2];column.replaceChildren();
      const heading=document.createElement('h4');heading.textContent='Company & Support';column.appendChild(heading);
      [['About Mettelo','/about'],['Contact us','/contact'],['Give feedback','/feedback'],['Privacy','/privacy'],['Terms','/terms'],['Community Guidelines','/community-guidelines']].forEach(([label,href])=>{const link=document.createElement('a');link.href=href;link.textContent=label;column.appendChild(link)});
    }
    document.querySelector('footer .instagramNote')?.remove();
  },[mounted]);

  useEffect(()=>{
    if(!mounted)return;
    const close=(event:Event)=>{const link=(event.target as Element|null)?.closest('a');if(!link)return;const publicMenu=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(publicMenu?.contains(link))publicMenu.open=false;setOpen(null)};
    document.addEventListener('click',close,true);
    return()=>document.removeEventListener('click',close,true);
  },[mounted]);

  useEffect(()=>{
    if(!mounted)return;
    let scheduled=false;
    const containers=()=>{const set=new Set<HTMLElement>();document.querySelectorAll<HTMLElement>('.applicationQueue,.memberApplicationList,.discussionFeed,.resourceList,.meetingList,.teamGrid').forEach(el=>set.add(el));document.querySelectorAll<HTMLElement>('.listRow').forEach(el=>{if(el.parentElement)set.add(el.parentElement)});document.querySelectorAll<HTMLTableRowElement>('tbody > tr').forEach(el=>{if(el.parentElement)set.add(el.parentElement as HTMLElement)});return Array.from(set)};
    const itemsFor=(container:HTMLElement)=>{const direct=Array.from(container.children).filter((child):child is HTMLElement=>child instanceof HTMLElement);if(container.tagName==='TBODY')return direct.filter(item=>item.tagName==='TR');return direct.filter(item=>item.matches('.applicationReview,.memberApplicationCard,.discussionItem,.resourceItem,.meetingItem,.teamMember,.listRow'))};
    const refresh=(container:HTMLElement)=>{const items=itemsFor(container);const anchor=container.tagName==='TBODY'?(container.closest('table') as HTMLElement|null):container;if(!anchor)return;let controls=anchor.nextElementSibling instanceof HTMLElement&&anchor.nextElementSibling.classList.contains('metteloPagination')?anchor.nextElementSibling as HTMLElement:null;if(items.length<=PAGE_SIZE){items.forEach(item=>item.hidden=false);controls?.remove();container.dataset.metteloPage='1';return}const pages=Math.ceil(items.length/PAGE_SIZE);const page=Math.max(1,Math.min(pages,Number(container.dataset.metteloPage||'1')||1));container.dataset.metteloPage=String(page);items.forEach((item,index)=>item.hidden=index<(page-1)*PAGE_SIZE||index>=page*PAGE_SIZE);if(!controls){controls=document.createElement('nav');controls.className='metteloPagination';controls.setAttribute('aria-label','Pagination');const previous=document.createElement('button');previous.type='button';previous.dataset.direction='previous';previous.textContent='← Previous';const label=document.createElement('span');const next=document.createElement('button');next.type='button';next.dataset.direction='next';next.textContent='Next →';controls.append(previous,label,next);anchor.insertAdjacentElement('afterend',controls);controls.addEventListener('click',event=>{const button=(event.target as Element|null)?.closest<HTMLButtonElement>('button[data-direction]');if(!button)return;const current=Number(container.dataset.metteloPage||'1')||1;container.dataset.metteloPage=String(button.dataset.direction==='next'?Math.min(pages,current+1):Math.max(1,current-1));refresh(container)})}const prev=controls.querySelector<HTMLButtonElement>('button[data-direction="previous"]');const next=controls.querySelector<HTMLButtonElement>('button[data-direction="next"]');const label=controls.querySelector('span');if(prev)prev.disabled=page===1;if(next)next.disabled=page===pages;if(label)label.textContent=`Page ${page} of ${pages}`};
    const scan=()=>containers().forEach(refresh);const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})};scan();const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[mounted]);

  useEffect(()=>{function down(event:MouseEvent){if(open&&navRef.current&&!navRef.current.contains(event.target as Node)&&!(event.target as Element|null)?.closest('.accountMenu'))setOpen(null)}function key(event:KeyboardEvent){if(event.key==='Escape'){setOpen(null);const menu=document.querySelector<HTMLDetailsElement>('.mobileMenu');if(menu)menu.open=false}}document.addEventListener('mousedown',down);document.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',down);document.removeEventListener('keydown',key)}},[open]);

  async function signOut(){const supabase=createClient();await supabase.auth.signOut();setAccount(null);document.body.classList.remove('authSignedIn','authAdmin');window.location.assign('/')}

  const desktopTarget=mounted?document.querySelector('.navActions'):null;
  const mobileTarget=mounted?document.querySelector('.mobileMenuPanel'):null;
  const headerTarget=mounted?document.querySelector('.siteHeader .nav'):null;
  const accountPanel=account?<div className="accountMenu"><button className="accountTrigger" type="button" aria-expanded={open==='Account'} onClick={()=>setOpen(open==='Account'?null:'Account')}><span className="accountAvatar" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span><span className="accountTriggerText"><strong>{account.name.split(' ')[0]}</strong><small>{account.isAdmin?'Admin':'Member'}</small></span><span aria-hidden="true">⌄</span></button><div className={`accountPanel${open==='Account'?' isOpen':''}`}><div className="accountIdentity"><strong>{account.name}</strong><small>{account.email}</small></div><Link href="/member" onClick={()=>setOpen(null)}>My dashboard <span>→</span></Link><Link href="/member/profile" onClick={()=>setOpen(null)}>Profile <span>→</span></Link>{account.isAdmin&&<Link href="/admin" onClick={()=>setOpen(null)}>Admin console <span>→</span></Link>}<button type="button" onClick={signOut}>Sign out <span>→</span></button></div></div>:null;

  const mobileNavigation=<div className="metteloMobileNav">
    {account?<div className="mobileAccountCard"><div className="mobileAccountIdentity"><span className="mobileAvatar" style={account.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined}>{account.avatarUrl?'':account.name.slice(0,1).toUpperCase()}</span><div><strong>{account.name}</strong><small>{account.isAdmin?'Admin access':'Member account'}</small></div></div><div className="mobileAccountLinks"><Link href="/member" onClick={closeMobileMenu}>My dashboard <span>→</span></Link><Link href="/member/profile" onClick={closeMobileMenu}>Profile <span>→</span></Link>{account.isAdmin&&<Link href="/admin" onClick={closeMobileMenu}>Admin console <span>→</span></Link>}<button type="button" onClick={signOut}>Sign out <span>→</span></button></div></div>:<div className="mobileGuestActions"><Link className="mobileGuestPrimary" href="/join" onClick={closeMobileMenu}>Join Mettelo</Link><Link href="/signin" onClick={closeMobileMenu}>Sign in</Link></div>}
    <div className="mobileNavSections">{navigation.map(({label,items})=><details className="mobileNavSection" key={label}><summary><span>{label}</span><span className="mobileChevron" aria-hidden="true">⌄</span></summary><div className="mobileNavLinks">{items.map(([title,href])=><Link href={href} key={`${label}-${href}`} onClick={closeMobileMenu}>{title}<span>→</span></Link>)}</div></details>)}<Link className="mobileAboutLink" href="/about" onClick={closeMobileMenu}>About Mettelo <span>→</span></Link></div>
  </div>;

  return <><nav ref={navRef} className={`${styles.headerNavigation} primaryNav`} aria-label="Primary navigation">{navigation.map(({label,items})=>{const isOpen=open===label;return <div className={`navDropdown${isOpen?' isOpen':''}`} key={label}><button className="navDropdownTrigger" type="button" aria-expanded={isOpen} onClick={()=>setOpen(isOpen?null:label)}>{label}<span aria-hidden="true">⌄</span></button><div className="navDropdownPanel" aria-hidden={!isOpen}>{items.map(([title,href,copy])=><Link key={`${label}-${href}`} href={href} onClick={()=>setOpen(null)}><strong>{title}</strong><small>{copy}</small></Link>)}</div></div>})}<Link className="primaryNavLink aboutNavLink" href="/about">About Mettelo</Link></nav>
    {desktopTarget&&createPortal(<div className="globalSearchPortal"><Link className="globalSearchButton" href="/search" aria-label="Search Mettelo" title="Search"><SearchIcon/></Link></div>,desktopTarget)}
    {account&&desktopTarget&&createPortal(<div className="desktopAccountPortal">{accountPanel}</div>,desktopTarget)}
    {headerTarget&&createPortal(<Link className="mobileHeaderSearch" href="/search" aria-label="Search Mettelo" title="Search"><SearchIcon/></Link>,headerTarget)}
    {mobileTarget&&createPortal(mobileNavigation,mobileTarget)}
    <style jsx global>{`
      .authSignedIn .topbar{display:none}.authSignedIn a[href^="/signin"],.authSignedIn a[href^="/join"]{display:none!important}.authSignedIn:not(.authAdmin) a[href^="/admin"]{display:none!important}
      .siteHeader .nav{height:64px;gap:18px}.siteHeader .brandLogo{width:124px!important;max-width:124px!important;height:auto!important}.nav nav{gap:14px;font-size:.82rem}.navDropdownTrigger,.primaryNavLink{min-height:38px;padding:8px 2px!important;white-space:nowrap}.navDropdownTrigger{display:inline-flex;align-items:center;gap:4px;border:0;background:transparent;color:inherit;font-weight:650;cursor:pointer}.navDropdownTrigger>span{font-size:.72rem;transform:translateY(-1px)}.navDropdownPanel{top:calc(100% + 8px)!important;min-width:270px!important;padding:8px!important;border-radius:14px!important}.navDropdownPanel a{padding:10px 11px!important;border-radius:9px!important}.navDropdownPanel strong{font-size:.78rem}.navDropdownPanel small{font-size:.68rem;line-height:1.4}.aboutNavLink{margin-left:1px}
      .globalSearchPortal{order:-1;display:flex}.globalSearchButton,.mobileHeaderSearch{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(16,19,29,.1);border-radius:11px;background:#fff;color:#222836}.globalSearchButton:hover,.globalSearchButton:focus-visible,.mobileHeaderSearch:hover,.mobileHeaderSearch:focus-visible{background:#f7efdd;outline:3px solid rgba(198,137,42,.2);outline-offset:2px}.mobileHeaderSearch{display:none}
      .desktopAccountPortal{display:flex}.accountTrigger{min-height:38px;display:flex;align-items:center;gap:7px;border:1px solid rgba(16,19,29,.1);border-radius:11px;background:#fff;padding:3px 8px 3px 4px}.accountAvatar{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;background:#2a2f52;color:#fff;font-weight:800}.accountTriggerText{display:grid;text-align:left}.accountTriggerText strong{font-size:.72rem}.accountTriggerText small{font-size:.6rem;color:#7b8390}.accountMenu{position:relative}.accountPanel{display:none;position:absolute;right:0;top:calc(100% + 8px);width:230px;padding:8px;border:1px solid rgba(16,19,29,.1);border-radius:14px;background:#fff;box-shadow:0 18px 45px rgba(16,19,29,.14);z-index:120}.accountPanel.isOpen{display:block}.accountPanel a,.accountPanel button{width:100%;display:flex;justify-content:space-between;padding:10px;border:0;border-radius:9px;background:transparent;color:#505966;text-align:left}.accountPanel a:hover,.accountPanel button:hover{background:#f7efdd}.accountIdentity{display:grid;padding:8px 10px 11px;border-bottom:1px solid rgba(16,19,29,.08)}.accountIdentity small{overflow:hidden;text-overflow:ellipsis;color:#7b8390}
      .metteloPagination{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0}.metteloPagination button{min-height:40px;padding:8px 12px;border:1px solid rgba(16,19,29,.12);border-radius:10px;background:#fff;font-weight:700}.metteloPagination button:disabled{opacity:.4}.metteloPagination span{font-size:.75rem;color:#6f7884}
      @media(max-width:1080px){
        .siteHeader .nav{height:58px;gap:8px}.siteHeader .brandLogo{width:112px!important;max-width:112px!important}.globalSearchPortal,.desktopAccountPortal{display:none}.mobileHeaderSearch{display:grid;order:5;flex:none}.mobileMenu{order:6;margin-left:0!important}.mobileMenu>summary{width:44px!important;height:44px!important;min-width:44px!important;padding:0!important;border-radius:11px!important;box-shadow:none!important}.menuLabel{display:none!important}.mobileMenuPanel{top:calc(34px + 58px + 7px)!important;left:10px!important;right:10px!important;width:auto!important;max-height:calc(100dvh - 110px)!important;padding:10px!important;border-radius:16px!important;overscroll-behavior:contain}.authSignedIn .mobileMenuPanel{top:65px!important;max-height:calc(100dvh - 74px)!important}.mobileMenuPanel>:not(.metteloMobileNav){display:none!important}.metteloMobileNav{display:grid;gap:10px}.mobileGuestActions{display:grid;grid-template-columns:1.15fr .85fr;gap:8px}.mobileGuestActions a{min-height:44px;display:grid!important;place-items:center!important;padding:8px 10px!important;border:1px solid rgba(16,19,29,.1);border-radius:10px!important}.mobileGuestPrimary{background:#10131d!important;color:#fff!important}.mobileAccountCard{padding:10px;border:1px solid rgba(16,19,29,.09);border-radius:13px;background:#fbfaf7}.mobileAccountIdentity{display:flex;align-items:center;gap:10px;padding:2px 3px 9px}.mobileAccountIdentity>div{display:grid}.mobileAccountIdentity strong{font-size:.82rem;line-height:1.2}.mobileAccountIdentity small{font-size:.66rem;color:#7b8390}.mobileAvatar{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:#2a2f52;color:#fff;font-weight:800;flex:none}.mobileAccountLinks{display:grid;grid-template-columns:1fr 1fr;gap:6px}.mobileAccountLinks a,.mobileAccountLinks button{min-height:44px;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:8px 10px!important;border:0;border-radius:9px!important;background:#fff;color:#4d5663;font-size:.75rem;font-weight:700;text-align:left}.mobileAccountLinks button{cursor:pointer}.mobileAccountLinks a:first-child{background:#f7efdd}.mobileAccountLinks button{color:#92352f}.mobileNavSections{display:grid}.mobileNavSection{border-top:1px solid rgba(16,19,29,.08)}.mobileNavSection>summary{width:100%!important;height:auto!important;min-width:0!important;white-space:nowrap!important;min-height:44px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;padding:10px 8px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;list-style:none!important;color:#242a35!important;font-size:.82rem!important;font-weight:750!important;cursor:pointer!important}.mobileNavSection>summary::-webkit-details-marker{display:none}.mobileChevron{font-size:.75rem;transition:transform .18s ease}.mobileNavSection[open] .mobileChevron{transform:rotate(180deg)}.mobileNavLinks{display:grid;padding:0 0 7px 6px}.mobileNavLinks a{min-height:44px!important;padding:8px 10px!important;border-radius:8px!important;color:#56606d!important;font-size:.78rem!important;font-weight:650!important}.mobileNavLinks a:hover,.mobileNavLinks a:focus-visible{background:#f7efdd!important}.mobileAboutLink{min-height:44px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:10px 8px!important;border-top:1px solid rgba(16,19,29,.08);border-radius:0!important;font-size:.82rem!important;font-weight:750!important}.footerGrid{grid-template-columns:1fr 1fr 1fr!important}.footerBrandColumn,.footerNewsletterColumn{grid-column:1/-1}
      }
      @media(max-width:700px){.shell{max-width:100%;min-width:0}.panel,.card,.memberApplicationCard{min-width:0;max-width:100%}.footerGrid{grid-template-columns:1fr 1fr!important}.footerLinksColumn:nth-of-type(4){grid-column:1/-1}.metteloPagination{flex-wrap:wrap}.metteloPagination span{order:-1;width:100%;text-align:center}}
      @media(max-width:390px){.siteHeader .brandLogo{width:104px!important;max-width:104px!important}.mobileMenuPanel{left:6px!important;right:6px!important}.mobileAccountLinks{grid-template-columns:1fr}.mobileGuestActions{grid-template-columns:1fr 1fr}}
    `}</style>
  </>;
}
