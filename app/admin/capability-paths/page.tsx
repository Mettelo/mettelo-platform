import {redirect} from 'next/navigation';
import AdminCapabilityPathsManager from '@/components/AdminCapabilityPathsManager';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export const dynamic='force-dynamic';

export default async function AdminCapabilityPathsPage({searchParams}:{searchParams:Promise<{path?:string}>}){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin');
  if(user.app_metadata?.role!=='admin')redirect('/member');
  const query=await searchParams;
  return <section className="section softSection"><div className="shell"><AdminCapabilityPathsManager initialPathId={String(query.path||'')}/></div></section>;
}
