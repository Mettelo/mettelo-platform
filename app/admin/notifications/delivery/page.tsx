import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {hasAdminCapability} from '@/lib/admin-capabilities';
import AdminSectionTabs from '@/components/AdminSectionTabs';
import AdminNotificationOps,{type DeliveryQueueItem} from '@/components/AdminNotificationOps';

export const dynamic='force-dynamic';
type Raw=Omit<DeliveryQueueItem,'email_delivery_attempts'>&{email_delivery_attempts:DeliveryQueueItem['email_delivery_attempts']|null};

export default async function CommunicationDeliveryPage(){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(!hasAdminCapability(user,'communications.manage'))redirect('/admin');
 const db=serviceDb();let items:DeliveryQueueItem[]=[];
 if(db){const {data}=await db.from('email_outbox').select('id,recipient_email,template_key,subject,payload,status,attempts,max_attempts,last_error,provider_message_id,created_at,sent_at,next_attempt_at,dead_letter_at,email_delivery_attempts(attempt_number,status,error_message,http_status,provider_message_id,attempted_at)').order('created_at',{ascending:false}).order('attempted_at',{referencedTable:'email_delivery_attempts',ascending:false}).limit(1000);items=((data||[]) as unknown as Raw[]).map(item=>({...item,email_delivery_attempts:item.email_delivery_attempts||undefined}));}
 const counts={queued:items.filter(i=>['queued','sending','retrying'].includes(i.status)).length,sent:items.filter(i=>i.status==='sent').length,failed:items.filter(i=>['failed','dead_letter'].includes(i.status)).length};
 return <section className="section softSection"><div className="shell"><AdminSectionTabs label="Communication sections" tabs={[{label:'Overview',href:'/admin/notifications/overview'},{label:'Templates',href:'/admin/notifications/templates'},{label:'Delivery Queue',href:'/admin/notifications/delivery'},{label:'Event Catalogue',href:'/admin/notifications/events'}]}/><div className="adminPageHeader"><div><div className="eyebrow">Admin / Content &amp; Comms / Communications / Delivery Queue</div><h1>Transactional email delivery</h1><p>Monitor queued, delivered and failed communications without scrolling through template configuration.</p></div></div><div className="metricGrid" style={{marginBottom:18}}><div className="metric"><strong>{counts.queued}</strong><span>Queued / retrying</span></div><div className="metric"><strong>{counts.sent}</strong><span>Sent</span></div><div className="metric"><strong>{counts.failed}</strong><span>Failed / dead-letter</span></div></div><AdminNotificationOps initialItems={items}/></div></section>;
}
