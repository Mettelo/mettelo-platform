import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminWorkspaceOverview from '@/components/AdminWorkspaceOverview';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';

export const metadata:Metadata={title:'System Admin | Mettelo',description:'Monitor and operate Mettelo system administration workflows.'};
export const dynamic='force-dynamic';

export default async function AdminSystemOverviewPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
 const available=[
  ...(hasAdminCapability(user,'system.audit.read')?[{title:'System health',description:'Review aggregate Admin-audit and transactional-delivery evidence with explicit Unknown states.',href:'/admin/system/health'},{title:'Audit log',description:'Inspect bounded Admin audit events by actor, action, resource and result.',href:'/admin/system/audit'}]:[]),
  ...(hasAdminCapability(user,'communications.manage')?[{title:'Delivery operations',description:'Inspect transactional email attempt history and use governed manual retry where appropriate.',href:'/admin/notifications/delivery'}]:[]),
  {title:'QA team',description:'Open the existing Admin QA workspace and operational verification tools.',href:'/admin/qa'},
  {title:'General intake',description:'Review requests and submissions that do not belong to a dedicated operational queue.',href:'/admin/intake'},
  ...(hasAdminCapability(user,'admin.access.manage')?[{title:'Admin access',description:'Manage which trusted accounts can operate the Admin console.',href:'/admin/access'}]:[])
 ];
 return <AdminWorkspaceOverview eyebrow="Admin / System" title="System operations" description="Evidence-backed operational administration for audit, delivery, QA and intake. Health summaries expose aggregate operational state only; detailed sensitive records stay in their existing governed workspaces." available={available} planned={[{title:'General background-job telemetry',description:'Add only when Mettelo has a canonical job registry with trustworthy status, ownership and safe recovery semantics.',phase:'Future'}]}/>;
}
