import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';
import {startProjectRun} from '@/lib/project-start-service';

type Db=NonNullable<ReturnType<typeof serviceDb>>;

async function adminContext(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{db,user};
}

async function emailFor(db:Db,userId:string){
  const {data}=await db.auth.admin.getUserById(userId);
  return data.user?.email||null;
}

export async function GET(){
  try{
    const ctx=await adminContext();
    if('error'in ctx)return ctx.error;
    const {db}=ctx;
    const {data:runs,error}=await db.from('project_runs')
      .select('id,project_id,run_number,status,team_size_threshold,required_team_size,has_started,kickoff_at,scheduled_start_at,updated_at,projects(title,project_type,partner_name,forming_deadline,min_team_size,target_team_size,max_team_size,team_size_threshold,admission_mode,participation_mode)')
      .in('status',['forming','active','paused','review'])
      .order('updated_at',{ascending:false});
    if(error)throw error;

    const runIds=(runs||[]).map(run=>run.id);
    const projectIds=[...new Set((runs||[]).map(run=>run.project_id))];
    const [{data:members},{data:roles},{data:applications},{data:responsibilities}]=await Promise.all([
      runIds.length?db.from('project_members').select('id,project_run_id,user_id,project_role_id,team_role,membership_status').in('project_run_id',runIds).in('membership_status',['waiting','active']):Promise.resolve({data:[]}),
      projectIds.length?db.from('project_roles').select('id,project_id,title,responsibilities').in('project_id',projectIds).order('title'):Promise.resolve({data:[]}),
      runIds.length?db.from('project_applications').select('project_run_id,user_id,leadership_interest').in('project_run_id',runIds).in('status',['approved','accepted','waiting_for_team','team_complete']):Promise.resolve({data:[]}),
      runIds.length?db.from('project_member_responsibilities').select('id,project_run_id,project_member_id,source_project_role_id,responsibility,assignment_status,assigned_at').in('project_run_id',runIds).eq('assignment_status','active').order('assigned_at',{ascending:true}):Promise.resolve({data:[]})
    ]);

    const userIds=[...new Set((members||[]).map(member=>member.user_id))];
    const {data:profiles}=userIds.length?await db.from('profiles').select('id,full_name,headline').in('id',userIds):{data:[]};
    const names=new Map((profiles||[]).map(profile=>[profile.id,profile]));
    const roleMap=new Map((roles||[]).map(role=>[role.id,role.title]));
    const leadInterest=new Map((applications||[]).map(application=>[`${application.project_run_id}:${application.user_id}`,application.leadership_interest===true]));
    const responsibilitiesByMember=new Map<string,typeof responsibilities>();
    for(const assignment of responsibilities||[]){
      const current=responsibilitiesByMember.get(assignment.project_member_id)||[];
      current.push(assignment);
      responsibilitiesByMember.set(assignment.project_member_id,current);
    }

    const items=(runs||[]).map(run=>{
      const project=Array.isArray(run.projects)?run.projects[0]:run.projects;
      const minimum=Math.max(1,Number(run.required_team_size||run.team_size_threshold||project?.min_team_size||project?.team_size_threshold||1));
      const target=Math.max(minimum,Number(project?.target_team_size||minimum));
      const maximum=Math.max(target,Number(project?.max_team_size||target));
      const team=(members||[]).filter(member=>member.project_run_id===run.id).map(member=>({
        membership_id:member.id,
        id:member.user_id,
        name:names.get(member.user_id)?.full_name||'Mettelo member',
        headline:names.get(member.user_id)?.headline||null,
        project_role_id:member.project_role_id||null,
        project_role:member.project_role_id?roleMap.get(member.project_role_id)||null:null,
        team_role:member.team_role,
        membership_status:member.membership_status,
        leadership_interest:leadInterest.get(`${run.id}:${member.user_id}`)===true,
        responsibilities:(responsibilitiesByMember.get(member.id)||[]).map(item=>({id:item.id,responsibility:item.responsibility,source_project_role_id:item.source_project_role_id}))
      }));
      return{
        id:run.project_id,
        run_id:run.id,
        run_number:run.run_number,
        title:project?.title||'Project',
        project_type:project?.project_type||'open',
        partner_name:project?.partner_name||null,
        admission_mode:project?.admission_mode||null,
        participation_mode:project?.participation_mode||null,
        status:run.status,
        team_size_threshold:minimum,
        min_team_size:minimum,
        target_team_size:target,
        max_team_size:maximum,
        open_places:Math.max(0,maximum-team.length),
        forming_deadline:project?.forming_deadline||null,
        kickoff_at:run.kickoff_at,
        scheduled_start_at:run.scheduled_start_at||null,
        filled:team.length,
        roles:(roles||[]).filter(role=>role.project_id===run.project_id).map(role=>({id:role.id,title:role.title,responsibilities:Array.isArray(role.responsibilities)?role.responsibilities:[]})),
        team
      };
    });
    return NextResponse.json({items});
  }catch(error){
    console.error('project flow admin list error',error);
    return NextResponse.json({error:'Unable to load project teams.'},{status:500});
  }
}

export async function POST(request:Request){
  try{
    const ctx=await adminContext();
    if('error'in ctx)return ctx.error;
    const {db,user}=ctx;
    const body=await request.json();
    const projectId=String(body.project_id||'');
    const runId=String(body.run_id||'');
    const action=String(body.action||'');
    const reason=String(body.reason||'').trim().slice(0,1200);
    if(!projectId||!runId)return NextResponse.json({error:'Project team is required.'},{status:400});

    const [{data:project},{data:run}]=await Promise.all([
      db.from('projects').select('id,title,status,project_type,team_size_threshold,governance_status').eq('id',projectId).maybeSingle(),
      db.from('project_runs').select('id,run_number,status,kickoff_at,required_team_size,team_size_threshold,has_started').eq('id',runId).eq('project_id',projectId).maybeSingle()
    ]);
    if(!project||!run)return NextResponse.json({error:'Project team not found.'},{status:404});

    if(action==='assign_lead'){
      if(run.status!=='forming'||run.has_started)return NextResponse.json({error:'Project Lead can only be changed while the team is still forming.'},{status:409});
      const userId=String(body.user_id||'');
      if(!userId)return NextResponse.json({error:'Choose a team member.'},{status:400});
      const {data:member}=await db.from('project_members').select('id,membership_status').eq('project_run_id',runId).eq('user_id',userId).in('membership_status',['waiting','active']).maybeSingle();
      if(!member)return NextResponse.json({error:'Project Lead must be a current member of this team.'},{status:400});
      const {error:leadError}=await db.rpc('phase10_confirm_project_lead',{p_membership_id:member.id,p_actor_user_id:user.id,p_reason:reason||'Admin Team Formation assignment'});
      if(leadError)throw leadError;
      await notifyUser(db,{userId,email:await emailFor(db,userId),projectId,type:'project_lead_assigned',title:'You are the Project Lead',body:`You are the Project Lead for Team ${run.run_number} on ${project.title}. You can coordinate responsibilities and team alignment.`,actionUrl:`/member/projects/${projectId}?run=${runId}`,subject:`Project Lead: ${project.title}`,dedupeKey:`ws4:${runId}:lead:${userId}`});
      return NextResponse.json({ok:true,message:'Project Lead updated through the canonical governed assignment.'});
    }

    if(action==='assign_responsibility'){
      const userId=String(body.user_id||'');
      const responsibility=String(body.responsibility||'').trim();
      const sourceRoleId=String(body.source_project_role_id||'').trim()||null;
      if(!userId||!responsibility)return NextResponse.json({error:'Choose a team member and delivery responsibility.'},{status:400});
      const {data:member}=await db.from('project_members').select('id').eq('project_run_id',runId).eq('user_id',userId).in('membership_status',['waiting','active']).maybeSingle();
      if(!member)return NextResponse.json({error:'Choose a valid current team member.'},{status:400});
      const {data:assignment,error:assignmentError}=await db.rpc('phase10_assign_delivery_responsibility',{p_membership_id:member.id,p_responsibility:responsibility,p_source_project_role_id:sourceRoleId,p_actor_user_id:user.id,p_reason:reason||'Admin Team Formation assignment'});
      if(assignmentError)throw assignmentError;
      await notifyUser(db,{userId,email:await emailFor(db,userId),projectId,type:'project_responsibility_assigned',title:'Project responsibility assigned',body:`Your delivery responsibilities for Team ${run.run_number} on ${project.title} have been updated.`,actionUrl:`/member/projects/${projectId}?run=${runId}`,subject:`Project responsibility: ${project.title}`,dedupeKey:`ws4:${runId}:responsibility:${String((assignment as {assignment_id?:string}|null)?.assignment_id||responsibility).toLowerCase()}`});
      return NextResponse.json({ok:true,message:`Delivery responsibility assigned: ${responsibility}.`,assignment});
    }

    if(action==='release_responsibility'){
      const assignmentId=String(body.assignment_id||'');
      if(!assignmentId)return NextResponse.json({error:'Responsibility assignment is required.'},{status:400});
      const {data:assignment}=await db.from('project_member_responsibilities').select('id,project_id,project_run_id').eq('id',assignmentId).eq('project_id',projectId).eq('project_run_id',runId).maybeSingle();
      if(!assignment)return NextResponse.json({error:'Responsibility assignment not found.'},{status:404});
      const {error:releaseError}=await db.rpc('phase10_release_delivery_responsibility',{p_assignment_id:assignmentId,p_actor_user_id:user.id,p_reason:reason||'Admin Team Formation release'});
      if(releaseError)throw releaseError;
      return NextResponse.json({ok:true,message:'Delivery responsibility released.'});
    }

    if(action==='assign_role'){
      return NextResponse.json({error:'Project role is application compatibility data. Assign a delivery responsibility instead.'},{status:409});
    }

    if(action==='pause'){
      if(!['forming','active'].includes(run.status))return NextResponse.json({error:'Only forming or active teams can be paused.'},{status:409});
      if(!reason)return NextResponse.json({error:'Add a reason so members understand why the team is paused.'},{status:400});
      const now=new Date().toISOString();
      const {error}=await db.from('project_runs').update({status:'paused',updated_at:now}).eq('id',runId);
      if(error)throw error;
      if(project.project_type==='partner')await db.from('projects').update({governance_status:'paused',governance_paused_at:now,updated_at:now}).eq('id',projectId);
      const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).in('membership_status',['waiting','active']);
      await Promise.all((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_paused',title:'Your project team is paused',body:`Team ${run.run_number} for ${project.title} is temporarily paused. ${reason} No project work is expected until the team is resumed.`,actionUrl:'/member/applications',subject:`Project paused: ${project.title}`})));
      return NextResponse.json({ok:true,message:`Team ${run.run_number} paused and members notified.`});
    }

    if(action==='resume'){
      if(run.status!=='paused')return NextResponse.json({error:'Only a paused team can be resumed.'},{status:409});
      const {count:activeCount}=await db.from('project_members').select('id',{count:'exact',head:true}).eq('project_run_id',runId).eq('membership_status','active');
      const nextStatus=(activeCount||0)>0?'active':'forming';
      const now=new Date().toISOString();
      const {error}=await db.from('project_runs').update({status:nextStatus,updated_at:now}).eq('id',runId);
      if(error)throw error;
      if(project.project_type==='partner')await db.from('projects').update({governance_status:nextStatus,governance_paused_at:null,updated_at:now}).eq('id',projectId);
      const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).in('membership_status',['waiting','active']);
      await Promise.all((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_resumed',title:'Your project team has resumed',body:`Team ${run.run_number} for ${project.title} has resumed. ${nextStatus==='active'?'Continue from the project workspace.':'Team formation is continuing and we will confirm kickoff when ready.'}`,actionUrl:nextStatus==='active'?`/member/projects/${projectId}?run=${runId}`:'/member/applications',subject:`Project resumed: ${project.title}`})));
      return NextResponse.json({ok:true,message:`Team ${run.run_number} resumed as ${nextStatus}.`});
    }

    if(action==='force_start'){
      if(run.status!=='forming'||run.has_started)return NextResponse.json({error:'Only a forming team can be started.'},{status:409});
      const result=await startProjectRun({db,projectId,runId,source:'manual',actorUserId:user.id});
      const blockers=result.blockers||[result.paused?'auto_start_paused':result.blocked?'auto_start_blocked':'project_readiness'];
      const readiness={ready:result.started,blockers,filled:result.filled,threshold:result.requiredTeamSize};
      if(!readiness.ready)return NextResponse.json(result.alreadyStarted?{ok:true,message:`Team ${run.run_number} is already active.`}:{error:`This team is not ready to start. Resolve: ${blockers.join(', ').replaceAll('_',' ')}.`,readiness},{status:result.alreadyStarted?200:409});
      return NextResponse.json({ok:true,message:`Team ${result.runNumber} started with ${result.filled} member${result.filled===1?'':'s'} through the canonical atomic start boundary.`});
    }

    if(action==='cancel'){
      if(run.status==='completed')return NextResponse.json({error:'A completed team run cannot be cancelled.'},{status:409});
      if(!reason)return NextResponse.json({error:'Add a reason so members understand what happened.'},{status:400});
      const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',runId).in('membership_status',['waiting','active']);
      const now=new Date().toISOString();
      await db.from('project_runs').update({status:'cancelled',updated_at:now}).eq('id',runId);
      await db.from('project_members').update({membership_status:'removed',left_at:now}).eq('project_run_id',runId).in('membership_status',['waiting','active']);
      await db.from('project_applications').update({status:'declined',decision_at:now,decision_reason:`Team cancelled: ${reason}`,updated_at:now}).eq('project_run_id',runId).in('status',['approved','waiting_for_team','team_complete','accepted']);
      if(project.project_type==='partner'){
        await db.from('projects').update({status:'cancelled',cancelled_at:now,cancellation_reason:reason,updated_at:now}).eq('id',projectId);
      }else{
        await db.from('projects').update({status:'open',updated_at:now}).eq('id',projectId);
      }
      await Promise.all((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await emailFor(db,member.user_id),projectId,type:'project_cancelled',title:'Project team update',body:`Team ${run.run_number} for ${project.title} was cancelled. ${reason}`,actionUrl:'/member/applications',subject:`Project team update: ${project.title}`})));
      return NextResponse.json({ok:true,message:project.project_type==='open'?'Team run cancelled. The Open Project remains available.':'Partner Project cancelled.'});
    }

    return NextResponse.json({error:'Unknown project action.'},{status:400});
  }catch(error){
    console.error('project flow admin error',error);
    return NextResponse.json({error:'Unable to update this project team.'},{status:500});
  }
}