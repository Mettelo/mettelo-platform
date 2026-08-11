import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSpotlightReview from '@/components/AdminSpotlightReview';

export const dynamic='force-dynamic';

type Row={id:string;user_id:string;title:string;category:string;summary:string|null;award_month:string|null;score:number|null;score_breakdown:Record<string,number>|null;status:string;is_excluded:boolean;exclusion_reason:string|null;profiles:{full_name:string|null;headline:string|null}|{full_name:string|null;headline:string|null}[]|null};

export default async function AdminSpotlightsPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const db=serviceDb();let items:{id:string;name:string;headline:string|null;title:string;category:string;summary:string|null;award_month:string|null;score:number|null;score_breakdown:Record<string,number>|null;status:string;is_excluded:boolean;exclusion_reason:string|null}[]=[];
  if(db){const {data}=await db.from('spotlights').select('id,user_id,title,category,summary,award_month,score,score_breakdown,status,is_excluded,exclusion_reason,profiles(full_name,headline)').order('award_month',{ascending:false}).order('rank_position',{ascending:true}).limit(36);items=((data||[]) as unknown as Row[]).map(row=>{const profile=Array.isArray(row.profiles)?row.profiles[0]:row.profiles;return {id:row.id,name:profile?.full_name||'Mettelo member',headline:profile?.headline||null,title:row.title,category:row.category,summary:row.summary,award_month:row.award_month,score:row.score,score_breakdown:row.score_breakdown,status:row.status,is_excluded:row.is_excluded,exclusion_reason:row.exclusion_reason};});}
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Admin · Spotlight</div><h1>Review monthly recognition before it becomes public.</h1></div><p>Automatic scoring creates drafts only. Admin review is required before all three monthly awards publish.</p></div><AdminSpotlightReview initialItems={items}/></div></section>;
}
