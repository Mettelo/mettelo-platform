import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import SpotlightConsentPanel from '@/components/SpotlightConsentPanel';

export const dynamic='force-dynamic';
type Item={id:string;title:string;category:string;summary:string|null;award_month:string|null;status:string;consent_status:string};

export default async function MemberSpotlightPage(){
 const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/signin?next=/member/spotlight');
 const {data}=await supabase.from('spotlights').select('id,title,category,summary,award_month,status,consent_status').eq('user_id',user.id).in('status',['draft','published','archived']).order('award_month',{ascending:false}).limit(24);
 const items=(data||[]) as Item[];
 return <section className="section softSection memberWorkspace"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">My reputation · Spotlight</div><h1>Review recognition before it becomes public.</h1></div><p>Mettelo can select evidence-backed monthly recognition, but publication requires your explicit permission. You can decline without affecting your account or withdraw consent later.</p></div><SpotlightConsentPanel initialItems={items}/></div></section>;
}
