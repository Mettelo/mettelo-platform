import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import SpotlightConsentPanel,{type SpotlightMemberItem} from '@/components/SpotlightConsentPanel';

export const dynamic='force-dynamic';
function siteUrl(){return (process.env.NEXT_PUBLIC_SITE_URL?.trim()||'https://mettelo.com').replace(/\/$/,'');}

type Row={id:string;title:string;category:string;summary:string|null;award_month:string|null;status:string;consent_status:string;selected_at:string|null;published_at:string|null;publication_held:boolean;primary_project_id:string|null};

export default async function MemberSpotlightDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/signin?next=${encodeURIComponent(`/member/spotlight/${id}`)}`);
  const [{data:profile},{data,error}]=await Promise.all([
    supabase.from('profiles').select('full_name,headline').eq('id',user.id).maybeSingle(),
    supabase.from('spotlights').select('id,title,category,summary,award_month,status,consent_status,selected_at,published_at,publication_held,primary_project_id').eq('id',id).eq('user_id',user.id).eq('is_excluded',false).maybeSingle()
  ]);
  if(error||!data)notFound();const row=data as Row;
  const {data:links}=await supabase.from('spotlight_evidence').select('source_label,project_id,is_primary').eq('spotlight_id',id).order('is_primary',{ascending:false});
  let projectTitle:string|null=null;
  if(row.primary_project_id){const {data:project}=await supabase.from('projects').select('title').eq('id',row.primary_project_id).maybeSingle();projectTitle=project?.title||null;}
  const item:SpotlightMemberItem={id:row.id,title:row.title,category:row.category,summary:row.summary,awardMonth:row.award_month,status:row.status,consentStatus:row.consent_status,selectedAt:row.selected_at,publishedAt:row.published_at,publicationHeld:row.publication_held,projectTitle,evidenceTitles:(links||[]).map(link=>link.source_label),publicUrl:row.status==='published'&&row.consent_status==='granted'&&!row.publication_held?`${siteUrl()}/spotlight/${row.id}`:null};
  const name=profile?.full_name?.trim()||'Mettelo member';const headline=profile?.headline?.trim()||null;
  return <section className="memberSpotlightDetailPage" aria-labelledby="spotlight-detail-title"><Link className="memberSpotlightBack" href="/member/spotlight">← Back to Spotlight</Link><div className="memberSpotlightDetailHead"><div className="eyebrow">YOUR SPOTLIGHT · RECOGNITION DETAIL</div><h1 id="spotlight-detail-title">Your recognition record</h1><p>Review the evidence behind this award and control whether your personal recognition is public.</p></div><SpotlightConsentPanel initialItems={[item]} publicationName={name} publicationHeadline={headline} detail/><style>{`.memberSpotlightDetailPage{display:grid;gap:20px;padding:18px 0 38px}.memberSpotlightBack{display:inline-flex;width:max-content;min-height:44px;align-items:center;font-weight:760}.memberSpotlightDetailHead h1{margin:7px 0 8px;font-size:clamp(2.35rem,5vw,4rem);line-height:1;letter-spacing:-.04em}.memberSpotlightDetailHead p{max-width:720px;margin:0;color:#596473;line-height:1.65}.memberSpotlightDetailPage :focus-visible{outline:3px solid rgba(198,137,42,.38);outline-offset:3px}`}</style></section>;
}
