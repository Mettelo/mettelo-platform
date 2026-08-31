import Link from 'next/link';
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
  return <section className="section softSection"><div className="shell"><div style={{display:'flex',justifyContent:'flex-end',marginBottom:12}}><Link className="button ghost" href="/admin/capability-paths/import">Controlled workbook import →</Link></div><AdminCapabilityPathsManager initialPathId={String(query.path||'')}/></div></section>;
}
