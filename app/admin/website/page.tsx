import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminWorkspaceOverview from '@/components/AdminWorkspaceOverview';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const metadata:Metadata={title:'Website Admin | Mettelo',description:'Manage Mettelo public website controls from the Admin console.'};
export const dynamic='force-dynamic';

export default async function AdminWebsiteOverviewPage(){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');
 if(user.app_metadata?.role!=='admin')redirect('/member');
 return <AdminWorkspaceOverview
  eyebrow="Admin / Website"
  title="Website management"
  description="One home for Mettelo's public-facing content and configuration. This foundation exposes the controls that already work today without pretending later website controls are available before their persistence and release paths exist."
  available={[
   {title:'Social channels & contact',description:'Manage the public social links and contact email already stored in platform settings.',href:'/admin/settings',label:'Live settings'},
   {title:'News & Insights',description:'Create, edit, publish and archive editorial content, including article-level SEO fields.',href:'/admin/content/news'},
   {title:'Structured publishing',description:'Create and manage structured project, opportunity and event content.',href:'/admin/content/structured'}
  ]}
  planned={[
   {title:'Pages',description:'Homepage, About, Contact and other public-page content with draft, preview and publish.',phase:'PR 3'},
   {title:'Navigation',description:'Govern public header labels, destinations, ordering and visibility.',phase:'PR 2'},
   {title:'Footer & branding',description:'Manage footer structure, logos, brand assets and public social presentation.',phase:'PR 2'},
   {title:'SEO',description:'Global and per-page metadata, canonical controls, social previews and indexing settings.',phase:'PR 5'},
   {title:'Media',description:'A governed shared media library with metadata, alt text and safe asset use.',phase:'PR 6'}
  ]}
 />;
}
