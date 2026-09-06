import {NextResponse} from 'next/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';
import {startProjectRun} from '@/lib/project-start-service';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null;}

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Project lifecycle service is not configured.'},{status:503});
  try{
    const now=new Date().toISOString();
    const [{data:projects,error:formationError},{data:dueRuns,error:dueError}]=await Promise.all([
      db.from('projects').select('id,title').eq('status','forming').not('forming_deadline','is',null).lte('forming_deadline',now),
      db.from('project_runs').select('id,project_id,run_number,required_team_size,scheduled_start_at').eq('has_started',false).eq('status','forming').not('scheduled_start_at','is',null).lte('scheduled_start_at',now).order('scheduled_start_at',{ascending:true}).limit(100)
    ]);if(formationError)throw formationError;if(dueError)throw dueError;
    let cancelled=0;let notified=0;let started=0;let paused=0;let deferred=0;let failed=0;

    for(const project of projects||[]){
      const {data:members}=await db.from('project_members').select('user_id').eq('project_id',project.id).eq('membership_status','waiting');
      const reason='The project did not reach its team-size threshold before the formation deadline.';
      await db.from('projects').update({status:'cancelled',cancelled_at:now,cancellation_reason:reason,updated_at:now}).eq('id',project.id).eq('status','forming');
      await db.from('project_members').update({membership_status:'removed',left_at:now}).eq('project_id',project.id).eq('membership_status','waiting');
      await db.from('project_applications').update({status:'declined',decision_at:now,decision_reason:reason,updated_at:now}).eq('project_id',project.id).in('status',['approved','waiting_for_team','accepted']);
      await Promise.allSettled((members||[]).map(async member=>{notified++;return notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId:project.id,type:'project_formation_expired',title:'Project did not form in time',body:`${project.title} did not reach the required team size before its formation deadline. Your approved place has been released.`,actionUrl:'/member#applications',subject:`Project formation update — ${project.title}`});}));
      cancelled++;
    }

    for(const run of dueRuns||[]){
      try{
        const {count}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',run.id).in('membership_status',['waiting','active']);const required=Math.max(1,Number(run.required_team_size||1));
        if((count||0)<required){await db.from('project_runs').update({scheduled_start_at:null,start_scheduled_at:null,auto_start_failure:null,updated_at:now}).eq('id',run.id).eq('has_started',false);await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_start_schedule_cancelled',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{reason:'below_minimum_at_start_time',filled:count||0,required_team_size:required}});deferred++;continue;}
        const result=await startProjectRun({db,projectId:run.project_id,runId:run.id,source:'auto_scheduler'});if(result.started){started++;continue}if(result.paused){paused++;continue}if(result.notReady){await db.from('project_runs').update({auto_start_failure:`readiness:${(result.blockers||[]).join(',')}`,updated_at:now}).eq('id',run.id).eq('has_started',false);await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_auto_start_deferred',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{blockers:result.blockers||[]}});deferred++;continue}
      }catch(error){failed++;console.error('scheduled project start failed',{run_id:run.id,project_id:run.project_id,error});await db.from('project_runs').update({auto_start_failure:error instanceof Error?error.message.slice(0,500):'scheduled_start_failed',updated_at:now}).eq('id',run.id).eq('has_started',false);await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_auto_start_failed',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{error:error instanceof Error?error.message.slice(0,500):'scheduled_start_failed'}})}
    }
    return NextResponse.json({ok:true,cancelled,notified,scheduled:{due:(dueRuns||[]).length,started,paused,deferred,failed}});
  }catch(error){console.error('project formation lifecycle error',error);return NextResponse.json({error:'Project formation lifecycle failed.'},{status:500});}
}