import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {WEBSITE_PAGE_FIELDS,WEBSITE_PAGE_LABELS,type WebsitePageKey} from '@/lib/website-pages';
import AdminWebsitePageHistory from '@/components/AdminWebsitePageHistory';

export const metadata:Metadata={title:'Page revision history | Mettelo Admin',description:'Review and restore immutable public-page revisions.'};
export const dynamic='force-dynamic';

export default async function AdminWebsitePageHistoryPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/member');
 const pages=(Object.keys(WEBSITE_PAGE_LABELS) as WebsitePageKey[]).map(key=>({key,label:WEBSITE_PAGE_LABELS[key],fields:WEBSITE_PAGE_FIELDS[key]}));
 return <section className="section"><div className="shell"><AdminWebsitePageHistory pages={pages}/></div></section>;
}
