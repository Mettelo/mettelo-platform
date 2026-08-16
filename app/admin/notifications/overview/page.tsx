import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSectionTabs from '@/components/AdminSectionTabs';
import AdminCommunicationOverviewPanel from '@/components/AdminCommunicationOverviewPanel';

export const dynamic='force-dynamic';
export default async function CommunicationOverviewPage(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/signin');
  if(user.app_metadata?.role!=='admin')redirect('/member');
  const db=serviceDb();
  let templates:{send_mode:string}[]=[];
  let deliveries:{status:string;created_at:string;last_error:string|null}[]=[];
  if(db){
    const [t,d]=await Promise.all([
      db.from('communication_templates').select('send_mode').eq('active',true),
      db.from('email_outbox').select('status,created_at,last_error').gte('created_at',new Date(Date.now()-86400000).toISOString()).order('created_at',{ascending:false}).limit(1000)
    ]);
    templates=t.data||[];
    deliveries=d.data||[];
  }
  return <section className="section softSection"><div className="shell"><AdminSectionTabs label="Communication sections" tabs={[{label:'Overview',href:'/admin/notifications/overview'},{label:'Templates',href:'/admin/notifications/templates'},{label:'Delivery Queue',href:'/admin/notifications/delivery'},{label:'Event Catalogue',href:'/admin/notifications/events'}]}/><AdminCommunicationOverviewPanel templates={templates} deliveries={deliveries}/></div></section>;
}
