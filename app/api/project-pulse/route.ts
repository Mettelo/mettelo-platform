import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

const progressValues=new Set(['on_track','some_risk','blocked']);
const workloadValues=new Set(['manageable','heavy','unsustainable']);
const teamStateValues=new Set(['working_well','some_friction','significant_concern']);
const supportValues=new Set(['no','maybe','yes']);

function clean(value:unknown,max=2000){return String(value??'').trim().slice(0,max)}
function mondayUtc(value=new Date()){
 const date=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));
 const day=date.getUTCDay()||7;
 date.setUTCDate(date.getUTCDate()-day+1);
 return date.toISOString().slice(0,10);
}

async function context(projectId:string,runId:string){
 const supabase=await createServerSupabaseClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return{supabase,user:null,membership:null,run:null};
 const db=serviceDb();
 if(!db)return{supabase,user,membership:null,run:null};
 const [{data:membership},{data:run}]=await Promise.all([
  db.from('project_members').select('team_role,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',user.id).limit(1).maybeSingle(),
  db.from('project_runs').select('id,status').eq('id',runId).eq('project_id',projectId).maybeSingle()
 ]);
 return{supabase,user,membership,run};
}

async function teamApplicable(supabase:Awaited<ReturnType<typeof createServerSupabaseClient>>,projectId:string,runId:string,periodStart:string){
 const {data,error}=await supabase.rpc('project_pulse_team_applicable',{target_project:projectId,target_run:runId,target_period:periodStart});
 if(error)throw error;
 return Boolean(data);
}

export async function GET(request:Request){
 try{
  const url=new URL(request.url);
  const projectId=clean(url.searchParams.get('project_id'),80);
  const runId=clean(url.searchParams.get('project_run_id'),80);
  if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
  const ctx=await context(projectId,runId);
  if(!ctx.user)return NextResponse.json({error:'Authentication required.'},{status:401});
  const isAdmin=ctx.user.app_metadata?.role==='admin';
  if(!ctx.run)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(!ctx.membership&&!isAdmin)return NextResponse.json({error:'Project membership is required.'},{status:403});
  const periodStart=mondayUtc();
  const applies=await teamApplicable(ctx.supabase,projectId,runId,periodStart);
  const {data:item,error}=await ctx.supabase.from('project_weekly_pulses').select('id,period_start,progress,workload,team_state,support_need,note,submitted_at,updated_at').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',ctx.user.id).eq('period_start',periodStart).maybeSingle();
  if(error)throw error;
  const canViewHealth=isAdmin||ctx.membership?.team_role==='project_lead';
  let health=null;
  if(canViewHealth){
   const {data,error:healthError}=await ctx.supabase.rpc('project_weekly_pulse_health',{target_project:projectId,target_run:runId,target_period:periodStart});
   if(healthError)throw healthError;
   health=Array.isArray(data)?data[0]||null:data||null;
  }
  return NextResponse.json({period_start:periodStart,period_timezone:'UTC',item:item||null,health,team_question_applicable:applies,can_submit:ctx.membership?.membership_status==='active'&&ctx.run.status==='active',can_view_health:canViewHealth},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('project pulse read error',error instanceof Error?error.message:'pulse read failed');return NextResponse.json({error:'Unable to load this week’s project pulse.'},{status:500,headers:{'Cache-Control':'private, no-store'}})}
}

export async function POST(request:Request){
 try{
  const body=await request.json();
  const projectId=clean(body.project_id,80),runId=clean(body.project_run_id,80);
  if(!projectId||!runId)return NextResponse.json({error:'Project and project run are required.'},{status:400});
  const ctx=await context(projectId,runId);
  if(!ctx.user)return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!ctx.run)return NextResponse.json({error:'Project run not found.'},{status:404});
  if(!ctx.membership||ctx.membership.membership_status!=='active')return NextResponse.json({error:'Only active project members can submit a weekly pulse.'},{status:403});
  if(ctx.run.status!=='active')return NextResponse.json({error:'Weekly pulse is available only while this project run is active.'},{status:409});
  const periodStart=mondayUtc();
  const applies=await teamApplicable(ctx.supabase,projectId,runId,periodStart);
  const progress=clean(body.progress,40),workload=clean(body.workload,40),teamState=clean(body.team_state,40),supportNeed=clean(body.support_need,40),note=clean(body.note,2000);
  if(!progressValues.has(progress)||!workloadValues.has(workload)||!supportValues.has(supportNeed)||(applies&&!teamStateValues.has(teamState)))return NextResponse.json({error:applies?'Complete all four pulse questions.':'Complete the progress, workload and support questions.'},{status:400});
  const now=new Date().toISOString();
  const {data,error}=await ctx.supabase.from('project_weekly_pulses').upsert({project_id:projectId,project_run_id:runId,user_id:ctx.user.id,period_start:periodStart,progress,workload,team_state:applies?teamState:null,support_need:supportNeed,note:note||null,submitted_at:now,updated_at:now},{onConflict:'project_run_id,user_id,period_start'}).select('id,period_start,progress,workload,team_state,support_need,note,submitted_at,updated_at').single();
  if(error)throw error;
  return NextResponse.json({ok:true,item:data,team_question_applicable:applies},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){console.error('project pulse submit error',error instanceof Error?error.message:'pulse submit failed');return NextResponse.json({error:'Unable to save your weekly project pulse.'},{status:500,headers:{'Cache-Control':'private, no-store'}})}
}
