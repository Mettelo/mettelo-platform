import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import AdminWebsiteSeoEditor from '@/components/AdminWebsiteSeoEditor';

export const metadata:Metadata={title:'Website SEO | Mettelo Admin',description:'Manage governed Mettelo search and social metadata.'};
export const dynamic='force-dynamic';

export default async function AdminWebsiteSeoPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/member');
 return <section className="section"><div className="shell"><AdminWebsiteSeoEditor/></div></section>;
}
