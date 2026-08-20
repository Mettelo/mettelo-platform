import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminWorkspaceOverview from '@/components/AdminWorkspaceOverview';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const metadata:Metadata={title:'Platform Admin | Mettelo',description:'Manage Mettelo platform configuration and administrative access.'};
export const dynamic='force-dynamic';

export default async function AdminPlatformOverviewPage(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');
 if(user.app_metadata?.role!=='admin')redirect('/member');
 return <AdminWorkspaceOverview
  eyebrow="Admin / Platform"
  title="Platform controls"
  description="Configuration and access controls that affect Mettelo across product areas. Only operational controls are linked here; sensitive secrets remain outside browser-editable Admin surfaces."
  available={[
   {title:'Platform settings',description:'Manage shared social links, contact details and the project contribution-role catalogue.',href:'/admin/settings'},
   {title:'Admin access',description:'Grant or remove trusted administrative access. Public registration never grants Admin privileges.',href:'/admin/access'},
   {title:'Audit log',description:'Review bounded cross-platform Admin audit events without exposing sensitive payloads.',href:'/admin/system/audit'}
  ]}
  planned={[
   {title:'Authentication & SSO',description:'Expose safe provider/configuration status while keeping OAuth, Supabase and service-role secrets outside the browser.',phase:'PR 7'},
   {title:'Feature flags',description:'Govern controlled feature availability with explicit state, ownership and audit history.',phase:'PR 7'}
  ]}
 />;
}
