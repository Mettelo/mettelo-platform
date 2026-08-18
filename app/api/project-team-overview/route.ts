import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';
import {resolveProjectTeamOverview} from '@/lib/project-team-overview';

export async function GET(request:Request){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 const url=new URL(request.url),projectId=url.searchParams.get('project_id')||'',runId=url.searchParams.get('project_run_id')||'';
 if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
 const db=serviceDb();
 if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
 const overview=await resolveProjectTeamOverview({db,projectId,userId:user.id,isAdmin:user.app_metadata?.role==='admin',currentRunId:runId||null});
 if(!overview)return NextResponse.json({error:'Project membership is required.'},{status:403});
 return NextResponse.json(overview);
}
