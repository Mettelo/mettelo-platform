import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberProfileSection from '@/components/MemberProfileSection';

export const dynamic='force-dynamic';
type TaxonomyItem={slug:string;name:string};
type PrefRow<T>={domains?:T|null;tools?:T|null};
export default async function ProfilePage(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin');
  const [profileResult,domainsResult,toolsResult,domainPrefsResult,toolPrefsResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),supabase.from('domains').select('slug,name').eq('is_active',true).order('sort_order'),supabase.from('tools').select('slug,name').eq('is_active',true).order('sort_order'),supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id)
  ]);
  const profile=profileResult.data||{full_name:user.user_metadata?.full_name||'',headline:'',bio:'',location:'',professional_area:'',primary_goal:'',linkedin_url:'',github_url:'',portfolio_url:'',avatar_url:null,skills:[],preferred_roles:[],languages:[],is_public:false,current_job_title:'',organisation:'',experience_level:'',employment_status:'',project_availability:'',weekly_capacity:''};
  const domains=(domainsResult.data||[]) as TaxonomyItem[];const tools=(toolsResult.data||[]) as TaxonomyItem[];
  const domainPreferences=((domainPrefsResult.data||[]) as unknown as PrefRow<TaxonomyItem>[]).map(row=>row.domains?.slug).filter((v):v is string=>Boolean(v));const toolPreferences=((toolPrefsResult.data||[]) as unknown as PrefRow<TaxonomyItem>[]).map(row=>row.tools?.slug).filter((v):v is string=>Boolean(v));
  return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Identity · Profile</div><h1>Your professional identity on Mettelo.</h1></div><p>This profile supports project matching, collaboration, People discovery and the context behind your verified Proof.</p></div><MemberProfileSection profile={profile} domains={domains} tools={tools} domainPreferences={domainPreferences} toolPreferences={toolPreferences}/></div></section>;
}
