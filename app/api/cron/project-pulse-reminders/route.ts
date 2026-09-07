import {NextResponse} from 'next/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`)}
function mondayUtc(value=new Date()){const date=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));const day=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()-day+1);return date.toISOString().slice(0,10)}

export async function GET(request:Request){
 if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=serviceDb();if(!db)return NextResponse.json({error:'Project pulse reminder service is not configured.'},{status:503});
 try{
  const now=new Date();
  const day=now.getUTCDay()||7;
  if(day<4)return NextResponse.json({ok:true,notified:0,reason:'Pulse reminders begin on Thursday.'});
  const periodStart=mondayUtc(now);
  const {data:runs,error:runsError}=await db.from('project_runs').select('id,project_id').eq('status','active');
  if(runsError)throw runsError;
  let notified=0;
  for(const run of runs||[]){
   const [{data:members,error:membersError},{data:submitted,error:pulseError},{data:project}]=await Promise.all([
    db.from('project_members').select('user_id').eq('project_id',run.project_id).eq('project_run_id',run.id).eq('membership_status','active'),
    db.from('project_weekly_pulses').select('user_id').eq('project_id',run.project_id).eq('project_run_id',run.id).eq('period_start',periodStart),
    db.from('projects').select('title').eq('id',run.project_id).maybeSingle()
   ]);
   if(membersError)throw membersError;if(pulseError)throw pulseError;
   const submittedIds=new Set((submitted||[]).map(row=>row.user_id));
   for(const member of members||[]){
    if(submittedIds.has(member.user_id))continue;
    const {data:recipient}=await db.auth.admin.getUserById(member.user_id);
    await notifyUser(db,{userId:member.user_id,email:recipient.user?.email||null,projectId:run.project_id,type:'project_pulse_reminder',eventKey:'project_pulse_reminder',title:'Your weekly project pulse is ready',body:`Share a short check-in for ${project?.title||'your Mettelo project'} before the week closes.`,actionUrl:`/member/projects/${run.project_id}?run=${run.id}#mettelo-lab`,subject:`Weekly project pulse: ${project?.title||'Mettelo'}`,dedupeKey:`project-pulse:${run.id}:${periodStart}:${member.user_id}`});
    notified++;
   }
  }
  return NextResponse.json({ok:true,notified,period_start:periodStart});
 }catch(error){console.error('project pulse reminders error',error);return NextResponse.json({error:'Project pulse reminders failed.'},{status:500})}
}
