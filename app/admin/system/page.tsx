import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminWorkspaceOverview from '@/components/AdminWorkspaceOverview';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const metadata:Metadata={title:'System Admin | Mettelo',description:'Monitor and operate Mettelo system administration workflows.'};
export const dynamic='force-dynamic';

export default async function AdminSystemOverviewPage(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');
 if(user.app_metadata?.role!=='admin')redirect('/member');
 return <AdminWorkspaceOverview
  eyebrow="Admin / System"
  title="System operations"
  description="Operational administration for audit, QA, intake and access. Health and job/error observability will appear here only after their real data sources and safe recovery boundaries are implemented."
  available={[
   {title:'Audit log',description:'Inspect bounded Admin audit events by actor, action, resource and result.',href:'/admin/system/audit'},
   {title:'QA team',description:'Open the existing Admin QA workspace and operational verification tools.',href:'/admin/qa'},
   {title:'General intake',description:'Review requests and submissions that do not belong to a dedicated operational queue.',href:'/admin/intake'},
   {title:'Admin access',description:'Manage which trusted accounts can operate the Admin console.',href:'/admin/access'}
  ]}
  planned={[
   {title:'System health',description:'Read-only service and configuration health with clear degraded/error states.',phase:'PR 8'},
   {title:'Jobs & errors',description:'Operational job status and failure summaries with safe recovery actions only where supported.',phase:'PR 8'}
  ]}
 />;
}
