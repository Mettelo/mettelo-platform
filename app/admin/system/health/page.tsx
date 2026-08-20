import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import {getAdminSystemHealth} from '@/lib/admin-system-health';
import AdminSystemHealth from '@/components/AdminSystemHealth';

export const metadata:Metadata={title:'System Health Admin | Mettelo',description:'Read-only aggregate operational health for Mettelo Admin.'};
export const dynamic='force-dynamic';

export default async function AdminSystemHealthPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'system.audit.read'))redirect('/admin');
 const health=await getAdminSystemHealth();
 return <section className="section softSection"><div className="shell"><AdminSystemHealth initialHealth={health} canManageDelivery={hasAdminCapability(user,'communications.manage')}/></div></section>;
}
