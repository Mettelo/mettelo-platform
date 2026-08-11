import {NextResponse} from 'next/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

function authorised(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get('authorization')===`Bearer ${secret}`);}
async function emailFor(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){const {data}=await db.auth.admin.getUserById(userId);return data.user?.email||null;}

export async function GET(request:Request){
  if(!authorised(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  const db=serviceDb();if(!db)return NextResponse.json({error:'Project lifecycle service is not configured.'},{status:503});
  try{
    const now=new Date().toISOString();const {data:projects,error}=await db.from('projects').select('id,title').eq('status','forming').not('forming_deadline','is',null).lte('forming_deadline',now);if(error)throw error;
    let cancelled=0;let notified=0;
    for(const project of projects||[]){
      const {data:members}=await db.from('project_members').select('user_id').eq('project_id',project.id).eq('membership_status','waiting');
      const reason='The project did not reach its team-size threshold before the formation deadline.';
      await db.from('projects').update({status:'cancelled',cancelled_at:now,cancellation_reason:reason,updated_at:now}).eq('id',project.id).eq('status','forming');
      await db.from('project_members').update({membership_status:'removed',left_at:now}).eq('project_id',project.id).eq('membership_status','waiting');
      await db.from('project_applications').update({status:'declined',decision_at:now,decision_reason:reason,updated_at:now}).eq('project_id',project.id).in('status',['approved','waiting_for_team','accepted']);
      await Promise.all((members||[]).map(async member=>{notified++;return notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId:project.id,type:'project_formation_expired',title:'Project did not form in time',body:`${project.title} did not reach the required team size before its formation deadline. Your approved place has been released.`,actionUrl:'/member#applications',subject:`Project formation update — ${project.title}`});}));
      cancelled++;
    }
    return NextResponse.json({ok:true,cancelled,notified});
  }catch(error){console.error('project formation lifecycle error',error);return NextResponse.json({error:'Project formation lifecycle failed.'},{status:500});}
}
