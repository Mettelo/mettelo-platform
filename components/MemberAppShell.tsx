'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import NotificationMenu from './NotificationMenu';
import styles from './MemberAppShell.module.css';

type Account={name:string;email:string;avatarUrl:string|null;isAdmin:boolean}|null;
const groups=[
  {label:'',items:[['Dashboard','/member'],['Recommended','/member/recommended']]},
  {label:'My work',items:[['Applications','/member/applications'],['My Projects','/member/projects'],['Proof & Contributions','/member/proof']]},
  {label:'Discover',items:[['Projects','/projects'],['Opportunities','/opportunities'],['Events','/events'],['Community','/community']]},
  {label:'Identity',items:[['Profile','/member/profile']]}
] as const;
function HomeIcon(){return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}

export default function MemberAppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();const [account,setAccount]=useState<Account>(null);
  useEffect(()=>{
    document.body.classList.add('memberAppActive');const publicTopbar=document.querySelector<HTMLElement>('body > .topbar');const publicHeader=document.querySelector<HTMLElement>('body > .siteHeader');const publicFooter=document.querySelector<HTMLElement>('body > footer');const previous=[publicTopbar?.style.display,publicHeader?.style.display,publicFooter?.style.display];if(publicTopbar)publicTopbar.style.display='none';if(publicHeader)publicHeader.style.display='none';if(publicFooter)publicFooter.style.display='none';
    const supabase=createClient();let active=true;
    async function load(){const {data:{user}}=await supabase.auth.getUser();if(!active||!user)return;const email=user.email||'';let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||email.split('@')[0]||'Member';let avatarUrl:string|null=null;const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();if(profile?.full_name?.trim())name=profile.full_name.trim();if(profile?.avatar_url)avatarUrl=profile.avatar_url;if(active)setAccount({name,email,avatarUrl,isAdmin:user.app_metadata?.role==='admin'});}
    void load();
    const profileListener=(event:Event)=>{const detail=(event as CustomEvent<{name?:string;avatarUrl?:string|null}>).detail;setAccount(current=>current?{...current,name:detail?.name||current.name,avatarUrl:detail?.avatarUrl===undefined?current.avatarUrl:detail.avatarUrl}:current);};window.addEventListener('mettelo:profile-updated',profileListener);
    return()=>{active=false;window.removeEventListener('mettelo:profile-updated',profileListener);document.body.classList.remove('memberAppActive');if(publicTopbar)publicTopbar.style.display=previous[0]||'';if(publicHeader)publicHeader.style.display=previous[1]||'';if(publicFooter)publicFooter.style.display=previous[2]||'';};
  },[]);
  async function signOut(){const supabase=createClient();await supabase.auth.signOut();window.location.assign('/');}
  const isActive=(href:string)=>href==='/member'?pathname==='/member':pathname===href||pathname.startsWith(`${href}/`);
  const nav=<>{groups.map(group=><div className={styles.navGroup} key={group.label||'primary'}>{group.label&&<span className={styles.navLabel}>{group.label}</span>}{group.items.map(([label,href])=><Link className={isActive(href)?styles.activeLink:styles.navLink} href={href} key={href}><span>{label}</span><span aria-hidden="true">→</span></Link>)}</div>)}</>;

  return <div className={styles.appShell}>
    <header className={styles.appHeader}><div className={styles.headerInner}><Link className={styles.brand} href="/member" aria-label="Mettelo member dashboard"><Image src="/mettelo-logo-dark.svg" alt="Mettelo" width={1630} height={370} priority unoptimized style={{width:126,height:'auto'}}/></Link><Link className={styles.homeButton} href="/" aria-label="Mettelo home" title="Home"><HomeIcon/></Link><a className={styles.search} href="/search"><span aria-hidden="true">⌕</span><span>Search projects, people, opportunities...</span></a><div className={styles.headerActions}>{account?.isAdmin&&<Link className={styles.modeSwitch} href="/admin/project-operations">Admin mode</Link>}<NotificationMenu/><details className={styles.accountMenu}><summary aria-label="Open account menu"><span className={styles.avatar} style={account?.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`}:undefined}>{account?.avatarUrl?'':(account?.name?.[0]||'M').toUpperCase()}</span><span className={styles.accountCopy}><strong>{account?.name?.split(' ')[0]||'Member'}</strong><small>{account?.isAdmin?'Member mode':'Account'}</small></span><span aria-hidden="true">⌄</span></summary><div className={styles.accountPanel}>{account&&<div className={styles.accountIdentity}><strong>{account.name}</strong><small>{account.email}</small></div>}<Link href="/member">Dashboard <span>→</span></Link><Link href="/member/profile">Profile <span>→</span></Link>{account?.isAdmin&&<Link href="/admin/project-operations">Switch to Admin <span>→</span></Link>}<Link href="/feedback">Give feedback <span>→</span></Link><button type="button" onClick={signOut}>Sign out <span>→</span></button></div></details><details className={styles.mobileMenu}><summary aria-label="Open member navigation"><span aria-hidden="true">☰</span><span>Menu</span></summary><div className={styles.mobilePanel}>{account?.isAdmin&&<Link href="/admin/project-operations">Switch to Admin →</Link>}{nav}<div className={styles.mobileAccount}><Link href="/member/profile">Profile</Link><button type="button" onClick={signOut}>Sign out</button></div></div></details></div></div></header>
    <div className={styles.appBody}><aside className={styles.sidebar} aria-label="Mettelo member navigation"><div className={styles.sidebarIntro}><span>Workspace</span><strong>My Mettelo</strong></div>{account?.isAdmin&&<Link className={styles.modeCard} href="/admin/project-operations"><small>MODE</small><strong>Switch to Admin</strong><span>Manage projects & access →</span></Link>}<nav>{nav}</nav><div className={styles.sidebarHelp}><Link href="/feedback">Give feedback →</Link><Link href="/contact">Help & support →</Link></div></aside><main className={styles.content}>{children}</main></div>
    <style jsx global>{`.memberAppActive .memberSidebar{display:none!important}.memberAppActive .memberDashboard{display:block!important;width:100%!important}.memberAppActive .memberWorkspace{padding-top:0!important;background:#f6f7f9!important}.memberAppActive .memberDashboardMain{max-width:none!important}.memberAppActive #main-content{min-height:100vh;background:#f6f7f9}@media(max-width:780px){.memberAppActive .memberWorkspace>.shell{width:min(calc(100% - 24px),1240px)}}`}</style>
  </div>;
}
