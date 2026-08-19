'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Suspense,useEffect,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import NotificationMenu from './NotificationMenu';
import WorkspaceRouteTabs from './WorkspaceRouteTabs';
import styles from './MemberAppShell.module.css';

type Account={name:string;email:string;avatarUrl:string|null;isAdmin:boolean;accountType:'member'|'project_architect'}|null;
type NavItem={label:string;href:string;description:string};

const primary:NavItem[]=[
  {label:'Home',href:'/member',description:'Your next actions and recent activity'},
  {label:'Find projects',href:'/projects',description:'Browse projects and open roles'},
  {label:'Applications',href:'/member/applications',description:'Track decisions and team formation'},
  {label:'My projects',href:'/member/projects',description:'Open active project workspaces'},
  {label:'Profile',href:'/member/profile',description:'Skills, availability and public profile'}
];
const secondary:NavItem[]=[
  {label:'Recommended',href:'/member/recommended',description:'Suggested projects and opportunities'},
  {label:'Opportunities',href:'/opportunities',description:'Jobs, internships and fellowships'},
  {label:'Saved',href:'/member/saved-opportunities',description:'Opportunities you want to revisit'},
  {label:'Events',href:'/member/events',description:'Your registered Mettelo events'},
  {label:'Proof',href:'/member/proof',description:'Verified evidence of your work'}
];

function HomeIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}
function SearchIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function ProjectsIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5.5h16v13H4zM7 9h10M7 12.5h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"/></svg>}
function ApplicationsIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 3.5h10v17H7zM9.5 8h5M9.5 12h5M9.5 16h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function MoreIcon(){return <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>}

function sectionLabel(pathname:string){
  if(pathname==='/member')return 'Home';
  if(pathname.startsWith('/member/applications'))return 'Applications';
  if(pathname.startsWith('/member/projects'))return 'My projects';
  if(pathname.startsWith('/member/profile'))return 'Profile';
  if(pathname.startsWith('/member/recommended'))return 'Recommended';
  if(pathname.startsWith('/member/saved-opportunities'))return 'Saved';
  if(pathname.startsWith('/member/events'))return 'Events';
  if(pathname.startsWith('/member/proof'))return 'Proof';
  if(pathname.startsWith('/member/architect-projects'))return 'Architect projects';
  if(pathname.startsWith('/member/project-architect'))return 'Project Architect';
  if(pathname.startsWith('/member/project-lead'))return 'Project Lead';
  return 'Workspace';
}

export default function MemberAppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const isProjectLab=/^\/member\/projects\/[^/]+$/.test(pathname);
  const [account,setAccount]=useState<Account>(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
  const accountRef=useRef<HTMLDetailsElement>(null);
  const moreRef=useRef<HTMLDetailsElement>(null);

  useEffect(()=>{
    document.body.classList.add('memberAppActive');
    document.body.classList.toggle('metteloLabActive',isProjectLab);
    const publicTopbar=document.querySelector<HTMLElement>('body > .topbar');
    const publicHeader=document.querySelector<HTMLElement>('body > .siteHeader');
    const publicFooter=document.querySelector<HTMLElement>('body > footer');
    const previous=[publicTopbar?.style.display,publicHeader?.style.display,publicFooter?.style.display];
    if(publicTopbar)publicTopbar.style.display='none';if(publicHeader)publicHeader.style.display='none';if(publicFooter)publicFooter.style.display='none';
    const supabase=createClient();let active=true;
    async function load(){
      const {data:{user}}=await supabase.auth.getUser();if(!active||!user)return;
      const email=user.email||'';
      let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||email.split('@')[0]||'Member';
      let avatarUrl:string|null=null;
      const [{data:profile},{data:identity}]=await Promise.all([
        supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle(),
        supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle()
      ]);
      if(profile?.full_name?.trim())name=profile.full_name.trim();if(profile?.avatar_url)avatarUrl=profile.avatar_url;
      if(active)setAccount({name,email,avatarUrl,isAdmin:user.app_metadata?.role==='admin',accountType:identity?.account_type==='project_architect'?'project_architect':'member'});
    }
    void load();
    const profileListener=(event:Event)=>{const detail=(event as CustomEvent<{name?:string;avatarUrl?:string|null}>).detail;setAccount(current=>current?{...current,name:detail?.name||current.name,avatarUrl:detail?.avatarUrl===undefined?current.avatarUrl:detail.avatarUrl}:current)};
    window.addEventListener('mettelo:profile-updated',profileListener);
    return()=>{active=false;window.removeEventListener('mettelo:profile-updated',profileListener);document.body.classList.remove('memberAppActive','metteloLabActive');if(publicTopbar)publicTopbar.style.display=previous[0]||'';if(publicHeader)publicHeader.style.display=previous[1]||'';if(publicFooter)publicFooter.style.display=previous[2]||''};
  },[isProjectLab]);

  const closeMenus=()=>{setAccountOpen(false);setMoreOpen(false)};
  async function signOut(){closeMenus();const supabase=createClient();await supabase.auth.signOut();window.location.assign('/')}
  const isActive=(href:string)=>href==='/member'?pathname==='/member':pathname===href||pathname.startsWith(`${href}/`);
  useEffect(()=>{setAccountOpen(false);setMoreOpen(false)},[pathname]);
  useEffect(()=>{function closeOutside(event:PointerEvent){const target=event.target as Node;if(!accountRef.current?.contains(target)&&!moreRef.current?.contains(target)){setAccountOpen(false);setMoreOpen(false)}}function escape(event:KeyboardEvent){if(event.key==='Escape'){setAccountOpen(false);setMoreOpen(false)}}document.addEventListener('pointerdown',closeOutside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',escape)}},[]);

  const renderItem=(item:NavItem)=><Link aria-current={isActive(item.href)?'page':undefined} className={isActive(item.href)?styles.activeLink:styles.navLink} href={item.href} key={item.href}><span><strong>{item.label}</strong><small>{item.description}</small></span><span aria-hidden="true">→</span></Link>;
  const architectHref=account?.accountType==='project_architect'?'/member/architect-projects':'/member/project-architect';
  const architectLabel=account?.accountType==='project_architect'?'Architect projects':'Project Architect';
  const currentSection=sectionLabel(pathname);

  return <div className={styles.appShell}>
    <header className={styles.appHeader}><div className={styles.headerInner}>
      <Link className={styles.brand} href="/member" aria-label="My Mettelo home" onClick={closeMenus}><Image src="/mettelo-logo-dark.svg" alt="Mettelo" width={1630} height={370} priority unoptimized style={{width:122,height:'auto'}}/></Link>
      <span className={styles.workspaceName}>{isProjectLab?'Mettelo Lab':'My Mettelo'}</span>
      <div className={styles.headerActions}>
        {!isProjectLab&&<Link className={styles.findButton} href="/projects" onClick={closeMenus}>Find a project</Link>}
        <Link className={styles.searchButton} href="/search" aria-label="Search Mettelo" title="Search Mettelo"><SearchIcon/></Link>
        {account?.isAdmin&&<Link className={styles.modeSwitch} href="/admin/project-operations" onClick={closeMenus}>Admin</Link>}
        <NotificationMenu/>
        <details ref={accountRef} open={accountOpen} className={styles.accountMenu} onToggle={event=>{const open=event.currentTarget.open;setAccountOpen(open);if(open)setMoreOpen(false)}}>
          <summary aria-label="Open account menu"><span className={styles.avatar} style={account?.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`}:undefined}>{account?.avatarUrl?'':(account?.name?.[0]||'M').toUpperCase()}</span><span className={styles.accountCopy}><strong>{account?.name?.split(' ')[0]||'Member'}</strong><small>{account?.accountType==='project_architect'?'Project Architect':'Member'}</small></span><span aria-hidden="true">⌄</span></summary>
          <div className={styles.accountPanel} onClickCapture={event=>{if((event.target as Element).closest('a,button'))closeMenus()}}>{account&&<div className={styles.accountIdentity}><strong>{account.name}</strong><small>{account.email}</small></div>}<Link href="/member/profile">Profile <span>→</span></Link><Link href="/contact">Help & support <span>→</span></Link>{account?.isAdmin&&<Link href="/admin/project-operations">Admin console <span>→</span></Link>}<button type="button" onClick={signOut}>Sign out <span>→</span></button></div>
        </details>
      </div>
    </div></header>

    <div className={styles.appBody} style={isProjectLab?{display:'block'}:undefined}>
      {!isProjectLab&&<aside className={styles.sidebar} aria-label="My Mettelo navigation">
        <div className={styles.sidebarIntro}><span>MY METTELO</span><strong>Member workspace</strong></div>
        <nav className={styles.primaryNav} aria-label="Primary member navigation">{primary.map(renderItem)}</nav>
        <details className={styles.secondaryDisclosure}>
          <summary><span className={styles.navLabel}>Explore</span><span aria-hidden="true">⌄</span></summary>
          <nav className={styles.secondaryNav} aria-label="Explore Mettelo">{secondary.map(renderItem)}<Link aria-current={isActive(architectHref)?'page':undefined} className={isActive(architectHref)?styles.activeLink:styles.navLink} href={architectHref}><span><strong>{architectLabel}</strong><small>Shape and support Mettelo projects</small></span><span aria-hidden="true">→</span></Link></nav>
        </details>
        {account?.isAdmin&&<div className={styles.workspaceSwitch}><span>SWITCH WORKSPACE</span><Link className={styles.modeCard} href="/admin/project-operations"><strong>Admin console</strong><small>Manage projects and applications</small><span>Open →</span></Link></div>}
        <div className={styles.sidebarHelp}><Link href="/contact">Help & support</Link><Link href="/feedback">Give feedback</Link></div>
      </aside>}
      <main className={styles.content} style={isProjectLab?{padding:0,maxWidth:'none'}:undefined}>
        {!isProjectLab&&<><div className={styles.pageContext} aria-label="Current section"><span>My Mettelo</span><span aria-hidden="true">/</span><strong>{currentSection}</strong></div><Suspense fallback={null}><WorkspaceRouteTabs/></Suspense></>}{children}
      </main>
    </div>

    {!isProjectLab&&<nav className={styles.bottomNav} aria-label="Member mobile navigation">
      <Link aria-current={isActive('/member')?'page':undefined} className={isActive('/member')?styles.bottomActive:''} href="/member"><span><HomeIcon/></span><small>Home</small></Link>
      <Link className={isActive('/projects')?styles.bottomActive:''} href="/projects"><span><SearchIcon/></span><small>Discover</small></Link>
      <Link aria-current={isActive('/member/applications')?'page':undefined} className={isActive('/member/applications')?styles.bottomActive:''} href="/member/applications"><span><ApplicationsIcon/></span><small>Applications</small></Link>
      <Link aria-current={isActive('/member/projects')?'page':undefined} className={isActive('/member/projects')?styles.bottomActive:''} href="/member/projects"><span><ProjectsIcon/></span><small>Projects</small></Link>
      <details ref={moreRef} open={moreOpen} className={styles.moreMenu} onToggle={event=>{const open=event.currentTarget.open;setMoreOpen(open);if(open)setAccountOpen(false)}}><summary aria-label="Open more navigation"><span><MoreIcon/></span><small>More</small></summary><div className={styles.morePanel} onClickCapture={event=>{if((event.target as Element).closest('a,button'))closeMenus()}}><div className={styles.moreIdentity}>{account&&<><strong>{account.name}</strong><small>{account.email}</small></>}</div><Link href="/member/profile">Profile <span>→</span></Link><Link href="/member/recommended">Recommended <span>→</span></Link><Link href="/opportunities">Opportunities <span>→</span></Link><Link href="/member/saved-opportunities">Saved <span>→</span></Link><Link href="/member/events">Events <span>→</span></Link><Link href="/member/proof">Proof <span>→</span></Link><Link href={architectHref}>{architectLabel} <span>→</span></Link>{account?.isAdmin&&<Link href="/admin/project-operations">Admin console <span>→</span></Link>}<Link href="/contact">Help & support <span>→</span></Link><button type="button" onClick={signOut}>Sign out <span>→</span></button></div></details>
    </nav>}

    <style jsx global>{`.memberAppActive .memberSidebar{display:none!important}.memberAppActive .memberDashboard{display:block!important;width:100%!important}.memberAppActive .memberWorkspace{padding-top:0!important;background:#f7f7f5!important}.memberAppActive .memberDashboardMain{max-width:none!important}.memberAppActive #main-content{min-height:100vh;background:#f7f7f5;overflow-x:clip}.memberAppActive .shell,.memberAppActive .panel,.memberAppActive .card{min-width:0;max-width:100%}.memberAppActive a:focus-visible,.memberAppActive button:focus-visible,.memberAppActive summary:focus-visible,.memberAppActive input:focus-visible,.memberAppActive select:focus-visible,.memberAppActive textarea:focus-visible{outline:3px solid #174ea6;outline-offset:3px}.metteloLabActive #main-content{background:#f5f6f3}.metteloLabActive .panel,.metteloLabActive .workspaceBlock{border-radius:16px!important;border-color:#d7dce3!important}.metteloLabActive input,.metteloLabActive select,.metteloLabActive textarea{max-width:100%}.metteloLabActive table{max-width:100%}@media(max-width:900px){.memberAppActive .memberWorkspace>.shell{width:min(calc(100% - 24px),1240px)}.memberAppActive .sectionHead{display:grid;gap:10px}.memberAppActive .sectionHead h1,.memberAppActive .sectionHead h2{overflow-wrap:anywhere}.memberAppActive .dashboardGrid,.memberAppActive .metricGrid,.memberAppActive .grid3,.memberAppActive .grid4{grid-template-columns:1fr!important}.memberAppActive table{min-width:680px}.memberAppActive .tableWrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.metteloLabActive table{min-width:0!important;width:100%}}@media(max-width:480px){.metteloLabActive input,.metteloLabActive select,.metteloLabActive textarea,.metteloLabActive button{font-size:16px}.metteloLabActive .fieldRow{grid-template-columns:1fr!important}.metteloLabActive .panel,.metteloLabActive .workspaceBlock{border-radius:14px!important}.metteloLabActive .workspaceCollection,.metteloLabActive .dashboardGrid,.metteloLabActive .problemBriefGrid,.metteloLabActive .recordFacts{grid-template-columns:1fr!important}.metteloLabActive .tableWrap{overflow:visible!important}.metteloLabActive table,.metteloLabActive thead,.metteloLabActive tbody,.metteloLabActive tr,.metteloLabActive th,.metteloLabActive td{display:block!important;width:100%!important}.metteloLabActive thead{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important}.metteloLabActive td{white-space:normal!important;overflow-wrap:anywhere!important}}@media(prefers-reduced-motion:reduce){.memberAppActive *,.memberAppActive *::before,.memberAppActive *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`}</style>
  </div>;
}