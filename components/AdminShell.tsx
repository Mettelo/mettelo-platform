'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type AdminAccount={name:string;avatarUrl:string|null}|null;
const nav=[['Overview','/admin'],['Applications','/admin/applications'],['Careers','/admin/careers'],['Project operations','/admin/project-operations'],['Team formation','/admin/team-formation'],['Events','/admin/events'],['Content & Insights','/admin/content'],['Proof review','/admin/proof'],['Spotlight & awards','/admin/spotlights'],['Notifications & email','/admin/notifications'],['QA team','/admin/qa'],['Opportunity review','/admin/opportunities'],['Job sources','/admin/opportunity-sources'],['Intake','/admin/intake'],['Admin access','/admin/access']] as const;
function sectionLabel(pathname:string){const match=nav.find(([,href])=>href==='/admin'?pathname==='/admin':pathname===href||pathname.startsWith(`${href}/`));return match?.[0]||'Workspace'}

export default function AdminShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();const [account,setAccount]=useState<AdminAccount>(null);
  useEffect(()=>{const supabase=createClient();let active=true;async function load(){const {data:{user}}=await supabase.auth.getUser();if(!active||!user)return;let name=(typeof user.user_metadata?.full_name==='string'&&user.user_metadata.full_name.trim())||user.email?.split('@')[0]||'Admin';let avatarUrl:string|null=null;const {data:profile}=await supabase.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();if(profile?.full_name?.trim())name=profile.full_name.trim();if(profile?.avatar_url)avatarUrl=profile.avatar_url;if(active)setAccount({name,avatarUrl})}void load();return()=>{active=false}},[]);
  const activeHref=(href:string)=>href==='/admin'?pathname==='/admin':pathname===href||pathname.startsWith(`${href}/`);
  return <div className="adminApp">
    <header className="adminTop"><Link className="adminBrand" href="/admin" aria-label="Mettelo Admin"><Image src="/mettelo-logo-light.svg" alt="Mettelo" width={1630} height={370} unoptimized priority/><span>Admin</span></Link><div className="adminBreadcrumb"><small>METTELO ADMIN</small><strong>{sectionLabel(pathname)}</strong></div><div className="adminTopActions"><Link className="memberSwitch" href="/member">Switch to Member</Link><div className="adminIdentity"><span className="adminAvatar" style={account?.avatarUrl?{backgroundImage:`url(${account.avatarUrl})`}:undefined}>{account?.avatarUrl?'':(account?.name?.[0]||'A').toUpperCase()}</span><span><strong>{account?.name?.split(' ')[0]||'Admin'}</strong><small>Admin access</small></span></div></div></header>
    <div className="adminBody"><aside className="adminNav"><small>ADMIN WORKSPACE</small>{nav.map(([label,href])=><Link className={activeHref(href)?'active':''} aria-current={activeHref(href)?'page':undefined} key={href} href={href}>{label}<span>→</span></Link>)}</aside><main className="adminContent">{children}</main></div>
    <style jsx global>{`
      body:has(.adminApp)>.topbar,body:has(.adminApp)>.siteHeader,body:has(.adminApp)>footer{display:none!important}
      body:has(.adminApp)>#main-content{min-height:100vh;background:#f6f7f9}
      .adminApp{min-height:100vh;background:#f6f7f9;color:#10131d;overflow-x:clip}
      .adminTop{position:sticky;top:0;z-index:95;height:60px;display:flex;align-items:center;gap:18px;padding:0 20px;background:#10131d;color:#fff;border-bottom:1px solid rgba(255,255,255,.08)}
      .adminBrand{display:flex;align-items:center;gap:10px;color:#fff;flex:none}.adminBrand img{width:104px;height:auto}.adminBrand>span{padding-left:10px;border-left:1px solid rgba(255,255,255,.18);font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#d9dde4}
      .adminBreadcrumb{display:grid;gap:1px;min-width:0}.adminBreadcrumb small{font-size:.54rem;letter-spacing:.11em;color:#9ea6b2;font-weight:800}.adminBreadcrumb strong{font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .adminTopActions{display:flex;align-items:center;gap:10px;margin-left:auto}.memberSwitch{min-height:38px;display:flex;align-items:center;padding:0 12px;border-radius:9px;background:#fff;color:#10131d;font-size:.72rem;font-weight:800}
      .adminIdentity{min-height:42px;display:flex;align-items:center;gap:8px;padding:4px 9px 4px 5px;border:1px solid rgba(255,255,255,.16);border-radius:11px}.adminAvatar{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;background:#c6892a;color:#10131d;font-weight:850;background-size:cover;background-position:center}.adminIdentity>span:last-child{display:grid}.adminIdentity strong{font-size:.72rem}.adminIdentity small{font-size:.6rem;color:#aab1bc}
      .adminBody{display:grid;grid-template-columns:230px minmax(0,1fr);max-width:1500px;margin:auto;min-height:calc(100vh - 60px)}
      .adminNav{position:sticky;top:60px;height:calc(100vh - 60px);padding:22px 14px;background:#fff;border-right:1px solid rgba(16,19,29,.09);display:flex;flex-direction:column;gap:4px;overflow-y:auto}.adminNav>small{padding:0 10px 10px;font-size:10px;font-weight:800;letter-spacing:.1em;color:#8c95a1}.adminNav a{display:flex;justify-content:space-between;gap:12px;padding:10px;border-radius:9px;color:#4f5865;font-size:13px;font-weight:650}.adminNav a:hover{background:#f2f4f7;color:#10131d}.adminNav a.active{background:#10131d;color:#fff}.adminNav a.active span{color:#e8bd65}.adminContent{min-width:0}.adminContent>.section{padding-top:34px}
      @media(max-width:900px){.adminTop{height:58px;padding:0 12px;gap:10px}.adminBrand img{width:94px}.adminBrand>span{display:none}.adminBreadcrumb small{display:none}.adminBreadcrumb strong{font-size:.72rem}.memberSwitch{padding:0 9px;font-size:.65rem}.adminIdentity>span:last-child{display:none}.adminIdentity{padding:3px;border:0}.adminBody{display:block;min-height:calc(100vh - 58px)}.adminNav{position:sticky;top:58px;z-index:70;height:auto;display:flex;flex-direction:row;overflow-x:auto;overflow-y:hidden;padding:9px 10px;border-right:0;border-bottom:1px solid rgba(16,19,29,.08);scrollbar-width:none}.adminNav::-webkit-scrollbar{display:none}.adminNav>small{display:none}.adminNav a{white-space:nowrap;min-height:40px;align-items:center}.adminNav a span{display:none}.adminContent>.section{padding-top:20px}}
      @media(max-width:430px){.adminTopActions{gap:5px}.memberSwitch{min-height:36px}.adminBreadcrumb{max-width:105px}.adminIdentity{min-height:36px}.adminAvatar{width:30px;height:30px}}
    `}</style>
  </div>;
}
