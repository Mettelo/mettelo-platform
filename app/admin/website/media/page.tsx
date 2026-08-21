import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminWebsiteMediaLibrary from '@/components/AdminWebsiteMediaLibrary';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';

export const metadata:Metadata={title:'Website Media | Mettelo Admin',description:'Manage governed public Website images and accessibility metadata.'};
export const dynamic='force-dynamic';

export default async function AdminWebsiteMediaPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'website.content.edit'))redirect('/member');
 return <section className="section"><div className="shell"><AdminWebsiteMediaLibrary/></div></section>;
}
