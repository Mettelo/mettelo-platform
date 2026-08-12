import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import ProjectArchitectApplication from '@/components/ProjectArchitectApplication';

export const dynamic='force-dynamic';
export default async function ProjectArchitectPage(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin');
  const [{data:identity},{data:application},{data:proof}]=await Promise.all([
    supabase.from('account_identities').select('account_type,show_project_architect_designation').eq('user_id',user.id).maybeSingle(),
    supabase.from('project_architect_applications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    supabase.from('contributions').select('id,title,projects(title)').eq('user_id',user.id).eq('verification_status','verified').order('verified_at',{ascending:false})
  ]);
  const [{data:evidence},{data:credential}]=application?await Promise.all([
    supabase.from('project_architect_application_evidence').select('*').eq('application_id',application.id).order('created_at'),
    supabase.from('project_architect_credentials').select('credential_id,status,issued_at').eq('application_id',application.id).order('issued_at',{ascending:false}).limit(1).maybeSingle()
  ]):[{data:[]},{data:null}];
  return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Volunteer · Project leadership</div><h1>Become a Project Architect.</h1></div><p>Share your experience, work examples and project idea. If approved, you can help Mettelo teams shape and deliver Data &amp; AI projects while building a verified professional track record.</p></div><ProjectArchitectApplication initialApplication={application} initialEvidence={evidence||[]} proof={(proof||[]) as never[]} identity={identity||{account_type:'member',show_project_architect_designation:false}} credential={credential}/></div></section>;
}
