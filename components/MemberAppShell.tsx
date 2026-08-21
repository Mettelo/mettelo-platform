'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {memberNavGroups,mobileMoreNav} from '@/lib/member-navigation';
import NotificationMenu from './NotificationMenu';
import styles from './MemberAppShell.module.css';

type Account={name:string;email:string;avatarUrl:string|null;isAdmin:boolean;accountType:'member'|'project_architect';hasLead:boolean}|null;

function SearchIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function HomeIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>}
function ProjectsIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 5.5h16v13H4zM7 9h10M7 12.5h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"/></svg>}
function ProofIcon(){return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 12 4 4L19 6M4 20h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function MoreIcon(){return <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/></svg>}

function sectionLabel(pathname:string){
  for(const group of memberNavGroups){for(const item of group.items){if(item.href==='/member'?pathname==='/member':pathname===item.href||pathname.startsWith(`${item.href}/`))return item.label}}
  if(pathname.startsWith('/member/architect-projects'))return 'Project Architect';
  if(pathname.startsWith('/member/project-architect'))return 'Project Architect pathway';
  if(pathname.startsWith('/member/project-lead'))return 'Project Lead';
  return 'My Mettelo';
}

export default function MemberAppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const isProjectLab=/^\/member\/projects\/[^/]+$/.test(pathname);
  const hasProjectBreadcrumb=/^\/member\/discover\/[^/]+/.test(pathname);
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
    if(publicTopbar)publicTopbar.style.display='none';
    if(publicHeader)publicHeader.style.display='none';
    if(publicFooter)publicFooter.style.display='none';
    const supabase=createClient();let active=true;
    async function load(){
      const {data:{user}}=await supabase.auth.getUser();if(!active||!user)return;
      const email=user.email||'';
      let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||email.split('@')[0]||'Member';
      let avatarUrl:string|null=null;
      const [{data:profile},{data:identity},{data:leadMembership}]=await Promise.all([
        supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle(),
        supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle(),
        supabase.from('project_members').select('id').eq('user_id',user.id).eq('team_role','project_lead').in('membership_status',['active','completed']).limit(1).maybeSingle()
      ]);
      if(profile?.full_name?.trim())name=profile.full_name.trim();
      if(profile?.avatar_url)avatarUrl=profile.avatar_url;
      if(active)setAccount({name,email,avatarUrl,isAdmin:user.app_metadata?.role==='admin',accountType:identity?.account_type==='project_architect'?'project_architect':'member',hasLead:Boolean(leadMembership)});
    }
    void load();
    const profileListener=(event:Event)=>{const detail=(event as CustomEvent<{name?:string;avatarUrl?:string|null}>).detail;setAccount(current=>current?{...current,name:detail?.name||current.name,avatarUrl:detail?.avatarUrl===undefined?current.avatarUrl:detail.avatarUrl}:current)};
    window.addEventListener('mettelo:profile-updated',profileListener);
    return()=>{active=false;window.removeEventListener('mettelo:profile-updated',profileListener);document.body.classList.remove('memberAppActive','metteloLabActive');if(publicTopbar)publicTopbar.style.display=previous[0]||'';if(publicHeader)publicHeader.style.display=previous[1]||'';if(publicFooter)publicFooter.style.display=previous[2]||''};
  },[isProjectLab]);

  const closeMenus=()=>{setAccountOpen(false);setMoreOpen(false)};
  async function signOut(){closeMenus();const supabase=createClient();await supabase.auth.signOut();window.location.assign('/')}
  const isActive=(href:string)=>href==='/member'?pathname==='/member':pathname===href||pathname.startsWith(`${href}/`);
  const moreActive=mobileMoreNav.some(item=>isActive(item.href));
  useEffect(()=>{setAccountOpen(false);setMoreOpen(false)},[pathname]);
  useEffect(()=>{function closeOutside(event:PointerEvent){const target=event.target as Node;if(!accountRef.current?.contains(target)&&!moreRef.current?.contains(target)){setAccountOpen(false);setMoreOpen(false)}}function escape(event:KeyboardEvent){if(event.key==='Escape'){setAccountOpen(false);setMoreOpen(false)}}document.addEventListener('pointerdown',closeOutside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',escape)}},[]);

  const roleTools=[
    ...(account?.hasLead?[{label:'Project Lead',href:'/member/project-lead',description:'Delivery health, blockers and completion'}]:[]),
    ...(account?.accountType==='project_architect'?[{label:'Project Architect',href:'/member/architect-projects',description:'Shape and govern assigned projects'}]:[])
  ];
  const currentSection=sectionLabel(pathname);
  const renderNavItem=(item:{label:string;href:string;description:string})=><Link aria-current={isActive(item.href)?'page':undefined} className={isActive(item.href)?styles.activeLink:styles.navLink} href={item.href} key={item.href}><span className={styles.navMark} aria-hidden="true">{item.label.slice(0,1)}</span><span className={styles.navCopy}><strong>{item.label}</strong><small>{item.description}</small></span></Link>;

  return <div className={styles.appShell}>
    <header className={styles.appHeader}><div className={styles.headerInner}>
      <Link className={styles.brand} href="/member" aria-label="My Mettelo home" onClick={closeMenus}><Image src="/mettelo-logo-dark.svg" alt="Mettelo" width={1630} height={370} priority unoptimized style={{width:122,height:'auto'}}/></Link>
      <span className={styles.workspaceName}>{isProjectLab?'Mettelo Lab':'My Mettelo'}</span>
      <div className={styles.headerActions}>
        {!isProjectLab&&<Link className={styles.findButton} href="/member/discover" onClick={closeMenus}>Find a project</Link>}
        <Link className={styles.searchButton} href="/search" aria-label="Search Mettelo" title="Search Mettelo"><SearchIcon/></Link>
        {account?.isAdmin&&<Link className={styles.modeSwitch} href="/admin/project-operations" onClick={closeMenus}>Admin</Link>}
        <NotificationMenu/>
        <details ref={accountRef} open={accountOpen} className={styles.accountMenu} onToggle={event=>{const open=event.currentTarget.open;setAccountOpen(open);if(open)setMoreOpen(false)}}>
          <summary aria-label="Open account menu"><span className={styles.avatar} style={account?.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`}:undefined}>{account?.avatarUrl?'':(account?.name?.[0]||'M').toUpperCase()}</span><span className={styles.accountCopy}><strong>{account?.name?.split(' ')[0]||'Member'}</strong><small>{account?.accountType==='project_architect'?'Project Architect':'Member'}</small></span><span aria-hidden="true">⌄</span></summary>
          <div className={styles.accountPanel}>{account&&<div className={styles.accountIdentity}><strong>{account.name}</strong><small>{account.email}</small></div>}<Link href="/member" onClick={closeMenus}>Dashboard <span>→</span></Link><Link href="/member/profile" onClick={closeMenus}>Profile <span>→</span></Link><Link href="/contact" onClick={closeMenus}>Help & support <span>→</span></Link>{account?.isAdmin&&<Link href="/admin/project-operations" onClick={closeMenus}>Admin console <span>→</span></Link>}<button type="button" onClick={signOut}>Sign out <span>→</span></button></div>
        </details>
      </div>
    </div></header>

    <div className={styles.appBody} style={isProjectLab?{display:'block'}:undefined}>
      {!isProjectLab&&<aside className={styles.sidebar} aria-label="My Mettelo navigation">
        <div className={styles.sidebarIntro}><span>MY METTELO</span><strong>Member space</strong></div>
        {memberNavGroups.map(group=><section className={styles.navSection} key={group.label}><h2>{group.label}</h2><nav aria-label={`${group.label} navigation`}>{group.items.map(renderNavItem)}</nav></section>)}
        {roleTools.length>0&&<section className={styles.navSection}><h2>Role Tools</h2><nav aria-label="Role tools">{roleTools.map(renderNavItem)}</nav></section>}
        {account?.accountType!=='project_architect'&&<Link className={styles.pathwayLink} href="/member/project-architect">Project Architect pathway <span>→</span></Link>}
        {account?.isAdmin&&<Link className={styles.adminCard} href="/admin/project-operations"><strong>Admin console</strong><small>Manage projects and applications</small><span>Open →</span></Link>}
        <div className={styles.sidebarHelp}><Link href="/contact">Help & support</Link><Link href="/feedback">Give feedback</Link></div>
      </aside>}
      <section className={styles.content} aria-label="My Mettelo workspace" style={isProjectLab?{padding:0,maxWidth:'none'}:undefined}>
        {!isProjectLab&&!hasProjectBreadcrumb&&<div className={styles.pageContext} aria-label="Current section"><span>My Mettelo</span><span aria-hidden="true">/</span><strong>{currentSection}</strong></div>}{children}
      </section>
    </div>

    {!isProjectLab&&<nav className={styles.bottomNav} aria-label="My Mettelo mobile navigation">
      <Link aria-current={pathname==='/member'?'page':undefined} className={pathname==='/member'?styles.bottomActive:''} href="/member"><span><HomeIcon/></span><small>Home</small></Link>
      <Link aria-current={isActive('/member/projects')?'page':undefined} className={isActive('/member/projects')?styles.bottomActive:''} href="/member/projects"><span><ProjectsIcon/></span><small>Projects</small></Link>
      <Link aria-current={isActive('/member/discover')?'page':undefined} className={isActive('/member/discover')?styles.bottomActive:''} href="/member/discover"><span><SearchIcon/></span><small>Discover</small></Link>
      <Link aria-current={isActive('/member/proof')?'page':undefined} className={isActive('/member/proof')?styles.bottomActive:''} href="/member/proof"><span><ProofIcon/></span><small>Proof</small></Link>
      <details ref={moreRef} open={moreOpen} className={styles.moreMenu} onToggle={event=>{const open=event.currentTarget.open;setMoreOpen(open);if(open)setAccountOpen(false)}}><summary aria-label={moreOpen?'Close more navigation':'Open more navigation'} aria-expanded={moreOpen} aria-current={moreActive?'page':undefined} className={moreActive?styles.bottomActive:undefined}><span><MoreIcon/></span><small>More</small></summary><div id="member-more" className={styles.morePanel}><div className={styles.morePanelHead}><div><span>MY METTELO</span><strong>More</strong></div><button type="button" onClick={()=>setMoreOpen(false)} aria-label="Close more navigation">×</button></div>{mobileMoreNav.map(item=><Link aria-current={isActive(item.href)?'page':undefined} href={item.href} key={item.href} onClick={closeMenus}><span><strong>{item.label}</strong><small>{item.description}</small></span><b aria-hidden="true">→</b></Link>)}{roleTools.map(item=><Link href={item.href} key={item.href} onClick={closeMenus}><span><strong>{item.label}</strong><small>{item.description}</small></span><b aria-hidden="true">→</b></Link>)}{account?.accountType!=='project_architect'&&<Link href="/member/project-architect" onClick={closeMenus}><span><strong>Project Architect pathway</strong><small>Progress toward governed project responsibilities</small></span><b aria-hidden="true">→</b></Link>}<Link href="/contact" onClick={closeMenus}><span><strong>Help & support</strong><small>Get help with Mettelo</small></span><b aria-hidden="true">→</b></Link></div></details>
    </nav>}

    <style jsx global>{`.memberAppActive .memberSidebar{display:none!important}.memberAppActive .memberDashboard{display:block!important;width:100%!important}.memberAppActive .memberWorkspace{padding-top:0!important;background:#f5f5f2!important}.memberAppActive .memberDashboardMain{max-width:none!important}.memberAppActive #main-content{min-height:100vh;background:#f5f5f2;overflow-x:clip}.memberAppActive .shell,.memberAppActive .panel,.memberAppActive .card{min-width:0;max-width:100%}.memberAppActive a:focus-visible,.memberAppActive button:focus-visible,.memberAppActive summary:focus-visible,.memberAppActive input:focus-visible,.memberAppActive select:focus-visible,.memberAppActive textarea:focus-visible{outline:3px solid #173f8f;outline-offset:3px}.metteloLabActive #main-content{background:#f5f6f3}.metteloLabActive .panel,.metteloLabActive .workspaceBlock{border-radius:16px!important;border-color:#d7dce3!important}.metteloLabActive input,.metteloLabActive select,.metteloLabActive textarea{max-width:100%}.metteloLabActive table{max-width:100%}@media(max-width:900px){.memberAppActive .memberWorkspace>.shell{width:min(calc(100% - 24px),1240px)}.memberAppActive .sectionHead{display:grid;gap:10px}.memberAppActive .sectionHead h1,.memberAppActive .sectionHead h2{overflow-wrap:anywhere}.memberAppActive table{min-width:680px}.memberAppActive .tableWrap{overflow-x:auto;-webkit-overflow-scrolling:touch}.metteloLabActive table{min-width:0!important;width:100%}}@media(max-width:480px){.metteloLabActive input,.metteloLabActive select,.metteloLabActive textarea,.metteloLabActive button{font-size:16px}.metteloLabActive .fieldRow{grid-template-columns:1fr!important}.metteloLabActive .panel,.metteloLabActive .workspaceBlock{border-radius:14px!important}.metteloLabActive .workspaceCollection,.metteloLabActive .dashboardGrid,.metteloLabActive .problemBriefGrid,.metteloLabActive .recordFacts{grid-template-columns:1fr!important}.metteloLabActive .tableWrap{overflow:visible!important}.metteloLabActive table,.metteloLabActive thead,.metteloLabActive tbody,.metteloLabActive tr,.metteloLabActive th,.metteloLabActive td{display:block!important;width:100%!important}.metteloLabActive thead{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important}.metteloLabActive td{white-space:normal!important;overflow-wrap:anywhere!important}}@media(prefers-reduced-motion:reduce){.memberAppActive *,.memberAppActive *::before,.memberAppActive *::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`}</style>
  </div>;
}
