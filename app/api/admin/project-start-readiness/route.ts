import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {serviceDb} from '@/lib/project-flow';

async function adminContext(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{db};
}

type Readiness={
  state?:'READY'|'NOT_READY';
  ready?:boolean;
  reason_codes?:string[];
  project?:{ready?:boolean;blockers?:string[];publication_ready?:boolean;alignment_ready?:boolean;missing_requirements?:string[]};
  team?:{ready?:boolean;blockers?:string[];filled?:number;required_team_size?:number;target_team_size?:number;maximum_team_size?:number;missing_accepted_offers?:number;missing_responsibility_members?:number;project_lead_count?:number};
  system?:{ready?:boolean;blockers?:string[];lab_ready?:boolean;permissions_ready?:boolean;private_resources_ready?:boolean;first_milestone_ready?:boolean;start_paused?:boolean;start_blocked?:boolean};
};

export async function GET(request:Request){
  try{
    const ctx=await adminContext();
    if('error'in ctx)return ctx.error;
    const {db}=ctx;
    const url=new URL(request.url);
    const projectId=url.searchParams.get('project_id')||'';
    let query=db.from('project_runs')
      .select('id,project_id,run_number,status,has_started,scheduled_start_at,start_ready_at,started_at,projects(title,project_type,admission_mode,participation_mode)')
      .in('status',['forming','paused','review','active'])
      .order('updated_at',{ascending:false})
      .limit(100);
    if(projectId)query=query.eq('project_id',projectId);
    const {data:runs,error}=await query;
    if(error)throw error;

    const items=[];
    for(const run of runs||[]){
      const project=Array.isArray(run.projects)?run.projects[0]:run.projects;
      let readiness:Readiness|null=null;
      if(run.status==='active'||run.has_started){
        readiness={state:'READY',ready:true,reason_codes:[],project:{ready:true,blockers:[]},team:{ready:true,blockers:[]},system:{ready:true,blockers:[]}};
      }else{
        const {data,error:readinessError}=await db.rpc('phase11_project_start_readiness',{p_project_id:run.project_id,p_run_id:run.id});
        if(readinessError){
          console.error('phase11 readiness rpc error',readinessError);
          readiness={state:'NOT_READY',ready:false,reason_codes:['READINESS_UNAVAILABLE'],project:{ready:false,blockers:['readiness_unavailable']},team:{ready:false,blockers:[]},system:{ready:false,blockers:['readiness_unavailable']}};
        }else readiness=(data||null) as Readiness|null;
      }
      items.push({
        project_id:run.project_id,
        run_id:run.id,
        run_number:run.run_number,
        title:project?.title||'Project',
        project_type:project?.project_type||'open',
        admission_mode:project?.admission_mode||null,
        participation_mode:project?.participation_mode||null,
        run_status:run.status,
        scheduled_start_at:run.scheduled_start_at,
        start_ready_at:run.start_ready_at,
        started_at:run.started_at,
        readiness
      });
    }
    return NextResponse.json({items});
  }catch(error){
    console.error('phase11 admin readiness error',error);
    return NextResponse.json({error:'Unable to load final start readiness.'},{status:500});
  }
}
