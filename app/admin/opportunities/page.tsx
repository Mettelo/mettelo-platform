import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminOpportunityReviewQueue from '@/components/AdminOpportunityReviewQueue';

export const metadata:Metadata={title:'Opportunity Review · Mettelo Admin'};
export const dynamic='force-dynamic';

type ReviewItem={id:string;title:string;organisation:string|null;location:string|null;role_family:string|null;data_ai_relevance_score:number|null;data_ai_relevance_status:string;verification_score:number|null;verification_status:string;verification_reasons:string[];source_type:string|null;source_url:string|null;official_application_url:string|null;eligibility_status:string;sponsorship_status:string;suspicion_score:number;updated_at:string};

export default async function OpportunityReviewPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;let items:ReviewItem[]=[];let total=0;let published=0;
  if(url&&key){const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const [queue,countAll,countPublished]=await Promise.all([db.from('opportunities').select('id,title,organisation,location,role_family,data_ai_relevance_score,data_ai_relevance_status,verification_score,verification_status,verification_reasons,source_type,source_url,official_application_url,eligibility_status,sponsorship_status,suspicion_score,updated_at').eq('review_required',true).neq('verification_status','rejected').order('updated_at',{ascending:false}).limit(100),db.from('opportunities').select('id',{count:'exact',head:true}),db.from('opportunities').select('id',{count:'exact',head:true}).eq('status','published')]);items=(queue.data||[]) as ReviewItem[];total=countAll.count||0;published=countPublished.count||0;}
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Opportunities</div><h1>Review only what automation cannot safely decide.</h1></div><p>High-confidence Data & AI opportunities can publish automatically. Ambiguous roles, weak source evidence, unclear eligibility and suspicious signals stop here for human review.</p></div><div className="metricGrid"><div className="metric"><strong>{items.length}</strong><span>Needs review</span></div><div className="metric"><strong>{published}</strong><span>Published</span></div><div className="metric"><strong>{Math.max(total-published-items.length,0)}</strong><span>Draft / rejected</span></div></div><div className="actions"><a className="button ghost" href="/admin">← Admin overview</a><a className="button ghost" href="/opportunities">Public opportunities →</a></div><section className="panel" style={{marginTop:18}}><div className="panelHead"><div><span className="cardNumber">HUMAN REVIEW QUEUE</span><h3 style={{marginTop:8}}>Approve, reject or recheck</h3></div><span className="chip">{items.length} WAITING</span></div><AdminOpportunityReviewQueue initialItems={items}/></section></div></section>;
}
