import {redirect} from 'next/navigation';
import AdminCapabilityPathImport from '@/components/AdminCapabilityPathImport';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export default async function CapabilityPathImportPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  return <section className="section softSection"><div className="shell"><AdminCapabilityPathImport/></div></section>;
}
