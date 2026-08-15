import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import OnboardingFlow from '@/components/OnboardingFlow';

export const dynamic='force-dynamic';
type TaxonomyItem={slug:string;name:string};
type PrefRow<T>={domains?:T|null;tools?:T|null};

export default async function OnboardingPage(){
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin?next=%2Fonboarding');
  const [profileResult,domainsResult,toolsResult,domainPrefsResult,toolPrefsResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',user.id).single(),
    supabase.from('domains').select('slug,name').eq('is_active',true).order('sort_order'),
    supabase.from('tools').select('slug,name').eq('is_active',true).order('sort_order'),
    supabase.from('profile_domain_preferences').select('domains(slug,name)').eq('user_id',user.id),
    supabase.from('profile_tool_preferences').select('tools(slug,name)').eq('user_id',user.id)
  ]);
  const profile=profileResult.data||{full_name:user.user_metadata?.full_name||'',headline:'',bio:'',location:'',professional_area:'',primary_goal:'',linkedin_url:'',github_url:'',portfolio_url:'',avatar_url:null,skills:[],preferred_roles:[],languages:[],is_public:false,current_job_title:'',organisation:'',experience_level:'',employment_status:'',project_availability:'',weekly_capacity:'',onboarding_step:0,onboarding_completed_at:null};
  if(profile.onboarding_completed_at)redirect('/member');
  const domains=(domainsResult.data||[]) as TaxonomyItem[];const tools=(toolsResult.data||[]) as TaxonomyItem[];
  const domainPreferences=((domainPrefsResult.data||[]) as unknown as PrefRow<TaxonomyItem>[]).map(row=>row.domains?.slug).filter((v):v is string=>Boolean(v));
  const toolPreferences=((toolPrefsResult.data||[]) as unknown as PrefRow<TaxonomyItem>[]).map(row=>row.tools?.slug).filter((v):v is string=>Boolean(v));
  return <OnboardingFlow initialProfile={profile} initialStep={Math.max(0,Math.min(4,Number(profile.onboarding_step||0)))} domains={domains} tools={tools} domainPreferences={domainPreferences} toolPreferences={toolPreferences}/>;
}
