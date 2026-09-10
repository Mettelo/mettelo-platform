import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

function clean(value:unknown,max=80){return String(value??'').trim().slice(0,max)}

export async function POST(request:Request){
 try{
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const body=await request.json();const needId=clean(body.collaboration_need_id);if(!needId)return NextResponse.json({error:'Collaboration opportunity is required.'},{status:400});
  const {data:need,error:needError}=await supabase.from('project_collaboration_needs').select('id,project_id,project_run_id,status').eq('id',needId).maybeSingle();if(needError||!need)return NextResponse.json({error:'Collaboration opportunity not found.'},{status:404});
  const {error}=await supabase.from('project_collaboration_recommendation_dismissals').upsert({user_id:user.id,collaboration_need_id:needId,dismissed_at:new Date().toISOString()},{onConflict:'user_id,collaboration_need_id'});if(error)return NextResponse.json({error:'Unable to dismiss this recommendation.'},{status:500});
  const db=serviceDb();if(db)await db.rpc('phase18_record_collaboration_analytics',{p_event_type:'recommendation_dismissed',p_collaboration_need_id:needId,p_surface:'member_home',p_actor_user_id:user.id});
  return NextResponse.json({ok:true,message:'Recommendation dismissed. This does not affect your eligibility or future project applications.'},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('collaboration recommendation dismissal failed',error);return NextResponse.json({error:'Unable to dismiss this recommendation.'},{status:500})}
}

export async function PATCH(request:Request){
 try{
  const supabase=await createServerSupabaseClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const body=await request.json();const enabled=body.enabled===true;
  const {error}=await supabase.rpc('phase18_set_collaboration_recommendations',{p_enabled:enabled});if(error)return NextResponse.json({error:'Unable to save collaboration recommendation preference.'},{status:500});
  return NextResponse.json({ok:true,enabled,message:enabled?'Collaboration recommendations enabled.':'Collaboration recommendations hidden. You can still browse Find a Team and apply normally.'},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('collaboration recommendation preference failed',error);return NextResponse.json({error:'Unable to save collaboration recommendation preference.'},{status:500})}
}
