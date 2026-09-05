import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {canonicalAdmissionMode,safeAutoStartDelayMinutes} from '@/lib/project-admission';

async function adminContext(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};return{db,user}}
function cutoff(value:unknown){if(value===null||value===''||value===undefined)return null;const parsed=new Date(String(value));return Number.isNaN(parsed.getTime())?undefined:parsed.toISOString()}
const policyFields='id,admission_mode,auto_start_delay_minutes,auto_start_paused_at,late_joining_enabled,late_joining_cutoff_at,project_sharing_enabled,member_invites_enabled';

export async function GET(request:Request){
 try{const ctx=await adminContext();if('error'in ctx)return ctx.error;const projectId=new URL(request.url).searchParams.get('project_id')?.trim()||'';if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});const {data,error}=await ctx.db.from('projects').select(policyFields).eq('id',projectId).maybeSingle();if(error||!data)return NextResponse.json({error:'Project not found.'},{status:404});return NextResponse.json({item:data})}catch(error){console.error('project admission policy read error',error);return NextResponse.json({error:'Unable to load project admission policy.'},{status:500})}
}

export async function PATCH(request:Request){
 try{
  const ctx=await adminContext();if('error'in ctx)return ctx.error;const {db,user}=ctx;const body=await request.json();const projectId=String(body.project_id||'').trim();if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
  const admissionMode=canonicalAdmissionMode(body.admission_mode);const delay=safeAutoStartDelayMinutes(body.auto_start_delay_minutes);const pause=body.auto_start_paused===true;const lateJoining=body.late_joining_enabled!==false;const sharing=body.project_sharing_enabled!==false;const invites=body.member_invites_enabled===true;const lateJoiningCutoff=cutoff(body.late_joining_cutoff_at);if(lateJoiningCutoff===undefined)return NextResponse.json({error:'Choose a valid late-joining cutoff date and time.'},{status:400});const now=new Date().toISOString();
  const {data:current,error:loadError}=await db.from('projects').select(policyFields).eq('id',projectId).maybeSingle();if(loadError||!current)return NextResponse.json({error:'Project not found.'},{status:404});
  const patch={admission_mode:admissionMode,auto_start_delay_minutes:delay,auto_start_paused_at:pause?(current.auto_start_paused_at||now):null,late_joining_enabled:lateJoining,late_joining_cutoff_at:lateJoiningCutoff,project_sharing_enabled:sharing,member_invites_enabled:invites,updated_at:now,updated_by_user_id:user.id};
  const {data,error}=await db.from('projects').update(patch).eq('id',projectId).select(policyFields).single();if(error)throw error;
  await db.from('project_activity_log').insert({project_id:projectId,event_type:'project_admission_policy_updated',actor_type:'user',actor_user_id:user.id,from_status:current.admission_mode||'review_required',to_status:admissionMode,metadata:{previous_delay_minutes:current.auto_start_delay_minutes,new_delay_minutes:delay,auto_start_paused:pause,late_joining_enabled:lateJoining,late_joining_cutoff_at:lateJoiningCutoff,project_sharing_enabled:sharing,member_invites_enabled:invites}});
  return NextResponse.json({ok:true,item:data});
 }catch(error){console.error('project admission configuration error',error);return NextResponse.json({error:'Unable to update project admission policy.'},{status:500})}
}
