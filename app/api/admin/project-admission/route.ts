import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {canonicalAdmissionMode,safeAutoStartDelayMinutes} from '@/lib/project-admission';

async function adminContext(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};return{db,user}}

export async function PATCH(request:Request){
 try{
  const ctx=await adminContext();if('error'in ctx)return ctx.error;const {db,user}=ctx;const body=await request.json();const projectId=String(body.project_id||'').trim();if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
  const admissionMode=canonicalAdmissionMode(body.admission_mode);const delay=safeAutoStartDelayMinutes(body.auto_start_delay_minutes);const pause=body.auto_start_paused===true;const now=new Date().toISOString();
  const {data:current,error:loadError}=await db.from('projects').select('id,admission_mode,auto_start_delay_minutes,auto_start_paused_at').eq('id',projectId).maybeSingle();if(loadError||!current)return NextResponse.json({error:'Project not found.'},{status:404});
  const {data,error}=await db.from('projects').update({admission_mode:admissionMode,auto_start_delay_minutes:delay,auto_start_paused_at:pause?(current.auto_start_paused_at||now):null,updated_at:now,updated_by_user_id:user.id}).eq('id',projectId).select('id,admission_mode,auto_start_delay_minutes,auto_start_paused_at').single();if(error)throw error;
  await db.from('project_activity_log').insert({project_id:projectId,event_type:'project_admission_policy_updated',actor_type:'user',actor_user_id:user.id,from_status:current.admission_mode||'review_required',to_status:admissionMode,metadata:{previous_delay_minutes:current.auto_start_delay_minutes,new_delay_minutes:delay,auto_start_paused:pause}});
  return NextResponse.json({ok:true,item:data});
 }catch(error){console.error('project admission configuration error',error);return NextResponse.json({error:'Unable to update project admission policy.'},{status:500})}
}
