import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ArchitectCatalogueClassificationPanel from '@/components/ArchitectCatalogueClassificationPanel';
import ArchitectProjectEditForm from '@/components/ArchitectProjectEditForm';
import ArchitectProjectParticipationPanel from '@/components/ArchitectProjectParticipationPanel';

export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};

export default async function EditArchitectProjectPage({params}:Context){
 const {id}=await params;
 const supabase=await createServerSupabaseClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/architect-projects/${id}/edit`)}`);
 const {data:identity}=await supabase.from('account_identities').select('account_type').eq('user_id',user.id).maybeSingle();
 if(identity?.account_type!=='project_architect'&&user.app_metadata?.role!=='admin')redirect('/member/project-architect');
 const [{data:providers},{data:capabilities}]=await Promise.all([
  supabase.from('project_resource_providers').select('id,name,website_url').eq('is_active',true).order('name'),
  supabase.from('capabilities').select('id,name,capability_type,description').eq('is_active',true).order('capability_type').order('sort_order').order('name')
 ]);
 return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Project Architect · Edit canonical draft</div><h1>Update the project without breaking its history.</h1></div><p>Changes write back to the same project definition. Reviewed resource evidence, stable child IDs, governed catalogue classification and downstream Public → Member → Lab relationships are protected.</p></div><ArchitectProjectParticipationPanel projectId={id}/><ArchitectCatalogueClassificationPanel projectId={id}/><ArchitectProjectEditForm projectId={id} providers={providers||[]} capabilityCatalogue={capabilities||[]}/></div></section>;
}
