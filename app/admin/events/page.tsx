import {redirect} from 'next/navigation';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import AdminEventsManager from '@/components/AdminEventsManager';

export const dynamic='force-dynamic';
type EventRow={id:string;slug:string;title:string;event_type:string;summary:string|null;description:string|null;starts_at:string;ends_at:string|null;timezone:string;delivery_mode:string;location_label:string|null;host_name:string|null;speaker_names:string[];featured_image:string|null;featured_image_alt:string|null;capacity:number|null;registration_url:string|null;registration_platform:string|null;registration_label:string|null;registration_required:boolean;seo_title:string|null;seo_description:string|null;replay_url:string|null;status:string;published_at:string|null;updated_at:string};

export default async function AdminEventsPage(){
  const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)redirect('/signin');if(user.app_metadata?.role!=='admin')redirect('/member');
  const db=serviceDb();let events:EventRow[]=[];if(db){const {data}=await db.from('events').select('id,slug,title,event_type,summary,description,starts_at,ends_at,timezone,delivery_mode,location_label,host_name,speaker_names,featured_image,featured_image_alt,capacity,registration_url,registration_platform,registration_label,registration_required,seo_title,seo_description,replay_url,status,published_at,updated_at').order('starts_at',{ascending:false});events=(data||[]) as EventRow[];}
  return <section className="section softSection"><div className="shell"><div className="sectionHead"><div><div className="eyebrow">Mettelo Admin · Events</div><h1>Run the event lifecycle from one workspace.</h1></div><p>Create drafts, publish confirmed sessions, close registration, cancel, complete and archive events without inventing registration or attendance data.</p></div><AdminEventsManager initialEvents={events}/></div></section>;
}
