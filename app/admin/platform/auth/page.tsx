import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import AdminPlatformAuthStatus from '@/components/AdminPlatformAuthStatus';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {getPlatformAuthStatus} from '@/lib/platform-auth-status';

export const metadata:Metadata={title:'Authentication & SSO | Mettelo Admin',description:'Read-only Mettelo authentication configuration and provider status.'};
export const dynamic='force-dynamic';

export default async function AdminPlatformAuthPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'platform.settings.manage'))redirect('/admin');
 const status=await getPlatformAuthStatus();
 return <section className="section softSection"><div className="shell"><AdminPlatformAuthStatus status={status}/></div></section>;
}
