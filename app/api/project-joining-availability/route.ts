import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

type CapacitySnapshot={available?:number;capacity_available?:boolean};
function clean(value:unknown,max=80){return String(value??'').trim().slice(0,max)}
function one<T>(value:T|T[]|null|undefined){return Array.isArray(value)?value[0]||null:value||null}

export async function PATCH(request:Request){
 try{
  const body=await request.json();
  const projectId=clean(body.project_id),runId=clean(body.project_run_id);
  const recruitmentOpen=body.recruitment_open;
  if(!projectId||!runId||typeof recruitmentOpen!=='boolean')return NextResponse.json({error:'Project, project run and joining availability are required.'},{status:400});

  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const db=serviceDb();
  if(!db)return NextResponse.json({error:'Project service is not configured.'},{status:503});

  const [{data:membership},{data:run},{data:project},{count:activeCount}]=await Promise.all([
   db.from('project_members').select('id,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).limit(1).maybeSingle(),
   db.from('project_runs').select('id,status,has_started,recruitment_open').eq('id',runId).eq('project_id',projectId).maybeSingle(),
   db.from('projects').select('id,participation_mode,late_joining_enabled,late_joining_cutoff_at').eq('id',projectId).maybeSingle(),
   db.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',projectId).eq('project_run_id',runId).eq('membership_status','active')
  ]);
  if(!run||!project)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(!membership||membership.membership_status!=='active')return NextResponse.json({error:'Only an active member of this project run can manage joining availability.'},{status:403});
  if(run.status!=='active'||run.has_started!==true)return NextResponse.json({error:'Joining availability can only change while this project run is active.'},{status:409});
  if((activeCount||0)!==1)return NextResponse.json({error:'This control is only available while you are working independently.'},{status:409});
  if(project.participation_mode!=='flexible')return NextResponse.json({error:'Only Flexible projects can open a collaboration place after starting independently.'},{status:409});

  const {data:rawCapacity,error:capacityError}=await db.rpc('phase9_project_run_capacity',{p_project_id:projectId,p_run_id:runId});
  if(capacityError)throw capacityError;
  const capacity=one(rawCapacity as CapacitySnapshot|CapacitySnapshot[]|null);
  if(!capacity)return NextResponse.json({error:'Project capacity could not be resolved.'},{status:409});

  if(recruitmentOpen){
   const cutoff=project.late_joining_cutoff_at?new Date(project.late_joining_cutoff_at).getTime():null;
   if(project.late_joining_enabled===false)return NextResponse.json({error:'Late joining is disabled for this project.'},{status:409});
   if(cutoff!==null&&Number.isFinite(cutoff)&&Date.now()>=cutoff)return NextResponse.json({error:'The joining window for this project has closed.'},{status:409});
   if(capacity.capacity_available!==true||Number(capacity.available||0)<1)return NextResponse.json({error:'This project run has no collaboration capacity available.'},{status:409});
  }

  const {data:updated,error:updateError}=await db.from('project_runs').update({recruitment_open:recruitmentOpen,updated_at:new Date().toISOString()}).eq('id',runId).eq('project_id',projectId).eq('status','active').eq('has_started',true).select('id,recruitment_open').maybeSingle();
  if(updateError)throw updateError;
  if(!updated)return NextResponse.json({error:'Project run changed before joining availability could be updated.'},{status:409});
  return NextResponse.json({ok:true,recruitment_open:updated.recruitment_open},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){
  console.error('project joining availability error',error instanceof Error?error.message:'joining availability failed');
  return NextResponse.json({error:'Unable to update joining availability.'},{status:500,headers:{'Cache-Control':'private, no-store'}});
 }
}
