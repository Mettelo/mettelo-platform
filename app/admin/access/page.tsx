import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import AdminAccessManager from '@/components/AdminAccessManager';

export const metadata:Metadata={title:'Admin Access | Mettelo',description:'Govern Mettelo Admin accounts and capability access.'};
export const dynamic='force-dynamic';

export default async function AdminAccessPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'admin.access.manage'))redirect('/member');
 return <section className="section softSection"><div className="shell"><AdminAccessManager/></div></section>;
}
