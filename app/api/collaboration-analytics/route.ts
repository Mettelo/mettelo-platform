import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const PUBLIC_EVENTS=new Set(['opportunity_viewed','share_linkedin','share_x','share_whatsapp','share_copy','share_native']);
function clean(value:unknown,max=80){return String(value??'').trim().slice(0,max)}

export async function POST(request:Request){
 try{const body=await request.json();const eventType=clean(body.event_type,40),needId=clean(body.collaboration_need_id,80);if(!PUBLIC_EVENTS.has(eventType)||!needId)return NextResponse.json({error:'Invalid collaboration analytics event.'},{status:400});const db=serviceDb();if(!db)return NextResponse.json({ok:true},{status:202});const {data:need}=await db.from('project_collaboration_needs').select('id,project_id').eq('id',needId).maybeSingle();if(!need)return NextResponse.json({error:'Collaboration opportunity not found.'},{status:404});const {data:project}=await db.from('projects').select('visibility').eq('id',need.project_id).maybeSingle();if(project?.visibility!=='public')return NextResponse.json({error:'Public collaboration opportunity not found.'},{status:404});const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();const {error}=await db.rpc('phase18_record_collaboration_analytics',{p_event_type:eventType,p_collaboration_need_id:needId,p_surface:'public_opportunity',p_actor_user_id:user?.id||null});if(error)throw error;return NextResponse.json({ok:true},{status:202,headers:{'Cache-Control':'no-store'}})}catch(error){console.error('collaboration analytics record failed',error);return NextResponse.json({ok:true},{status:202})}
}
