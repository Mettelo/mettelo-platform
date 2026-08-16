import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminSectionTabs from '@/components/AdminSectionTabs';
import AdminEventCatalogueTable,{type NotificationCatalogueItem} from '@/components/AdminEventCatalogueTable';

export const dynamic='force-dynamic';
export default async function CommunicationEventsPage(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');const db=serviceDb();const {data}=db?await db.from('notification_event_catalogue').select('event_key,product_area,description,default_channel,urgency,action_required,active').order('product_area').order('event_key'):{data:[]};return <section className="section softSection"><div className="shell"><AdminSectionTabs label="Communication sections" tabs={[{label:'Overview',href:'/admin/notifications/overview'},{label:'Templates',href:'/admin/notifications/templates'},{label:'Delivery Queue',href:'/admin/notifications/delivery'},{label:'Event Catalogue',href:'/admin/notifications/events'}]}/><div className="adminPageHeader"><div><div className="eyebrow">Admin / Content &amp; Comms / Communications / Event Catalogue</div><h1>Platform notification rules</h1><p>Read-only reference for canonical product events, channels and priority. Custom event creation is intentionally not exposed.</p></div></div><AdminEventCatalogueTable items={(data||[]) as NotificationCatalogueItem[]}/></div></section>}
