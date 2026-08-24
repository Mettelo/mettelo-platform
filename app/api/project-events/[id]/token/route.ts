import {NextResponse} from 'next/server';
import {AccessToken} from 'livekit-server-sdk';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

function failure(eventId:string,status:number,code:string,error:string){
 return NextResponse.json({error,code,eventId,stage:'token' as const},{status});
}

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return failure(id,401,'AUTH_REQUIRED','Sign in to join this event.');
 const db=serviceDb();
 if(!db)return failure(id,503,'SERVICE_UNAVAILABLE','Project event service is unavailable.');

 const {data:event}=await db.from('project_meetings').select('id,project_id,project_run_id,title,starts_at,ends_at,status,provider_room_name').eq('id',id).maybeSingle();
 if(!event)return failure(id,404,'EVENT_NOT_FOUND','Event not found.');
 if(event.status==='cancelled')return failure(id,410,'EVENT_CANCELLED','This event was cancelled.');

 const [{data:membership},{data:participant},{data:registration}]=await Promise.all([
  db.from('project_members').select('team_role').eq('project_run_id',event.project_run_id).eq('user_id',user.id).in('membership_status',['active','completed']).maybeSingle(),
  db.from('project_event_participants').select('event_role').eq('event_id',id).eq('user_id',user.id).maybeSingle(),
  db.from('project_event_registrations').select('event_role,status').eq('event_id',id).eq('user_id',user.id).eq('status','reserved').maybeSingle()
 ]);
 const isAdmin=user.app_metadata?.role==='admin';
 if(!membership&&!participant&&!registration&&!isAdmin)return failure(id,403,'NO_PERMISSION','You do not have permission to join this event.');

 const now=Date.now();
 const starts=new Date(event.starts_at).getTime();
 const ends=event.ends_at?new Date(event.ends_at).getTime():starts+2*60*60*1000;
 if(now<starts-15*60*1000)return failure(id,425,'TOO_EARLY','The room opens 15 minutes before the event starts.');
 if(now>ends+30*60*1000)return failure(id,410,'SESSION_ENDED','This room has closed.');

 const url=process.env.LIVEKIT_URL;
 const key=process.env.LIVEKIT_API_KEY;
 const secret=process.env.LIVEKIT_API_SECRET;
 if(!url||!key||!secret)return failure(id,503,'PROVIDER_NOT_CONFIGURED','Live video is awaiting provider configuration.');

 const role=participant?.event_role||registration?.event_role||membership?.team_role||(isAdmin?'admin':'observer');
 const canPublish=!['observer'].includes(role);
 try{
  const token=new AccessToken(key,secret,{identity:user.id,name:user.user_metadata?.full_name||user.email||'Mettelo member',ttl:'10m',metadata:JSON.stringify({eventId:id,projectId:event.project_id,projectRunId:event.project_run_id,role})});
  token.addGrant({roomJoin:true,room:event.provider_room_name||`mettelo-${id}`,canPublish,canSubscribe:true,canPublishData:canPublish,roomAdmin:isAdmin||membership?.team_role==='project_lead'});
  return NextResponse.json({token:await token.toJwt(),url,event:{id:event.id,title:event.title},role});
 }catch{
  return failure(id,502,'TOKEN_ISSUE_FAILED','Unable to prepare secure room access.');
 }
}
