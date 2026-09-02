import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ArchitectProjectForm from '@/components/ArchitectProjectForm';
import ArchitectProjectProgress from '@/components/ArchitectProjectProgress';

export const dynamic='force-dynamic';

export default async function NewArchitectProjectPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin');
  const {data:identity}=await supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();
  if(identity?.account_type!=='project_architect'&&user.app_metadata?.role!=='admin')redirect('/member/project-architect');

  const [{data:providers},{data:capabilities}]=await Promise.all([
    supabase.from('project_resource_providers').select('id,name,website_url').eq('is_active',true).order('name',{ascending:true}),
    supabase.from('capabilities').select('id,name,capability_type,description').eq('is_active',true).order('capability_type',{ascending:true}).order('sort_order',{ascending:true}).order('name',{ascending:true})
  ]);

  return <section className="section softSection memberWorkspace">
    <div className="shell">
      <div className="sectionHead">
        <div><div className="eyebrow">Project Architect · New proposal</div><h1>Create one canonical Mettelo project.</h1></div>
        <p>Define the project once for Public Project Detail, the Member application journey and Mettelo Lab. The proposal stays private until independent review and resource governance are complete.</p>
      </div>
      <ArchitectProjectProgress/>
      <ArchitectProjectForm providers={providers||[]} capabilities={capabilities||[]}/>
    </div>
  </section>;
}
