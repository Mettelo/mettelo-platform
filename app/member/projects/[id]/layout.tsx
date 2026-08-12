import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';

type Membership={
  membership_status:string;
  project_run_id:string|null;
  project_runs:{status:string}|null;
};

export default async function ProjectWorkspaceGate({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
  const {id}=await params;const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/projects/${id}`)}`);const isAdmin=user.app_metadata?.role==='admin';
  const [{data:project},{data:membershipResult}]=await Promise.all([supabase.from('projects').select('id').eq('id',id).maybeSingle(),supabase.from('project_members').select('membership_status,project_run_id,project_runs(status)').eq('project_id',id).eq('user_id',user.id).maybeSingle()]);
  const membership=membershipResult as unknown as Membership|null;
  if(!project||(!membership&&!isAdmin))notFound();
  const runStatus=membership?.project_runs?.status;
  if(!isAdmin&&(!membership||!['active','completed'].includes(membership.membership_status)||!runStatus||!['active','review','completed'].includes(runStatus)))redirect('/member#applications');
  return children;
}
