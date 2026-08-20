import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminWorkspaceOverview from '@/components/AdminWorkspaceOverview';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';

export const metadata:Metadata={title:'Platform Admin | Mettelo',description:'Manage Mettelo platform configuration and administrative access.'};
export const dynamic='force-dynamic';

export default async function AdminPlatformOverviewPage(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');
 if(user.app_metadata?.role!=='admin')redirect('/member');
 const available=[];
 if(hasAdminCapability(user,'platform.settings.manage'))available.push(
  {title:'Platform settings',description:'Manage shared social links, contact details and the project contribution-role catalogue.',href:'/admin/settings'},
  {title:'Authentication & SSO status',description:'Review read-only authentication configuration and public Google/GitHub provider availability without exposing secrets.',href:'/admin/platform/auth',label:'Read only'}
 );
 if(hasAdminCapability(user,'admin.access.manage'))available.push({title:'Admin access',description:'Grant, revoke and scope trusted administrative access through the canonical capability model.',href:'/admin/access'});
 if(hasAdminCapability(user,'system.audit.read'))available.push({title:'Audit log',description:'Review bounded cross-platform Admin audit events without exposing sensitive payloads.',href:'/admin/system/audit'});
 return <AdminWorkspaceOverview
  eyebrow="Admin / Platform"
  title="Platform controls"
  description="Configuration and access controls that affect Mettelo across product areas. Only controls assigned to your Admin capabilities are linked here; sensitive secrets remain outside browser-editable Admin surfaces."
  available={available}
  planned={[
   {title:'Feature flags',description:'No governed runtime flag consumers are currently registered. Flag controls will only be exposed after a product surface consumes a defined, audited flag contract.',phase:'Requires runtime consumer'}
  ]}
 />;
}
