import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';

export default async function ProjectWorkspaceGate({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
  const {id}=await params;const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}`)}`);const isAdmin=user.app_metadata?.role==='admin';
  const [{data:project},{data:membership}]=await Promise.all([supabase.from('projects').select('id,status').eq('id',id).maybeSingle(),supabase.from('project_members').select('membership_status').eq('project_id',id).eq('user_id',user.id).maybeSingle()]);
  if(!project||(!membership&&!isAdmin))notFound();
  if(!isAdmin&&(!membership||!['active','completed'].includes(membership.membership_status)||!['active','review','completed'].includes(project.status)))redirect('/member#applications');
  return children;
}
