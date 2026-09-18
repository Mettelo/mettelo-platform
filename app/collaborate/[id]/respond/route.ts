import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

type Capacity={available?:number;capacity_available?:boolean};
function one<T>(value:T|T[]|null|undefined):T|null{return Array.isArray(value)?value[0]||null:value||null}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const safeId=String(id||'').trim().slice(0,80);
 const origin=new URL(request.url).origin;
 const publicPath=`/collaborate/${encodeURIComponent(safeId)}`;
 const responsePath=`${publicPath}/respond`;
 if(!safeId)return NextResponse.redirect(new URL('/member/collaboration?view=teams',origin));

 const auth=await createServerSupabaseClient();
 const {data:{user}}=await auth.auth.getUser();
 if(!user)return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent(responsePath)}`,origin));

 const db=serviceDb();
 if(!db)return NextResponse.redirect(new URL(publicPath,origin));
 const {data:need}=await db.from('project_collaboration_needs').select('id,project_id,project_run_id,status,source').eq('id',safeId).maybeSingle();
 if(!need||need.source==='direct_invite')return NextResponse.redirect(new URL('/member/collaboration?view=teams',origin));

 const [{data:project},{data:run},capacityResult]=await Promise.all([
  db.from('projects').select('id,status,visibility,collaboration_marketplace_enabled,late_joining_enabled,late_joining_cutoff_at').eq('id',need.project_id).maybeSingle(),
  db.from('project_runs').select('id,status,recruitment_open,completion_state').eq('id',need.project_run_id).eq('project_id',need.project_id).maybeSingle(),
  db.rpc('phase9_project_run_capacity',{p_project_id:need.project_id,p_run_id:need.project_run_id})
 ]);
 const capacity=one(capacityResult.data as Capacity|Capacity[]|null);
 const cutoffClosed=Boolean(project?.late_joining_cutoff_at&&Date.now()>=new Date(project.late_joining_cutoff_at).getTime());
 const accepting=Boolean(
  need.status==='active'&&project&&run&&project.visibility==='public'&&project.collaboration_marketplace_enabled===true&&
  !['completed','cancelled','archived'].includes(project.status)&&['forming','active'].includes(run.status)&&
  !['final_review','completed'].includes(String(run.completion_state||''))&&run.recruitment_open!==false&&
  (run.status!=='active'||(project.late_joining_enabled!==false&&!cutoffClosed))&&
  capacity?.capacity_available===true&&Number(capacity.available||0)>0
 );
 if(!accepting)return NextResponse.redirect(new URL(publicPath,origin));

 return NextResponse.redirect(new URL(`/member/discover/${encodeURIComponent(String(need.project_id))}?collaboration_need=${encodeURIComponent(safeId)}`,origin));
}
