import {redirect} from 'next/navigation';
import AdminPlatformSettings from '@/components/AdminPlatformSettings';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export const dynamic='force-dynamic';

export default async function AdminSettingsPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');const db=serviceDb();if(!db)return <section className="section"><div className="shell"><div className="adminEmpty"><h1>Settings unavailable</h1><p>Admin data service is not configured.</p></div></div></section>;
 const [{data:settings},{data:roles}]=await Promise.all([db.from('platform_settings').select('*').order('sort_order').order('label'),db.from('project_role_catalogue').select('*').order('sort_order').order('title')]);return <section className="section softSection"><div className="shell"><AdminPlatformSettings initialSettings={settings||[]} initialRoles={roles||[]}/></div></section>
}
