import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

async function context(projectId:string){
 const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
 const db=serviceDb();if(!db)return{error:NextResponse.json({error:'Project service is not configured.'},{status:503})};
 const [{data:project,error:projectError},{data:membership}]=await Promise.all([
  db.from('projects').select('id,title,visibility,status,applications_open,project_sharing_enabled,member_invites_enabled,late_joining_enabled,late_joining_cutoff_at,max_team_size,target_team_size,team_size_threshold').eq('id',projectId).maybeSingle(),
  db.from('project_members').select('id,project_run_id,membership_status').eq('project_id',projectId).eq('user_id',user.id).in('membership_status',['waiting','active']).order('joined_at',{ascending:false}).limit(1).maybeSingle()
 ]);
 if(projectError||!project)return{error:NextResponse.json({error:'Project not found.'},{status:404})};
 if(!membership&&user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Active project membership is required.'},{status:403})};
 let run:{id:string;status:string;recruitment_open:boolean;filled:number;maximum:number}|null=null;
 if(membership?.project_run_id){const {data:runRow}=await db.from('project_runs').select('id,status,recruitment_open').eq('id',membership.project_run_id).maybeSingle();if(runRow){const {count}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',runRow.id).in('membership_status',['waiting','active']);const maximum=Math.max(1,Number(project.max_team_size||project.target_team_size||project.team_size_threshold||1));run={id:runRow.id,status:runRow.status,recruitment_open:runRow.recruitment_open!==false,filled:count||0,maximum}}}
 const cutoffOpen=!project.late_joining_cutoff_at||new Date(project.late_joining_cutoff_at).getTime()>Date.now();const capacityOpen=!run||run.filled<run.maximum;const lateJoiningOpen=project.late_joining_enabled!==false&&cutoffOpen&&capacityOpen&&(!run||run.recruitment_open);
 const canShare=project.project_sharing_enabled!==false&&project.visibility==='public'&&project.applications_open!==false&&lateJoiningOpen;
 const inviteReady=project.member_invites_enabled===true&&lateJoiningOpen;
 return{db,user,project,membership,run,canShare,inviteReady,lateJoiningOpen};
}

export async function GET(request:Request){
 const projectId=new URL(request.url).searchParams.get('project_id')?.trim()||'';if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});const ctx=await context(projectId);if('error'in ctx)return ctx.error;
 return NextResponse.json({project_id:projectId,public_path:`/projects/${projectId}`,can_share:ctx.canShare,invite_ready:ctx.inviteReady,late_joining_open:ctx.lateJoiningOpen,run_status:ctx.run?.status||null,filled:ctx.run?.filled||0,maximum:ctx.run?.maximum||null});
}

export async function POST(request:Request){
 try{const body=await request.json();const projectId=String(body.project_id||'').trim();const action=String(body.action||'').trim();if(!projectId||!['share','invite_intent'].includes(action))return NextResponse.json({error:'Choose a valid recruitment action.'},{status:400});const ctx=await context(projectId);if('error'in ctx)return ctx.error;
  if(action==='share'){
   if(!ctx.canShare)return NextResponse.json({error:'Project sharing is not available while recruitment is closed.'},{status:409});
   await ctx.db.from('project_activity_log').insert({project_id:projectId,project_run_id:ctx.membership?.project_run_id||null,event_type:'project_shared',actor_type:'user',actor_user_id:ctx.user.id,from_status:ctx.run?.status||ctx.project.status,to_status:ctx.run?.status||ctx.project.status,metadata:{channel:String(body.channel||'copy').slice(0,40),public_path:`/projects/${projectId}`}});
   return NextResponse.json({ok:true,public_path:`/projects/${projectId}`});
  }
  if(!ctx.inviteReady)return NextResponse.json({error:'Member invitations are not currently available for this project.'},{status:409});
  await ctx.db.from('project_activity_log').insert({project_id:projectId,project_run_id:ctx.membership?.project_run_id||null,event_type:'collaborator_invite_intent',actor_type:'user',actor_user_id:ctx.user.id,from_status:ctx.run?.status||ctx.project.status,to_status:ctx.run?.status||ctx.project.status,metadata:{phase:'phase6_hook',membership_created:false}});
  return NextResponse.json({ok:true,invite_ready:true,message:'Invitation policy is ready. The canonical member invitation workflow will collect and validate the invitee before any membership is created.'});
 }catch(error){console.error('project recruitment action failed',error);return NextResponse.json({error:'Unable to complete this recruitment action.'},{status:500})}
}
