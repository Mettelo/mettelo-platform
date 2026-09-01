import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import MemberProfileSection from '@/components/MemberProfileSection';
import ProfileReturnAfterSave from '@/components/ProfileReturnAfterSave';

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
  return <section className="profileWorkspace memberWorkspace"><ProfileReturnAfterSave/><div className="profileWorkspaceWrap"><header className="profilePageHeader"><div className="profilePageHeading"><div className="eyebrow">My profile</div><h1>Build your professional profile.</h1></div><p>Add your experience, skills, interests and availability so Mettelo can understand your professional context and help connect you with relevant project work. Your profile describes your background; Mettelo Proof separately shows evidence from project contributions that have completed review.</p></header><aside className="profilePurpose" role="note" aria-label="How your profile is used"><div><span className="profilePurposeIndex" aria-hidden="true">01</span><div><strong>Better project matches</strong><span>Skills and interests help Mettelo surface more relevant work.</span></div></div><div><span className="profilePurposeIndex" aria-hidden="true">02</span><div><strong>Faster applications</strong><span>A complete profile means less information to repeat when you apply.</span></div></div><div><span className="profilePurposeIndex" aria-hidden="true">03</span><div><strong>Build on demonstrated work</strong><span>Connect your Profile with Mettelo Proof as your responsibility and leadership grow.</span></div></div></aside><MemberProfileSection userId={user.id} profile={profile} domains={domains} tools={tools} domainPreferences={domainPreferences} toolPreferences={toolPreferences}/></div><style>{`
    .profileWorkspace{min-width:0;background:#f5f6f3;padding:28px 0 56px;color:#171b24}
    .profileWorkspaceWrap{width:min(100%,1240px);margin:0;padding:0 0 40px;min-width:0}
    .profilePageHeader{display:grid;grid-template-columns:minmax(0,.72fr) minmax(360px,.9fr);gap:48px;align-items:end;margin:0 0 18px;min-width:0}
    .profilePageHeading{min-width:0}
    .profilePageHeader .eyebrow{margin-bottom:9px}
    .profilePageHeader h1{max-width:520px;margin:0;font:790 clamp(2.15rem,4.2vw,3.5rem)/1.02 var(--font-space),Inter,sans-serif;letter-spacing:-.045em;overflow-wrap:break-word}
    .profilePageHeader>p{max-width:620px;margin:0;color:#5d6678;font-size:.91rem;line-height:1.62;overflow-wrap:break-word}
    .profilePurpose{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 18px;min-width:0}
    .profilePurpose>div{display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;align-items:start;min-height:108px;padding:16px 17px;border:1px solid #e7e1d6;border-radius:14px;background:#fcfbf7;box-shadow:0 1px 0 rgba(16,19,29,.025);min-width:0}
    .profilePurposeIndex{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:#f7efdd;color:#8b5a17;font:750 .67rem var(--font-plex-mono),ui-monospace,monospace;letter-spacing:.06em}
    .profilePurpose>div>div{display:grid;gap:6px;min-width:0}
    .profilePurpose strong{color:#10131d;font:720 .84rem/1.35 var(--font-space),Inter,sans-serif;letter-spacing:-.01em}
    .profilePurpose span:not(.profilePurposeIndex){color:#5b6472;font-size:.76rem;line-height:1.5;overflow-wrap:break-word}
    .profileWorkspace .profileIdentityCard{margin-top:0}
    @media(max-width:1100px){
      .profilePageHeader{grid-template-columns:1fr;gap:10px;align-items:start}
      .profilePageHeader h1{max-width:700px}
      .profilePageHeader>p{max-width:760px}
      .profilePurpose{grid-template-columns:repeat(3,minmax(0,1fr))}
      .profilePurpose>div{grid-template-columns:1fr;gap:10px;min-height:0}
    }
    @media(max-width:760px){
      .profileWorkspace{padding:18px 0 32px}
      .profileWorkspaceWrap{padding-bottom:20px}
      .profilePageHeader{margin-bottom:14px}
      .profilePageHeader h1{font-size:clamp(1.75rem,9vw,2.35rem);line-height:1.08}
      .profilePageHeader>p{font-size:.84rem;line-height:1.55}
      .profilePurpose{grid-template-columns:1fr;gap:8px;margin-bottom:14px}
      .profilePurpose>div{grid-template-columns:38px minmax(0,1fr);padding:13px 14px}
    }
  `}</style></section>;
}
