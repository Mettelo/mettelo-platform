import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {WEBSITE_CMS_PAGES} from '@/lib/website-pages-cms';
import AdminWebsitePageHistory from '@/components/AdminWebsitePageHistory';

export const metadata:Metadata={title:'Page revision history | Mettelo Admin',description:'Review and restore immutable public-page revisions.'};
export const dynamic='force-dynamic';

export default async function AdminWebsitePageHistoryPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/member');
 const pages=WEBSITE_CMS_PAGES.map(item=>({key:item.key,label:item.label,path:item.path,fields:item.fields}));
 return <section className="section"><div className="shell"><AdminWebsitePageHistory pages={pages}/></div></section>;
}
