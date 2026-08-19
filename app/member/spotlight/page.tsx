import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import SpotlightConsentPanel,{type SpotlightMemberItem} from '@/components/SpotlightConsentPanel';

export const dynamic='force-dynamic';
function siteUrl(){return (process.env.NEXT_PUBLIC_SITE_URL?.trim()||'https://mettelo.com').replace(/\/$/,'');}

type SpotlightRow={id:string;title:string;category:string;summary:string|null;award_month:string|null;status:string;consent_status:string;selected_at:string|null;published_at:string|null;publication_held:boolean;primary_project_id:string|null};
type EvidenceRow={spotlight_id:string;source_label:string;project_id:string|null;is_primary:boolean};

export default async function MemberSpotlightPage(){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect('/signin?next=/member/spotlight');

  const [{data:profile},{data,error}]=await Promise.all([
    supabase.from('profiles').select('full_name,headline').eq('id',user.id).maybeSingle(),
    supabase.from('spotlights').select('id,title,category,summary,award_month,status,consent_status,selected_at,published_at,publication_held,primary_project_id').eq('user_id',user.id).eq('is_excluded',false).in('status',['draft','published','archived']).order('award_month',{ascending:false}).order('selected_at',{ascending:false}).limit(36)
  ]);

  if(error)return <section className="memberSpotlightPage"><div className="memberSpotlightHero"><div><div className="eyebrow">REPUTATION · VERIFIED RECOGNITION</div><h1>Spotlight</h1><p>Recognition earned through evidence-backed Mettelo contribution.</p></div></div><div className="panel emptyState" role="status"><h2>We couldn’t load your Spotlight.</h2><p>Your recognition state has not been replaced with a guessed empty state. Reload this page to try again.</p><Link className="button dark" href="/member/spotlight">Retry →</Link></div></section>;

  const rows=(data||[]) as SpotlightRow[];
  const ids=rows.map(item=>item.id);
  let evidence:EvidenceRow[]=[];
  if(ids.length){const result=await supabase.from('spotlight_evidence').select('spotlight_id,source_label,project_id,is_primary').in('spotlight_id',ids).order('is_primary',{ascending:false});if(!result.error)evidence=(result.data||[]) as EvidenceRow[];}
  const projectIds=[...new Set(rows.map(item=>item.primary_project_id).filter(Boolean) as string[])];
  const projectMap=new Map<string,string>();
  if(projectIds.length){const {data:projects}=await supabase.from('projects').select('id,title').in('id',projectIds);for(const project of projects||[])projectMap.set(project.id,project.title);}
  const base=siteUrl();
  const items:SpotlightMemberItem[]=rows.map(item=>({
    id:item.id,title:item.title,category:item.category,summary:item.summary,awardMonth:item.award_month,status:item.status,consentStatus:item.consent_status,selectedAt:item.selected_at,publishedAt:item.published_at,publicationHeld:item.publication_held,
    projectTitle:item.primary_project_id?projectMap.get(item.primary_project_id)||null:null,
    evidenceTitles:evidence.filter(link=>link.spotlight_id===item.id).map(link=>link.source_label),
    publicUrl:item.status==='published'&&item.consent_status==='granted'&&!item.publication_held?`${base}/spotlight/${item.id}`:null
  }));
  const name=profile?.full_name?.trim()||'Mettelo member';
  const headline=profile?.headline?.trim()||null;

  return <section className="memberSpotlightPage" aria-labelledby="member-spotlight-title">
    <div className="memberSpotlightHero"><div><div className="eyebrow">REPUTATION · VERIFIED RECOGNITION</div><h1 id="member-spotlight-title">Spotlight</h1><p>Your evidence-backed recognition from real Mettelo contribution. Mettelo selects qualifying awards automatically; you decide whether your personal recognition becomes public.</p></div><div className="memberSpotlightHeroActions"><Link className="button ghost" href="/member/proof">View Proof →</Link><Link className="button dark" href="/spotlight">Public Spotlight →</Link></div></div>
    <SpotlightConsentPanel initialItems={items} publicationName={name} publicationHeadline={headline}/>
    <aside className="memberSpotlightPrinciple"><div><p className="cardNumber">HOW SPOTLIGHT WORKS</p><h2>System selects. Admin safeguards. You consent.</h2></div><p>You do not nominate yourself and Admin does not routinely pick winners. Verified contribution is required for automatic recognition. Admin can only govern exceptions, and no personally identifying Spotlight is public without your permission.</p></aside>
    <style>{`
      .memberSpotlightPage{display:grid;gap:24px;padding:4px 0 36px}.memberSpotlightHero{display:flex;justify-content:space-between;gap:30px;align-items:end;padding:28px 0 8px;border-bottom:1px solid #e7e1d6}.memberSpotlightHero h1{margin:7px 0 8px;font-size:clamp(2.6rem,5vw,4.6rem);line-height:1;letter-spacing:-.045em}.memberSpotlightHero p{max-width:780px;margin:0;color:#596473;line-height:1.65}.memberSpotlightHeroActions{display:flex;gap:8px;flex:0 0 auto}.memberSpotlightPrinciple{display:grid;grid-template-columns:minmax(240px,.7fr) minmax(0,1.3fr);gap:24px;padding:22px;border:1px solid #ddd6ca;border-radius:18px;background:#fbf7ee}.memberSpotlightPrinciple h2{margin:6px 0 0;font-size:1.35rem}.memberSpotlightPrinciple>p{margin:0;line-height:1.65}.memberSpotlightPage :focus-visible{outline:3px solid #173f8f;outline-offset:3px}
      @media(max-width:1024px){.memberSpotlightHero{display:grid;align-items:start}.memberSpotlightHeroActions{flex-wrap:wrap}.memberSpotlightPrinciple{grid-template-columns:1fr}}
      @media(max-width:480px){.memberSpotlightHero{padding-top:18px}.memberSpotlightHeroActions{display:grid;grid-template-columns:1fr;width:100%}.memberSpotlightHeroActions .button{width:100%;min-height:44px}.memberSpotlightPage{gap:18px}.memberSpotlightPrinciple{padding:18px}}
    `}</style>
  </section>;
}
