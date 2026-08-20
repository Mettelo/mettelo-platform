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
  description="Manage Mettelo's public-facing navigation, footer, social/contact details and brand presentation from one governed Admin workspace. Draftable controls stay separate from published public configuration until an authorized Admin publishes them."
  available={[
   {title:'Navigation',description:'Manage public header and mobile-menu labels, destinations, visibility and ordering with draft → publish control.',href:'/admin/website/navigation',label:'Draft & publish'},
   {title:'Footer & social',description:'Manage footer copy, columns and links alongside the existing public social channels and contact email.',href:'/admin/website/footer',label:'Connected'},
   {title:'Branding',description:'Manage the public site name and header/footer logo sources with safe current-brand fallbacks.',href:'/admin/website/branding',label:'Draft & publish'},
   {title:'News & Insights',description:'Create, edit, publish and archive editorial content, including article-level SEO fields.',href:'/admin/content/news'},
   {title:'Structured publishing',description:'Create and manage structured project, opportunity and event content.',href:'/admin/content/structured'},
   {title:'Platform settings',description:'Manage contribution-role configuration and the canonical platform settings workspace.',href:'/admin/settings'}
  ]}
  planned={[
   {title:'Pages',description:'Homepage, About, Contact and other public-page content with draft, preview and publish.',phase:'PR 3'},
   {title:'SEO',description:'Global and per-page metadata, canonical controls, social previews and indexing settings.',phase:'PR 5'},
   {title:'Media',description:'A governed shared media library with metadata, alt text and safe asset use.',phase:'PR 6'}
  ]}
 />;
}
