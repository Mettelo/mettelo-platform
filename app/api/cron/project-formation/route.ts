import {NextResponse} from 'next/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';
import {startProjectRun} from '@/lib/project-start-service';
import {effectiveProjectAdmissionMode} from '@/lib/project-admission';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`)}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null}
async function projectTitle(db:NonNullable<ReturnType<typeof serviceDb>>,projectId:string){const {data}=await db.from('projects').select('title').eq('id',projectId).maybeSingle();return data?.title||'Mettelo project'}

type DueRun={
  id:string;
  project_id:string;
  run_number:number;
  required_team_size:number|null;
  scheduled_start_at:string|null;
  auto_start_blocked_at:string|null;
  projects:{project_type:string|null;admission_mode:string|null}|{project_type:string|null;admission_mode:string|null}[]|null;
};
type OfferReminder={offer_id:string;application_id:string;project_id:string;user_id:string;expires_at:string};
type ExpiredOffer={offer_id:string;application_id:string;project_id:string;user_id:string;expires_at:string};
type ExpiryResult={expired?:number;offers?:ExpiredOffer[]};

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Project lifecycle service is not configured.'},{status:503});
  try{
    const now=new Date().toISOString();
    const [{data:projects,error:formationError},{data:dueRuns,error:dueError},{data:reminderRows,error:reminderError}]=await Promise.all([
      db.from('projects').select('id,title').eq('status','forming').not('forming_deadline','is',null).lte('forming_deadline',now),
      db.from('project_runs').select('id,project_id,run_number,required_team_size,scheduled_start_at,auto_start_blocked_at,projects(project_type,admission_mode)').eq('has_started',false).eq('status','forming').not('scheduled_start_at','is',null).lte('scheduled_start_at',now).order('scheduled_start_at',{ascending:true}).limit(100),
      db.rpc('phase8_claim_offer_reminders',{p_limit:100})
    ]);
    if(formationError)throw formationError;if(dueError)throw dueError;if(reminderError)throw reminderError;
    let cancelled=0;let notified=0;let started=0;let paused=0;let blocked=0;let policySkipped=0;let deferred=0;let failed=0;let offerReminders=0;let offerReminderFailures=0;let offerExpiryNotifications=0;let offerExpiryNotificationFailures=0;

    for(const reminder of (reminderRows||[]) as OfferReminder[]){
      try{
        const title=await projectTitle(db,reminder.project_id);
        await notifyUser(db,{
          userId:reminder.user_id,
          email:await emailFor(db,reminder.user_id),
          projectId:reminder.project_id,
          applicationId:reminder.application_id,
          type:'project_offer_expiring',
          title:'Project offer expiring soon',
          body:`Your place offer for ${title} is still awaiting your response and will expire on ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(reminder.expires_at))}. Open My Mettelo to accept or decline the place.`,
          actionUrl:'/member/applications',
          subject:`Project offer expiring soon — ${title}`,
          templateKey:'project_offer_expiring',
          payload:{project_title:title,offer_id:reminder.offer_id,offer_expires_at:reminder.expires_at},
          dedupeKey:`project-offer:${reminder.offer_id}:expiring`
        });
        offerReminders++;
      }catch(error){offerReminderFailures++;console.error('project offer reminder failed',{offer_id:reminder.offer_id,error})}
    }

    const {data:expiryData,error:expiryError}=await db.rpc('phase8_expire_project_offers',{p_limit:100});
    if(expiryError)throw expiryError;
    const expiry=(expiryData||{}) as ExpiryResult;
    for(const expired of expiry.offers||[]){
      try{
        const title=await projectTitle(db,expired.project_id);
        await notifyUser(db,{
          userId:expired.user_id,
          email:await emailFor(db,expired.user_id),
          projectId:expired.project_id,
          applicationId:expired.application_id,
          type:'project_offer_expired',
          title:'Project offer expired',
          body:`Your place offer for ${title} has expired. The reserved capacity has been released. You can continue exploring other Mettelo projects.`,
          actionUrl:'/member/applications',
          subject:`Project offer expired — ${title}`,
          templateKey:'project_offer_expired',
          payload:{project_title:title,offer_id:expired.offer_id,offer_expires_at:expired.expires_at},
          dedupeKey:`project-offer:${expired.offer_id}:expired`
        });
        offerExpiryNotifications++;
      }catch(error){offerExpiryNotificationFailures++;console.error('project offer expiry communication failed',{offer_id:expired.offer_id,error})}
    }

    for(const project of projects||[]){
      const {data:members}=await db.from('project_members').select('user_id').eq('project_id',project.id).eq('membership_status','waiting');
      const reason='The project did not reach its team-size threshold before the formation deadline.';
      await db.from('projects').update({status:'cancelled',cancelled_at:now,cancellation_reason:reason,updated_at:now}).eq('id',project.id).eq('status','forming');
      await db.from('project_members').update({membership_status:'removed',left_at:now}).eq('project_id',project.id).eq('membership_status','waiting');
      await db.from('project_applications').update({status:'declined',decision_at:now,decision_reason:reason,updated_at:now}).eq('project_id',project.id).in('status',['approved','waiting_for_team','accepted']);
      await Promise.allSettled((members||[]).map(async member=>{notified++;return notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId:project.id,type:'project_formation_expired',title:'Project did not form in time',body:`${project.title} did not reach the required team size before its formation deadline. Your approved place has been released.`,actionUrl:'/member#applications',subject:`Project formation update — ${project.title}`})}));
      cancelled++;
    }

    for(const raw of dueRuns||[]){
      const run=raw as unknown as DueRun;
      try{
        const project=Array.isArray(run.projects)?run.projects[0]:run.projects;
        if(!project||effectiveProjectAdmissionMode(project.project_type,project.admission_mode)!=='auto'||String(project.project_type||'').toLowerCase()==='partner'){
          policySkipped++;
          await db.from('project_runs').update({scheduled_start_at:null,start_scheduled_at:null,start_ready_at:null,auto_start_failure:'admission_mode',updated_at:now}).eq('id',run.id).eq('has_started',false);
          await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_auto_start_policy_blocked',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{reason:'effective_admission_mode_not_auto',project_type:project?.project_type||null,admission_mode:project?.admission_mode||null}});
          continue;
        }
        if(run.auto_start_blocked_at){blocked++;continue}

        const {count}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',run.id).in('membership_status',['waiting','active']);
        const required=Math.max(1,Number(run.required_team_size||1));
        if((count||0)<required){
          await db.from('project_runs').update({scheduled_start_at:null,start_scheduled_at:null,start_ready_at:null,auto_start_failure:null,updated_at:now}).eq('id',run.id).eq('has_started',false);
          await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_start_schedule_cancelled',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{reason:'below_minimum_at_start_time',filled:count||0,required_team_size:required}});
          deferred++;continue;
        }

        const result=await startProjectRun({db,projectId:run.project_id,runId:run.id,source:'auto_scheduler'});
        if(result.started){started++;continue}
        if(result.paused){paused++;continue}
        if(result.blocked){blocked++;continue}
        if(result.notReady){
          await db.from('project_runs').update({auto_start_failure:`readiness:${(result.blockers||[]).join(',')}`,updated_at:now}).eq('id',run.id).eq('has_started',false);
          await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_auto_start_deferred',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{blockers:result.blockers||[]}});
          deferred++;continue;
        }
      }catch(error){
        failed++;
        console.error('scheduled project start failed',{run_id:run.id,project_id:run.project_id,error});
        await db.from('project_runs').update({auto_start_failure:error instanceof Error?error.message.slice(0,500):'scheduled_start_failed',updated_at:now}).eq('id',run.id).eq('has_started',false);
        await db.from('project_activity_log').insert({project_id:run.project_id,project_run_id:run.id,event_type:'project_auto_start_failed',actor_type:'system',from_status:'forming',to_status:'forming',metadata:{error:error instanceof Error?error.message.slice(0,500):'scheduled_start_failed'}});
      }
    }
    return NextResponse.json({ok:true,cancelled,notified,offers:{remindersClaimed:(reminderRows||[]).length,remindersSent:offerReminders,reminderFailures:offerReminderFailures,expired:expiry.expired||0,expiryNotifications:offerExpiryNotifications,expiryNotificationFailures:offerExpiryNotificationFailures},scheduled:{due:(dueRuns||[]).length,started,paused,blocked,policySkipped,deferred,failed}});
  }catch(error){
    console.error('project formation lifecycle error',error);
    return NextResponse.json({error:'Project formation lifecycle failed.'},{status:500});
  }
}
