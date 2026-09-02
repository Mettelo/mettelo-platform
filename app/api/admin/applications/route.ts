import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';
import {loadProjectRoleUsage} from '@/lib/project-role-capacity';
import {assessProjectTeamReadiness} from '@/lib/project-team-readiness';

const statuses=new Set(['in_review','shortlisted','approved','declined']);

async function adminDb(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{db,user};
}

async function memberEmail(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){
  const {data}=await db.auth.admin.getUserById(userId);
  return data.user?.email||null;
}

function defaultMessage(status:string,title:string,reviewerNotes:string){
  if(status==='in_review')return `Your application for ${title} is now in review. No action is required from you right now. We will update My Mettelo when the next decision is available.`;
  if(status==='shortlisted')return `You have been shortlisted for ${title}. No action is required right now; we will contact you if we need more information before the final decision.`;
  if(status==='declined')return `Your application for ${title} was not selected for this team.${reviewerNotes?` ${reviewerNotes}`:''} You can continue exploring other Mettelo projects that match your profile.`;
  return `Your application for ${title} has been approved. Your place is confirmed and will move into team formation. Keep your availability current while the team is completed.`;
}

function notificationMeta(status:string){
  if(status==='in_review')return{type:'application_in_review',title:'Project application in review',subject:'Your Mettelo project application is in review'};
  if(status==='shortlisted')return{type:'application_shortlisted',title:'Project application shortlisted',subject:'You have been shortlisted for a Mettelo project'};
  if(status==='declined')return{type:'application_declined',title:'Project application update',subject:'Your Mettelo project application has been updated'};
  return{type:'application_approved',title:'Project application approved',subject:'Your Mettelo project application has been approved'};
}

export async function PATCH(request:Request){
  try{
    const connection=await adminDb();
    if('error' in connection)return connection.error;
    const {db}=connection;
    const body=await request.json();
    const id=String(body.id||'');
    const status=String(body.status||'');
    const reviewerNotes=String(body.reviewer_notes||'').trim().slice(0,1500);
    const customMessage=String(body.custom_message||'').trim().slice(0,1800);
    if(!id||!statuses.has(status))return NextResponse.json({error:'Choose a valid project application and status.'},{status:400});

    const {data:application,error:loadError}=await db
      .from('project_applications')
      .select('id,project_id,project_role_id,project_run_id,user_id,status,application_kind,requested_role,projects(id,title,status,project_type,team_size_threshold,kickoff_at,applications_open)')
      .eq('id',id)
      .single();
    if(loadError||!application)return NextResponse.json({error:'Project application not found.'},{status:404});

    const project=Array.isArray(application.projects)?application.projects[0]:application.projects;
    if(!project)return NextResponse.json({error:'Project not found.'},{status:404});

    if(status==='declined'&&['approved','waiting_for_team','team_complete','accepted'].includes(application.status)){
      return NextResponse.json({error:'This member has already joined a team. Manage their membership from Project Operations.'},{status:409});
    }

    const email=await memberEmail(db,application.user_id);
    const comm=notificationMeta(status);
    const memberMessage=customMessage||defaultMessage(status,project.title,reviewerNotes);

    if(status!=='approved'){
      const patch:{status:string;reviewer_notes:string|null;decision_reason?:string|null;decision_at?:string}={status,reviewer_notes:reviewerNotes||null};
      if(status==='declined'){patch.decision_reason=reviewerNotes||null;patch.decision_at=new Date().toISOString();}
      const {data:updated,error}=await db.from('project_applications').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('id,status').single();
      if(error)throw error;
      await notifyUser(db,{userId:application.user_id,email,projectId:application.project_id,applicationId:id,type:comm.type,title:comm.title,body:memberMessage,actionUrl:'/member/applications',subject:`${comm.subject}: ${project.title}`,templateKey:comm.type,payload:{project_title:project.title}});
      return NextResponse.json({ok:true,application:updated,communication:{body:memberMessage}});
    }

    if(['completed','cancelled','archived'].includes(project.status)||(project.project_type==='partner'&&['active','review'].includes(project.status))){return NextResponse.json({error:'This project can no longer accept a new team placement.'},{status:409});}

    const {data:priorMembership,error:priorMembershipError}=await db.from('project_members').select('id,project_run_id,membership_status').eq('project_id',application.project_id).eq('user_id',application.user_id).maybeSingle();
    if(priorMembershipError)throw priorMembershipError;
    if(priorMembership){
      if(application.project_run_id&&priorMembership.project_run_id===application.project_run_id&&['approved','waiting_for_team','team_complete','accepted'].includes(application.status))return NextResponse.json({ok:true,already_approved:true,application:{id:application.id,status:application.status},team:{id:priorMembership.project_run_id}});
      return NextResponse.json({error:'This member already has participation history for this canonical project. Their original cohort membership will not be overwritten.'},{status:409});
    }

    if(!application.project_role_id)return NextResponse.json({error:'Assign a valid project role before approving this application.'},{status:409});
    const {data:role,error:roleError}=await db.from('project_roles').select('id,title,openings').eq('id',application.project_role_id).eq('project_id',application.project_id).maybeSingle();
    if(roleError)throw roleError;
    if(!role||Number(role.openings||0)<1)return NextResponse.json({error:'The selected project role is no longer available. Choose another role before approval.'},{status:409});

    const usage=await loadProjectRoleUsage(db,application.project_id,project.project_type);
    if(!usage.known)return NextResponse.json({error:'Role capacity could not be confirmed. No team place was assigned.'},{status:503});
    if((usage.filled.get(role.id)||0)>=role.openings)return NextResponse.json({error:`${role.title} is full for the current team. Choose another role or wait for the next Open Project cohort.`},{status:409});

    const now=new Date().toISOString();
    let run:{id:string;run_number:number;status:string;required_team_size:number;has_started:boolean}|null=null;
    if(application.project_run_id){const {data}=await db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('id',application.project_run_id).maybeSingle();run=data;}
    if(!run&&project.project_type==='partner'){const {data:single}=await db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('project_id',application.project_id).not('status','in','("completed","cancelled")').order('run_number',{ascending:true}).limit(1).maybeSingle();run=single;}
    if(!run&&project.project_type==='open'){const {data:forming}=await db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('project_id',application.project_id).eq('status','forming').eq('has_started',false).order('run_number',{ascending:true}).limit(1).maybeSingle();run=forming;}
    if(!run){
      const {data:latest}=await db.from('project_runs').select('run_number').eq('project_id',application.project_id).order('run_number',{ascending:false}).limit(1).maybeSingle();
      const nextNumber=project.project_type==='partner'?1:(latest?.run_number||0)+1;const required=Math.max(1,Math.min(50,Number(project.team_size_threshold||5)));
      const {data:created,error:createError}=await db.from('project_runs').insert({project_id:application.project_id,run_number:nextNumber,status:'forming',team_size_threshold:required,required_team_size:required,has_started:false}).select('id,run_number,status,required_team_size,has_started').single();
      if(createError){const {data:concurrentRun}=await db.from('project_runs').select('id,run_number,status,required_team_size,has_started').eq('project_id',application.project_id).eq('status','forming').eq('has_started',false).order('run_number',{ascending:true}).limit(1).maybeSingle();if(!concurrentRun)throw createError;run=concurrentRun;}else{run=created;await db.from('project_activity_log').insert({project_id:application.project_id,project_run_id:run.id,event_type:'cohort_created',actor_type:'system',from_status:null,to_status:'forming',metadata:{project_type:project.project_type,run_number:run.run_number,required_team_size:required}});}
    }

    const {error:memberError}=await db.from('project_members').insert({project_id:application.project_id,project_run_id:run.id,user_id:application.user_id,project_role_id:application.project_role_id,team_role:'contributor',membership_status:'waiting'});
    if(memberError){if(['23505','23514'].includes(memberError.code||''))return NextResponse.json({error:'That team place changed while this approval was being processed. No existing cohort history was overwritten.'},{status:409});throw memberError;}
    await db.from('project_applications').update({project_run_id:run.id}).eq('id',id);

    if(project.project_type==='partner')await db.from('projects').update({status:['draft','pilot','recruiting','open'].includes(project.status)?'forming':project.status,updated_at:now}).eq('id',application.project_id);
    else await db.from('projects').update({status:'open',updated_at:now}).eq('id',application.project_id);

    const readiness=await assessProjectTeamReadiness({db,projectId:application.project_id,runId:run.id,requiredTeamSize:Number(run.required_team_size||project.team_size_threshold||5),assignLead:project.project_type==='open'});
    const applicationStatus=project.project_type==='open'&&readiness.ready?'team_complete':'waiting_for_team';
    const {data:updated,error}=await db.from('project_applications').update({status:applicationStatus,reviewer_notes:reviewerNotes||null,approved_at:now,decision_at:now,decision_reason:null,project_run_id:run.id,updated_at:now}).eq('id',id).select('id,status').single();
    if(error)throw error;

    await notifyUser(db,{userId:application.user_id,email,projectId:application.project_id,applicationId:id,type:comm.type,title:comm.title,body:memberMessage,actionUrl:'/member/applications',subject:`${comm.subject}: ${project.title}`,templateKey:'application_approved',payload:{project_title:project.title,team_number:run.run_number}});
    if(readiness.leadAssignedNow&&readiness.leadUserId){await notifyUser(db,{userId:readiness.leadUserId,email:await memberEmail(db,readiness.leadUserId),projectId:application.project_id,type:'project_lead_assigned',title:'You are the Project Lead',body:`You have been selected as Project Lead for Team ${run.run_number} on ${project.title}. Your leadership interest and Mettelo delivery history were considered alongside current lead workload.`,actionUrl:`/member/projects/${application.project_id}?run=${run.id}`,subject:`Project Lead: ${project.title}`});}

    if(readiness.ready&&project.project_type==='open'&&!run.has_started){
      const {data:startedRun,error:startError}=await db.from('project_runs').update({status:'active',kickoff_at:now,started_at:now,has_started:true,updated_at:now}).eq('id',run.id).eq('status','forming').eq('has_started',false).select('id').maybeSingle();
      if(startError)throw startError;
      if(startedRun){
        await db.from('project_members').update({membership_status:'active',activated_at:now}).eq('project_run_id',run.id).eq('membership_status','waiting');
        await db.from('project_applications').update({status:'team_complete',updated_at:now}).eq('project_run_id',run.id).in('status',['approved','waiting_for_team','accepted']);
        await db.from('project_activity_log').insert({project_id:application.project_id,project_run_id:run.id,event_type:'cohort_auto_started',actor_type:'system',from_status:'forming',to_status:'active',metadata:{run_number:run.run_number,filled:readiness.filled,required_team_size:readiness.threshold,lead_user_id:readiness.leadUserId,responsibility_coverage_ready:readiness.responsibilityCoverageReady,lab_ready:readiness.labReady}});
        const {data:members}=await db.from('project_members').select('user_id').eq('project_run_id',run.id).eq('membership_status','active');
        await Promise.all((members||[]).map(async member=>notifyUser(db,{userId:member.user_id,email:await memberEmail(db,member.user_id),projectId:application.project_id,type:'project_kickoff',title:'Your project is starting',body:`Team ${run!.run_number} for ${project.title} is ready. Open the workspace to meet the team and start work.`,actionUrl:`/member/projects/${application.project_id}?run=${run!.id}`,subject:`Your project is starting: ${project.title}`,templateKey:'project_kickoff',payload:{project_title:project.title,team_number:run!.run_number}})));
      }
    }

    return NextResponse.json({ok:true,application:updated,team:{id:run.id,filled:readiness.filled,threshold:readiness.threshold,full:readiness.full,lead_user_id:readiness.leadUserId,lead_ready:readiness.leadReady,responsibility_coverage_ready:readiness.responsibilityCoverageReady,lab_ready:readiness.labReady,ready:readiness.ready,blockers:readiness.blockers,run_number:run.run_number,status:readiness.ready&&project.project_type==='open'?'active':'forming'},project_status:project.project_type==='open'?'open':'forming',communication:{body:memberMessage}});
  }catch(error){console.error('project request review error',error);return NextResponse.json({error:'Unable to update this project application.'},{status:500});}
}