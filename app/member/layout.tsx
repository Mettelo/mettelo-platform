import {redirect} from 'next/navigation';
import MemberAppShell from '@/components/MemberAppShell';
import MemberPathContextSurface from '@/components/MemberPathContextSurface';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export default async function MemberLayout({children}:{children:React.ReactNode}){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(user?.user_metadata?.mettelo_identity_required===true){
    redirect('/auth/social-complete?next=%2Fmember');
  }
  return <MemberAppShell><MemberPathContextSurface/>{children}</MemberAppShell>;
}
