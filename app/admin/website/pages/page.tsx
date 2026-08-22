import {redirect} from 'next/navigation';
import AdminWebsitePagesEditor from '@/components/AdminWebsitePagesEditor';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {WEBSITE_CMS_PAGES,defaultWebsiteCmsPagePayload,validateWebsiteCmsPagePayload} from '@/lib/website-pages-cms';

export const dynamic='force-dynamic';

export default async function AdminWebsitePagesPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/admin');
 const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Website pages unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const keys=WEBSITE_CMS_PAGES.map(item=>item.key);
 const [{data:drafts,error:draftError},{data:published,error:publishedError}]=await Promise.all([
  db.from('website_page_drafts').select('page_key,payload,updated_at').in('page_key',keys),
  db.from('website_page_public').select('page_key,payload,published_at').in('page_key',keys)
 ]);
 if(draftError||publishedError)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Website pages unavailable</h1><p>Unable to load the Website page content service.</p></div></div></section>;
 const pageConfigs=WEBSITE_CMS_PAGES.map(definition=>{
  const draftRow=(drafts||[]).find(row=>row.page_key===definition.key);const publishedRow=(published||[]).find(row=>row.page_key===definition.key);const fallback=defaultWebsiteCmsPagePayload(definition.key);
  const draftValidated=draftRow?validateWebsiteCmsPagePayload(definition.key,draftRow.payload):null;const publishedValidated=publishedRow?validateWebsiteCmsPagePayload(definition.key,publishedRow.payload):null;
  return{...definition,draft:draftValidated?.ok?draftValidated.payload:fallback,published:publishedValidated?.ok?publishedValidated.payload:fallback,draftUpdatedAt:draftRow?.updated_at||null,publishedAt:publishedRow?.published_at||null};
 });
 return <section className="section softSection"><div className="shell adminWebsitePagesShell"><AdminWebsitePagesEditor pages={pageConfigs}/></div></section>;
}
