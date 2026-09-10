import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ArchitectProjectForm from '@/components/ArchitectProjectForm';
import ArchitectProjectProgress from '@/components/ArchitectProjectProgress';

export const dynamic='force-dynamic';

export default async function NewAdminProjectPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin');
  if(user.app_metadata?.role!=='admin')redirect('/member');

  const [{data:providers},{data:capabilities}]=await Promise.all([
    supabase.from('project_resource_providers').select('id,name,website_url').eq('is_active',true).order('name',{ascending:true}),
    supabase.from('capabilities').select('id,name,capability_type,description').eq('is_active',true).order('capability_type',{ascending:true}).order('sort_order',{ascending:true}).order('name',{ascending:true})
  ]);

  return <section className="section softSection">
    <div className="shell">
      <div className="sectionHead">
        <div><div className="eyebrow">Admin / Projects / Create</div><h1>Create one canonical Mettelo project.</h1></div>
        <p>Use the same governed project definition that powers Public Projects, Member Discover, admission, Lab and later collaboration. The project remains a private draft until publication requirements pass.</p>
      </div>
      <ArchitectProjectProgress/>
      <ArchitectProjectForm providers={providers||[]} capabilities={capabilities||[]}/>
    </div>
  </section>;
}
