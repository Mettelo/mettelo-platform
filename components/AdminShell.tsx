'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type AdminAccount={name:string;avatarUrl:string|null}|null;
type NavItem={label:string;href:string};
type NavGroup={label:string;items:NavItem[]};

const groups:NavGroup[]=[
  {label:'Recruiting',items:[{label:'Careers',href:'/admin/careers'},{label:'Applications',href:'/admin/applications'},{label:'Opportunity review',href:'/admin/opportunities'},{label:'Job sources',href:'/admin/opportunity-sources'}]},
  {label:'Projects',items:[{label:'Project operations',href:'/admin/project-operations/projects'},{label:'Project Architect',href:'/admin/project-architect-applications'},{label:'Project governance',href:'/admin/project-governance'}]},
  {label:'Community & Proof',items:[{label:'Proof review',href:'/admin/proof'},{label:'Spotlight & awards',href:'/admin/spotlights'},{label:'Events',href:'/admin/events'}]},
  {label:'Content & Comms',items:[{label:'Content & Insights',href:'/admin/content'},{label:'Notifications & email',href:'/admin/notifications'}]},
  {label:'System',items:[{label:'QA team',href:'/admin/qa'},{label:'Intake',href:'/admin/intake'},{label:'Admin access',href:'/admin/access'}]}
];
const flat=groups.flatMap(group=>group.items);
function currentItem(pathname:string){return flat.find(item=>pathname===item.href||pathname.startsWith(`${item.href}/`))||null}
function breadcrumb(pathname:string){
  if(pathname==='/admin'||pathname==='/admin/overview')return ['Admin','Overview'];
  if(pathname.startsWith('/admin/project-operations/projects/'))return ['Admin','Projects','Projects','Project detail'];
  if(pathname.startsWith('/admin/project-operations/projects'))return ['Admin','Projects','Projects'];
  if(pathname.startsWith('/admin/project-operations/applications'))return ['Admin','Projects','Applications'];
  if(pathname.startsWith('/admin/project-operations/team-formation'))return ['Admin','Projects','Team Formation'];
  const item=currentItem(pathname);if(!item)return ['Admin','Workspace'];
  const group=groups.find(group=>group.items.includes(item));return ['Admin',group?.label||'Workspace',item.label];
}

export default function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();const [account,setAccount]=useState<AdminAccount>(null);const crumbs=breadcrumb(pathname);
  useEffect(()=>{const supabase=createClient();let active=true;async function load(){const {data:{user}}=await supabase.auth.getUser();if(!active||!user)return;let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||user.email?.split('@')[0]||'Admin';let avatarUrl:string|null=null;const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();if(profile?.full_name?.trim())name=profile.full_name.trim();if(profile?.avatar_url)avatarUrl=profile.avatar_url;if(active)setAccount({name,avatarUrl})}void load();return()=>{active=false}},[]);
  const activeHref=(href:string)=>pathname===href||pathname.startsWith(`${href}/`);
  return <div className="adminApp">
    <header className="adminTop"><Link className="adminBrand" href="/admin" aria-label="Mettelo Admin home"><Image src="/mettelo-logo-light.svg" alt="Mettelo" width={1630} height={370} unoptimized priority/><span>Admin</span></Link><nav className="adminBreadcrumb" aria-label="Breadcrumb">{crumbs.map((crumb,index)=><span key={`${crumb}-${index}`}><strong>{crumb}</strong>{index<crumbs.length-1&&<i aria-hidden="true">/</i>}</span>)}</nav><div className="adminTopActions"><Link className="memberSwitch" href="/member">Member workspace</Link><div className="adminIdentity"><span className="adminAvatar" style={account?.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`}:undefined}>{account?.avatarUrl?'':(account?.name?.[0]||'A').toUpperCase()}</span><span><strong>{account?.name?.split(' ')[0]||'Admin'}</strong><small>Admin access</small></span></div></div></header>
    <div className="adminBody"><aside className="adminNav" aria-label="Admin primary navigation"><Link className={`adminOverviewLink ${pathname==='/admin'||pathname==='/admin/overview'?'active':''}`} aria-current={pathname==='/admin'||pathname==='/admin/overview'?'page':undefined} href="/admin">Overview<span>→</span></Link>{groups.map(group=><section className="adminNavGroup" key={group.label} aria-labelledby={`admin-nav-${group.label.replace(/\W+/g,'-').toLowerCase()}`}><h2 id={`admin-nav-${group.label.replace(/\W+/g,'-').toLowerCase()}`}>{group.label}</h2>{group.items.map(item=><Link className={activeHref(item.href)?'active':''} aria-current={activeHref(item.href)?'page':undefined} key={item.href} href={item.href}>{item.label}<span>→</span></Link>)}</section>)}</aside><main className="adminContent">{children}</main></div>
    <style jsx global>{`
      body:has(.adminApp)>.topbar,body:has(.adminApp)>.siteHeader,body:has(.adminApp)>footer{display:none!important}body:has(.adminApp)>#main-content{min-height:100vh;background:#f6f7f9}.adminApp{min-height:100vh;background:#f6f7f9;color:#10131d;overflow-x:clip}
      .adminTop{position:sticky;top:0;z-index:95;height:64px;display:flex;align-items:center;gap:20px;padding:0 20px;background:#10131d;color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}.adminBrand{display:flex;align-items:center;gap:10px;color:#fff;flex:none}.adminBrand img{width:104px;height:auto}.adminBrand>span{padding-left:10px;border-left:1px solid rgba(255,255,255,.18);font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#d9dde4}.adminBreadcrumb{display:flex;align-items:center;gap:7px;min-width:0;overflow:hidden}.adminBreadcrumb span{display:flex;align-items:center;gap:7px;min-width:0}.adminBreadcrumb strong{font-size:.72rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.adminBreadcrumb span:not(:last-child) strong{color:#aab2be;font-weight:600}.adminBreadcrumb i{font-style:normal;color:#66707e}.adminTopActions{display:flex;align-items:center;gap:10px;margin-left:auto}.memberSwitch{min-height:40px;display:flex;align-items:center;padding:0 12px;border-radius:9px;background:#fff;color:#10131d;font-size:.72rem;font-weight:800}.adminIdentity{min-height:42px;display:flex;align-items:center;gap:8px;padding:4px 9px 4px 5px;border:1px solid rgba(255,255,255,.16);border-radius:11px}.adminAvatar{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:#c6892a;color:#10131d;font-weight:850;background-size:cover;background-position:center}.adminIdentity>span:last-child{display:grid}.adminIdentity strong{font-size:.72rem}.adminIdentity small{font-size:.6rem;color:#aab1bc}
      .adminBody{display:grid;grid-template-columns:244px minmax(0,1fr);max-width:1600px;margin:auto;min-height:calc(100vh - 64px)}.adminNav{position:sticky;top:64px;height:calc(100vh - 64px);padding:16px 12px 24px;background:#fff;border-right:1px solid rgba(16,19,29,.09);overflow-y:auto}.adminNavGroup{display:grid;gap:3px;margin-top:18px}.adminNavGroup h2{margin:0;padding:0 10px 6px;font-size:.62rem;line-height:1.2;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:#737d8a}.adminNav a{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:9px;color:#48515e;font-size:.78rem;font-weight:650;border-left:3px solid transparent}.adminNav a:hover{background:#f2f4f7;color:#10131d}.adminNav a.active{background:#eef1f5;color:#10131d;border-left-color:#72501b;font-weight:800}.adminNav a.active span{color:#72501b}.adminOverviewLink{margin-bottom:4px}.adminContent{min-width:0}.adminContent>.section{padding-top:30px}.adminApp a:focus-visible,.adminApp button:focus-visible,.adminApp summary:focus-visible,.adminApp input:focus-visible,.adminApp select:focus-visible,.adminApp textarea:focus-visible{outline:3px solid #1e40af!important;outline-offset:3px!important}
      @media(max-width:1024px){.adminTop{height:60px;padding:0 12px;gap:10px}.adminBrand img{width:94px}.adminBrand>span{display:none}.adminBreadcrumb{max-width:40vw}.adminBody{grid-template-columns:210px minmax(0,1fr)}.adminNav{top:60px;height:calc(100vh - 60px)}.adminIdentity>span:last-child{display:none}.adminIdentity{padding:3px;border:0}}
      @media(max-width:760px){.adminBreadcrumb span:not(:last-child){display:none}.memberSwitch{font-size:.66rem;padding:0 9px}.adminBody{display:block}.adminNav{position:sticky;top:60px;z-index:70;height:auto;display:flex;gap:7px;overflow-x:auto;padding:8px 10px;border-right:0;border-bottom:1px solid rgba(16,19,29,.08);scrollbar-width:none}.adminNav::-webkit-scrollbar{display:none}.adminNavGroup{display:contents}.adminNavGroup h2{display:none}.adminNav a{flex:none;white-space:nowrap;min-height:44px;border-left:0;border-bottom:3px solid transparent}.adminNav a.active{border-left:0;border-bottom-color:#72501b}.adminNav a span{display:none}.adminContent>.section{padding-top:18px}}
      @media(max-width:480px){.adminTopActions{gap:5px}.adminIdentity{display:none}.adminBreadcrumb{max-width:32vw}.adminBrand img{width:86px}.memberSwitch{min-height:40px}}
      @media(prefers-reduced-motion:reduce){.adminApp *,.adminApp *::before,.adminApp *::after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}
    `}</style>
  </div>;
}
