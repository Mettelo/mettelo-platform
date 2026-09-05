import {redirect} from 'next/navigation';
import MemberAppShell from '@/components/MemberAppShell';
import MemberPathContextSurface from '@/components/MemberPathContextSurface';
import {createServerSupabaseClient} from '@/lib/supabase/server';

function safeNext(value:unknown){return typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')?value:'/member'}

export default async function MemberLayout({children}:{children:React.ReactNode}){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(user?.user_metadata?.mettelo_identity_required===true){
    const next=safeNext(user.user_metadata?.mettelo_identity_next);
    redirect(`/auth/social-complete?next=${encodeURIComponent(next)}`);
  }
  return <MemberAppShell><MemberPathContextSurface/>{children}</MemberAppShell>;
}
