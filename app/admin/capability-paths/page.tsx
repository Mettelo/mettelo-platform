import {redirect} from 'next/navigation';
import AdminCapabilityPathsManager from '@/components/AdminCapabilityPathsManager';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export default async function AdminCapabilityPathsPage(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin');
  if(user.app_metadata?.role!=='admin')redirect('/member');
  return <section className="section softSection"><div className="shell"><AdminCapabilityPathsManager/></div></section>;
}
