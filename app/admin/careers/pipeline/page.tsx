import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSectionTabs from '@/components/AdminSectionTabs';
import AdminCareerPipelineBoard,{type CareerPipelineRow} from '@/components/AdminCareerPipelineBoard';

export const dynamic='force-dynamic';
export default async function AdminCareerPipelinePage(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin');
  if(user.app_metadata?.role!=='admin')redirect('/member');
  const db=serviceDb();
  const {data}=db?await db.from('career_applications').select('id,full_name,email,status,final_outcome,offer_status,submitted_at,career_roles(title)').order('submitted_at',{ascending:false}).limit(500):{data:[]};
  const rows=(data||[]) as unknown as CareerPipelineRow[];
  return <section className="section softSection"><div className="shell"><AdminSectionTabs label="Career sections" tabs={[{label:'Roles',href:'/admin/careers/roles'},{label:'Candidates',href:'/admin/careers/applications'},{label:'Pipeline overview',href:'/admin/careers/pipeline'}]}/><div className="adminPageHeader"><div><div className="eyebrow">Admin / Recruiting / Careers / Pipeline</div><h1>Pipeline overview</h1><p>Four recruitment stages, with final outcomes and formal offers tracked separately inside Interview &amp; Final Decision.</p></div></div><AdminCareerPipelineBoard rows={rows}/></div></section>;
}
