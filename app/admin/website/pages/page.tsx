import {redirect} from 'next/navigation';
import AdminWebsitePagesEditor from '@/components/AdminWebsitePagesEditor';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {defaultWebsitePagePayload,validateWebsitePagePayload,WEBSITE_PAGE_FIELDS,WEBSITE_PAGE_LABELS,type WebsitePageKey} from '@/lib/website-pages';

export const dynamic='force-dynamic';
const PAGES:WebsitePageKey[]=['home','about','contact'];
const PATHS:Record<WebsitePageKey,string>={home:'/',about:'/about',contact:'/contact'};

export default async function AdminWebsitePagesPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/admin');
 const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Website pages unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const [{data:drafts,error:draftError},{data:published,error:publishedError}]=await Promise.all([
  db.from('website_page_drafts').select('page_key,payload,updated_at').in('page_key',PAGES),
  db.from('website_page_public').select('page_key,payload,published_at').in('page_key',PAGES)
 ]);
 if(draftError||publishedError)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Website pages unavailable</h1><p>Unable to load the Website page content service.</p></div></div></section>;
 const pageConfigs=PAGES.map(key=>{
  const draftRow=(drafts||[]).find(row=>row.page_key===key);const publishedRow=(published||[]).find(row=>row.page_key===key);const fallback=defaultWebsitePagePayload(key);
  const draftValidated=draftRow?validateWebsitePagePayload(key,draftRow.payload):null;const publishedValidated=publishedRow?validateWebsitePagePayload(key,publishedRow.payload):null;
  return{key,label:WEBSITE_PAGE_LABELS[key],path:PATHS[key],fields:WEBSITE_PAGE_FIELDS[key],draft:draftValidated?.ok?draftValidated.payload:fallback,published:publishedValidated?.ok?publishedValidated.payload:fallback,publishedAt:publishedRow?.published_at||null};
 });
 return <section className="section softSection"><div className="shell"><AdminWebsitePagesEditor pages={pageConfigs}/></div></section>;
}
