'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type AdminAccount={name:string;avatarUrl:string|null}|null;
type NavItem={label:string;href:string};
type NavGroup={label:string;items:NavItem[]};

const groups:NavGroup[]=[
 {label:'Website',items:[{label:'Website overview',href:'/admin/website'},{label:'Pages',href:'/admin/website/pages'},{label:'Navigation',href:'/admin/website/navigation'},{label:'Footer & Social',href:'/admin/website/footer'},{label:'Branding',href:'/admin/website/branding'}]},
 {label:'Recruiting',items:[{label:'Careers',href:'/admin/careers/roles'},{label:'Project applications',href:'/admin/project-operations/applications'},{label:'Opportunity review',href:'/admin/opportunities'},{label:'Job sources',href:'/admin/opportunity-sources'}]},
 {label:'Projects',items:[{label:'Project operations',href:'/admin/project-operations/projects'},{label:'Project Architect',href:'/admin/project-architect-applications'},{label:'Project governance',href:'/admin/project-governance'}]},
 {label:'Community & Proof',items:[{label:'Proof review',href:'/admin/proof'},{label:'Spotlight & awards',href:'/admin/spotlights'},{label:'Events',href:'/admin/events'}]},
 {label:'Content & Comms',items:[{label:'Content & Insights',href:'/admin/content/news'},{label:'Communications',href:'/admin/notifications/overview'}]},
 {label:'Platform',items:[{label:'Platform overview',href:'/admin/platform'},{label:'Settings',href:'/admin/settings'}]},
 {label:'System',items:[{label:'System overview',href:'/admin/system'},{label:'Audit log',href:'/admin/system/audit'},{label:'QA team',href:'/admin/qa'},{label:'Intake',href:'/admin/intake'},{label:'Admin access',href:'/admin/access'}]}
];

const flat=groups.flatMap(group=>group.items);
const exactSectionRoots=new Set(['/admin/website','/admin/platform','/admin/system']);

function activeHref(pathname:string,href:string){
 if(exactSectionRoots.has(href))return pathname===href;
 if(href==='/admin/careers/roles')return pathname.startsWith('/admin/careers');
 if(href==='/admin/content/news')return pathname.startsWith('/admin/content');
 if(href==='/admin/notifications/overview')return pathname.startsWith('/admin/notifications');
 return pathname===href||pathname.startsWith(`${href}/`);
}

function currentItem(pathname:string){return flat.find(item=>activeHref(pathname,item.href))||null}

function breadcrumb(pathname:string){
 if(pathname==='/admin'||pathname==='/admin/overview')return ['Admin','Overview'];
 if(pathname==='/admin/website')return ['Admin','Website','Overview'];
 if(pathname.startsWith('/admin/website/pages'))return ['Admin','Website','Pages'];
 if(pathname.startsWith('/admin/website/navigation'))return ['Admin','Website','Navigation'];
 if(pathname.startsWith('/admin/website/footer'))return ['Admin','Website','Footer & Social'];
 if(pathname.startsWith('/admin/website/branding'))return ['Admin','Website','Branding'];
 if(pathname==='/admin/platform')return ['Admin','Platform','Overview'];
 if(pathname==='/admin/settings')return ['Admin','Platform','Settings'];
 if(pathname==='/admin/system')return ['Admin','System','Overview'];
 if(pathname.startsWith('/admin/system/audit'))return ['Admin','System','Audit log'];
 if(pathname.startsWith('/admin/project-operations/projects/'))return ['Admin','Projects','Projects','Project detail'];
 if(pathname.startsWith('/admin/project-operations/projects'))return ['Admin','Projects','Projects'];
 if(pathname.startsWith('/admin/project-operations/applications'))return ['Admin','Projects','Applications'];
 if(pathname.startsWith('/admin/project-operations/team-formation'))return ['Admin','Projects','Team Formation'];
 if(pathname.startsWith('/admin/content/news'))return ['Admin','Content & Comms','News & Insights'];
 if(pathname.startsWith('/admin/content/structured'))return ['Admin','Content & Comms','Structured Content'];
 if(pathname.startsWith('/admin/careers/roles'))return ['Admin','Recruiting','Careers','Roles'];
 if(pathname.startsWith('/admin/careers/applications'))return ['Admin','Recruiting','Careers','Candidates'];
 if(pathname.startsWith('/admin/careers/pipeline'))return ['Admin','Recruiting','Careers','Pipeline'];
 if(pathname.startsWith('/admin/notifications/overview'))return ['Admin','Content & Comms','Communications','Overview'];
 if(pathname.startsWith('/admin/notifications/templates'))return ['Admin','Content & Comms','Communications','Templates'];
 if(pathname.startsWith('/admin/notifications/delivery'))return ['Admin','Content & Comms','Communications','Delivery Queue'];
 if(pathname.startsWith('/admin/notifications/events'))return ['Admin','Content & Comms','Communications','Event Catalogue'];
 if(pathname.startsWith('/admin/intake'))return ['Admin','System','Intake'];
 const item=currentItem(pathname);
 if(!item)return ['Admin','Workspace'];
 const group=groups.find(group=>group.items.includes(item));
 return ['Admin',group?.label||'Workspace',item.label];
}

export default function AdminShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const[account,setAccount]=useState<AdminAccount>(null);
 const[navOpen,setNavOpen]=useState(false);
 const menuButtonRef=useRef<HTMLButtonElement>(null);
 const navRef=useRef<HTMLElement>(null);
 const crumbs=breadcrumb(pathname);

 useEffect(()=>{
  const supabase=createClient();
  let active=true;
  async function load(){
   const {data:{user}}=await supabase.auth.getUser();
   if(!active||!user)return;
   let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||user.email?.split('@')[0]||'Admin';
   let avatarUrl:string|null=null;
   const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
   if(profile?.full_name?.trim())name=profile.full_name.trim();
   if(profile?.avatar_url)avatarUrl=profile.avatar_url;
   if(active)setAccount({name,avatarUrl});
  }
  void load();
  return()=>{active=false};
 },[]);

 useEffect(()=>{setNavOpen(false)},[pathname]);

 useEffect(()=>{
  const mobile=window.matchMedia('(max-width:760px)');
  function onViewportChange(event:MediaQueryListEvent){if(!event.matches)setNavOpen(false)}
  mobile.addEventListener('change',onViewportChange);
  return()=>mobile.removeEventListener('change',onViewportChange);
 },[]);

 useEffect(()=>{
  if(!navOpen)return;
  const previousOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const nav=navRef.current;
  const initial=nav?.querySelector<HTMLElement>('[data-admin-nav-close]');
  requestAnimationFrame(()=>initial?.focus());

  function onKeyDown(event:KeyboardEvent){
   if(event.key==='Escape'){
    event.preventDefault();
    setNavOpen(false);
    requestAnimationFrame(()=>menuButtonRef.current?.focus());
    return;
   }
   if(event.key!=='Tab'||!nav)return;
   const focusable=Array.from(nav.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')).filter(element=>getComputedStyle(element).visibility!=='hidden');
   if(!focusable.length)return;
   const first=focusable[0];
   const last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }

  document.addEventListener('keydown',onKeyDown);
  return()=>{
   document.removeEventListener('keydown',onKeyDown);
   document.body.style.overflow=previousOverflow;
  };
 },[navOpen]);

 function closeNavigation(restoreFocus=true){
  setNavOpen(false);
  if(restoreFocus)requestAnimationFrame(()=>menuButtonRef.current?.focus());
 }

 const overviewActive=pathname==='/admin'||pathname==='/admin/overview';
 return <div className="adminApp">
  <header className="adminTop">
   <Link className="adminBrand" href="/admin" aria-label="Mettelo Admin home"><Image src="/mettelo-logo-light.svg" alt="Mettelo" width={1630} height={370} unoptimized priority/><span>Admin</span></Link>
   <button ref={menuButtonRef} className={`adminMenuButton${navOpen?' isOpen':''}`} type="button" aria-label={navOpen?'Close Admin navigation':'Open Admin navigation'} aria-expanded={navOpen} aria-controls="admin-primary-navigation" onClick={()=>setNavOpen(value=>!value)}><span className="adminMenuIcon" aria-hidden="true"><i/><i/><i/></span><span className="adminMenuText">Menu</span></button>
   <nav className="adminBreadcrumb" aria-label="Breadcrumb">{crumbs.map((crumb,index)=><span key={`${crumb}-${index}`}><strong>{crumb}</strong>{index<crumbs.length-1&&<i aria-hidden="true">/</i>}</span>)}</nav>
   <div className="adminTopActions"><Link className="memberSwitch" href="/member">Member workspace</Link><div className="adminIdentity"><span className="adminAvatar" style={account?.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`}:undefined}>{account?.avatarUrl?'':(account?.name?.[0]||'A').toUpperCase()}</span><span><strong>{account?.name?.split(' ')[0]||'Admin'}</strong><small>Admin access</small></span></div></div>
  </header>
  <div className={`adminNavBackdrop${navOpen?' isOpen':''}`} aria-hidden="true" onClick={()=>closeNavigation()} />
  <div className="adminBody">
   <aside ref={navRef} id="admin-primary-navigation" className={`adminNav${navOpen?' isOpen':''}`} aria-label="Admin primary navigation">
    <div className="adminNavMobileHeader"><div><span className="eyebrow">METTELO ADMIN</span><strong>Navigation</strong></div><button data-admin-nav-close type="button" aria-label="Close Admin navigation" onClick={()=>closeNavigation()}>×</button></div>
    <Link className={`adminOverviewLink ${overviewActive?'active':''}`} aria-current={overviewActive?'page':undefined} href="/admin" onClick={()=>setNavOpen(false)}>Overview<span>→</span></Link>
    {groups.map(group=><section className="adminNavGroup" key={group.label} aria-labelledby={`admin-nav-${group.label.replace(/\W+/g,'-').toLowerCase()}`}><h2 id={`admin-nav-${group.label.replace(/\W+/g,'-').toLowerCase()}`}>{group.label}</h2>{group.items.map(item=>{const active=activeHref(pathname,item.href);return <Link className={active?'active':''} aria-current={active?'page':undefined} key={item.href} href={item.href} onClick={()=>setNavOpen(false)}>{item.label}<span>→</span></Link>})}</section>)}
   </aside>
   <main className="adminContent">{children}</main>
  </div>
  <style jsx global>{`
body:has(.adminApp)>.topbar,body:has(.adminApp)>.siteHeader,body:has(.adminApp)>footer{display:none!important}body:has(.adminApp)>#main-content{min-height:100vh;background:#f6f7f9}.adminApp{min-height:100vh;background:#f6f7f9;color:#10131d;overflow-x:clip}.adminTop{position:sticky;top:0;z-index:95;height:64px;display:flex;align-items:center;gap:20px;padding:0 20px;background:#10131d;color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}.adminBrand{display:flex;align-items:center;gap:10px;color:#fff;flex:none}.adminBrand img{width:104px;height:auto}.adminBrand>span{padding-left:10px;border-left:1px solid rgba(255,255,255,.18);font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#d9dde4}.adminMenuButton{display:none}.adminBreadcrumb{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden}.adminBreadcrumb span{display:flex;align-items:center;gap:7px;min-width:0}.adminBreadcrumb strong{font-size:.72rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adminBreadcrumb span:not(:last-child) strong{color:#aab2be;font-weight:600}.adminBreadcrumb i{font-style:normal;color:#66707e}.adminTopActions{display:flex;align-items:center;gap:10px;margin-left:auto}.memberSwitch{min-height:40px;display:flex;align-items:center;padding:0 12px;border-radius:9px;background:#fff;color:#10131d;font-size:.72rem;font-weight:800}.adminIdentity{min-height:42px;display:flex;align-items:center;gap:8px;padding:4px 9px 4px 5px;border:1px solid rgba(255,255,255,.16);border-radius:11px}.adminAvatar{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:#c6892a;color:#10131d;font-weight:850;background-size:cover;background-position:center}.adminIdentity>span:last-child{display:grid}.adminIdentity strong{font-size:.72rem}.adminIdentity small{font-size:.6rem;color:#aab1bc}.adminBody{display:grid;grid-template-columns:244px minmax(0,1fr);max-width:1600px;margin:auto;min-height:calc(100vh - 64px)}.adminNav{position:sticky;top:64px;height:calc(100vh - 64px);padding:16px 12px 24px;background:#fff;border-right:1px solid rgba(16,19,29,.09);overflow-y:auto}.adminNavMobileHeader{display:none}.adminNavBackdrop{display:none}.adminNavGroup{display:grid;gap:3px;margin-top:18px}.adminNavGroup h2{margin:0;padding:0 10px 6px;font-size:.62rem;line-height:1.2;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:#737d8a}.adminNav a{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:9px;color:#48515e;font-size:.78rem;font-weight:650;border-left:3px solid transparent}.adminNav a:hover{background:#f2f4f7;color:#10131d}.adminNav a.active{background:#eef1f5;color:#10131d;border-left-color:#72501b;font-weight:800}.adminNav a.active span{color:#72501b}.adminOverviewLink{margin-bottom:4px}.adminContent{min-width:0}.adminContent>.section{padding-top:30px}.adminApp a:focus-visible,.adminApp button:focus-visible,.adminApp summary:focus-visible,.adminApp input:focus-visible,.adminApp select:focus-visible,.adminApp textarea:focus-visible{outline:3px solid #1e40af!important;outline-offset:3px!important}@media(max-width:1024px){.adminTop{height:60px;padding:0 12px;gap:10px}.adminBrand img{width:94px}.adminBrand>span{display:none}.adminBreadcrumb{max-width:40vw}.adminBody{grid-template-columns:210px minmax(0,1fr)}.adminNav{top:60px;height:calc(100vh - 60px)}.adminIdentity>span:last-child{display:none}.adminIdentity{padding:3px;border:0}}@media(max-width:760px){.adminTop{gap:8px}.adminMenuButton{width:44px;height:44px;display:grid;grid-template-columns:18px auto;place-items:center;align-content:center;gap:6px;padding:0 8px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:.66rem;font-weight:800}.adminMenuIcon{position:relative;width:18px;height:14px;display:block}.adminMenuIcon i{position:absolute;left:0;width:18px;height:2px;border-radius:999px;background:currentColor;transition:transform .18s ease,opacity .18s ease,top .18s ease}.adminMenuIcon i:nth-child(1){top:0}.adminMenuIcon i:nth-child(2){top:6px}.adminMenuIcon i:nth-child(3){top:12px}.adminMenuButton.isOpen .adminMenuIcon i:nth-child(1){top:6px;transform:rotate(45deg)}.adminMenuButton.isOpen .adminMenuIcon i:nth-child(2){opacity:0}.adminMenuButton.isOpen .adminMenuIcon i:nth-child(3){top:6px;transform:rotate(-45deg)}.adminBreadcrumb span:not(:last-child){display:none}.memberSwitch{font-size:.66rem;padding:0 9px}.adminBody{display:block}.adminNav{position:fixed;top:60px;left:0;bottom:0;z-index:92;width:min(88vw,320px);height:calc(100dvh - 60px);padding:0 12px 24px;border-right:1px solid rgba(16,19,29,.12);border-bottom:0;box-shadow:18px 0 45px rgba(16,19,29,.18);transform:translateX(-105%);visibility:hidden;pointer-events:none;transition:transform .2s ease,visibility .2s ease}.adminNav.isOpen{transform:translateX(0);visibility:visible;pointer-events:auto}.adminNavMobileHeader{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 -12px 12px;padding:14px 12px 12px;background:#fff;border-bottom:1px solid rgba(16,19,29,.08)}.adminNavMobileHeader>div{display:grid;gap:3px}.adminNavMobileHeader .eyebrow{font-size:.58rem;color:#72501b}.adminNavMobileHeader strong{font-size:1rem}.adminNavMobileHeader button{width:44px;height:44px;border:1px solid #cfd5dc;border-radius:10px;background:#f6f7f9;color:#10131d;font-size:1.45rem;line-height:1}.adminNavBackdrop{position:fixed;inset:60px 0 0;z-index:91;display:block;background:rgba(16,19,29,.46);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,visibility .2s ease}.adminNavBackdrop.isOpen{opacity:1;visibility:visible;pointer-events:auto}.adminNavGroup{display:grid}.adminNavGroup h2{display:block}.adminNav a{width:100%;min-height:44px}.adminContent>.section{padding-top:18px}}@media(max-width:480px){.adminTopActions{gap:5px}.adminIdentity{display:none}.adminBreadcrumb{display:none}.adminBrand img{width:86px}.memberSwitch{min-height:40px}.adminMenuButton{grid-template-columns:18px;width:44px;padding:0}.adminMenuText{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}@media(prefers-reduced-motion:reduce){.adminApp *,.adminApp *::before,.adminApp *::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
`}</style>
 </div>;
}
