import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminOpportunitySources from '@/components/AdminOpportunitySources';

export const metadata:Metadata={title:'Opportunity Sources | Mettelo Admin',description:'Manage approved Greenhouse and Lever job sources.'};
export const dynamic='force-dynamic';

type Source={id:string;provider:'greenhouse'|'lever';organisation_name:string;source_key:string;region:'global'|'eu';employer_domain:string|null;is_active:boolean;auto_publish_enabled:boolean;last_synced_at:string|null;last_sync_status:string|null;last_sync_error:string|null};

export default async function OpportunitySourcesPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;let sources:Source[]=[];
  if(url&&key){const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const result=await db.from('opportunity_ingestion_sources').select('id,provider,organisation_name,source_key,region,employer_domain,is_active,auto_publish_enabled,last_synced_at,last_sync_status,last_sync_error').order('organisation_name');if(!result.error)sources=(result.data||[]) as Source[];}
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Opportunities</div><h1>Approved job sources.</h1></div><p>Control which official ATS boards Mettelo monitors. Discovery stays separate from publication: every vacancy still passes relevance and verification rules.</p></div><div className="actions" style={{marginBottom:18}}><a className="button ghost" href="/admin">← Admin</a><a className="button ghost" href="/admin/opportunities">Review queue →</a></div><AdminOpportunitySources initialSources={sources}/></div></section>;
}
