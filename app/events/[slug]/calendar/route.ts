import {createPublicSupabaseClient} from '@/lib/supabase/public';

export const dynamic='force-dynamic';
function icsText(value:string|null|undefined){return String(value||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function icsDate(value:string){return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const db=createPublicSupabaseClient();if(!db)return new Response('Calendar unavailable.',{status:503});
 const {data:event}=await db.from('events').select('id,slug,title,summary,description,starts_at,ends_at,delivery_mode,location_label,registration_url,status').eq('slug',slug).in('status',['published','registration_closed','completed']).maybeSingle();
 if(!event)return new Response('Event not found.',{status:404});
 const end=event.ends_at||new Date(new Date(event.starts_at).getTime()+60*60*1000).toISOString();const site=`https://mettelo.com/events/${event.slug}`;const description=[event.summary||event.description||'Mettelo event',event.registration_url?`Registration: ${event.registration_url}`:'',`Event details: ${site}`].filter(Boolean).join('\n\n');
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mettelo//Public Events//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',`UID:${event.id}@mettelo.com`,`DTSTAMP:${icsDate(new Date().toISOString())}`,`DTSTART:${icsDate(event.starts_at)}`,`DTEND:${icsDate(end)}`,`SUMMARY:${icsText(event.title)}`,`DESCRIPTION:${icsText(description)}`,`LOCATION:${icsText(event.location_label||event.delivery_mode||'Online')}`,`URL:${site}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
 return new Response(ics,{headers:{'content-type':'text/calendar; charset=utf-8','content-disposition':`attachment; filename="${event.slug}.ics"`,'cache-control':'public, max-age=300'}});
}
