import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

export async function GET(request:Request){
 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 const url=new URL(request.url),projectId=url.searchParams.get('project_id')||'',runId=url.searchParams.get('project_run_id')||'';
 if(!projectId)return NextResponse.json({error:'Project is required.'},{status:400});
 const db=serviceDb();
 if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});
 const isAdmin=user.app_metadata?.role==='admin';
 const {data:ownMemberships}=await db.from('project_members').select('project_run_id,team_role,membership_status').eq('project_id',projectId).eq('user_id',user.id).in('membership_status',['waiting','active','completed']);
 if(!ownMemberships?.length&&!isAdmin)return NextResponse.json({error:'Project membership is required.'},{status:403});
 const ownRunIds=new Set((ownMemberships||[]).map(row=>row.project_run_id).filter((value):value is string=>Boolean(value)));
 const [{data:project},{data:runs}]=await Promise.all([
  db.from('projects').select('id,project_type,title').eq('id',projectId).maybeSingle(),
  db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('project_id',projectId).order('run_number',{ascending:true})
 ]);
 if(!project)return NextResponse.json({error:'Project not found.'},{status:404});
 const visibleRuns=project.project_type==='partner'?(runs||[]).slice(0,1):(runs||[]);
 const readableRuns=isAdmin?visibleRuns:visibleRuns.filter(run=>ownRunIds.has(run.id));
 const readableRunIds=readableRuns.map(run=>run.id);
 const {data:members}=readableRunIds.length?await db.from('project_members').select('project_run_id,user_id,team_role,membership_status').in('project_run_id',readableRunIds).in('membership_status',['waiting','active','completed']):{data:[]};
 const userIds=[...new Set((members||[]).map(member=>member.user_id))];
 const {data:profiles}=userIds.length?await db.from('profiles').select('id,full_name,headline,avatar_url').in('id',userIds):{data:[]};
 const map=new Map((profiles||[]).map(profile=>[profile.id,profile]));
 const {data:permissions}=readableRunIds.length?await db.from('project_submission_permissions').select('project_run_id,user_id,granted_by_user_id,granted_at').in('project_run_id',readableRunIds).is('revoked_at',null):{data:[]};
 const teams=visibleRuns.map(run=>{
  const isMember=isAdmin||ownRunIds.has(run.id);
  return{id:isMember?run.id:`cohort-${run.run_number}`,run_number:run.run_number,status:run.status,required_team_size:isMember?run.required_team_size:null,has_started:isMember?run.has_started:null,is_member:isMember,members:isMember?(members||[]).filter(member=>member.project_run_id===run.id).map(member=>({id:member.user_id,name:map.get(member.user_id)?.full_name||'Mettelo member',headline:map.get(member.user_id)?.headline||null,avatar_url:map.get(member.user_id)?.avatar_url||null,role:member.team_role,status:member.membership_status,can_submit_final_proof:(permissions||[]).some(permission=>permission.project_run_id===run.id&&permission.user_id===member.user_id)})):[]};
 });
 return NextResponse.json({project_type:project.project_type,current_run_id:runId||null,teams});
}
