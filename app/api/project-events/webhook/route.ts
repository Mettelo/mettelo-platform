import {NextResponse} from 'next/server';
import {WebhookReceiver} from 'livekit-server-sdk';
import {serviceDb} from '@/lib/project-flow';

export async function POST(request:Request){
 const key=process.env.LIVEKIT_API_KEY,secret=process.env.LIVEKIT_API_SECRET,auth=request.headers.get('authorization');if(!key||!secret||!auth)return NextResponse.json({error:'Webhook authentication unavailable.'},{status:401});
 try{
  const body=await request.text(),event=await new WebhookReceiver(key,secret).receive(body,auth),db=serviceDb();if(!db)return NextResponse.json({error:'Attendance service unavailable.'},{status:503});const room=event.room?.name,identity=event.participant?.identity;if(!room||!identity)return NextResponse.json({ok:true});
  const {data:projectEvent}=await db.from('project_meetings').select('id,project_run_id').eq('provider_room_name',room).maybeSingle();if(!projectEvent)return NextResponse.json({ok:true});const occurredAt=Number(event.createdAt||Math.floor(Date.now()/1000));
  if(event.event==='participant_joined')await db.from('project_event_attendance').insert({event_id:projectEvent.id,project_run_id:projectEvent.project_run_id,user_id:identity,provider_participant_id:event.participant?.sid,joined_at:new Date(occurredAt*1000).toISOString()});
  if(event.event==='participant_left'){const leftAt=new Date(occurredAt*1000);const {data:attendance}=await db.from('project_event_attendance').select('id,joined_at').eq('event_id',projectEvent.id).eq('user_id',identity).is('left_at',null).order('joined_at',{ascending:false}).limit(1).maybeSingle();if(attendance)await db.from('project_event_attendance').update({left_at:leftAt.toISOString(),duration_seconds:Math.max(0,Math.floor((leftAt.getTime()-new Date(attendance.joined_at).getTime())/1000))}).eq('id',attendance.id)}
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({error:'Invalid webhook.'},{status:401})}
}
