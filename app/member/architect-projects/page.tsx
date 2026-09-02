import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ArchitectProjectsHub from '@/components/ArchitectProjectsHub';
import ArchitectManagedOperations from '@/components/ArchitectManagedOperations';
import ArchitectProjectReadinessOverview from '@/components/ArchitectProjectReadinessOverview';
import ArchitectResourceGovernancePanel from '@/components/ArchitectResourceGovernancePanel';
import ArchitectDraftEditShortcuts from '@/components/ArchitectDraftEditShortcuts';

export const dynamic='force-dynamic';
export default async function ArchitectProjectsPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin');
  const {data:identity}=await supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();
  if(identity?.account_type!=='project_architect'&&user.app_metadata?.role!=='admin')redirect('/member/project-architect');
  const isAdmin=user.app_metadata?.role==='admin';
  return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Project Architect · Governed work</div><h1>Shape, review and guide projects.</h1></div><p>Each proposal starts privately, receives an independent review and keeps a permanent decision trail. Canonical readiness is visible before submission so incomplete project definitions do not quietly reach members.</p></div><ArchitectProjectReadinessOverview/><ArchitectDraftEditShortcuts isAdmin={isAdmin}/>{isAdmin&&<ArchitectResourceGovernancePanel/>}<ArchitectProjectsHub/><ArchitectManagedOperations/></div></section>;
}
