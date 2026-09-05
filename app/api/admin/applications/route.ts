import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

const reviewStatuses=new Set(['in_review','shortlisted','offered','declined']);
const allowedTransitions:Record<string,Set<string>>={
  submitted:new Set(['in_review','declined']),
  in_review:new Set(['shortlisted','declined']),
  shortlisted:new Set(['offered','declined']),
  offered:new Set(),
  declined:new Set(),
  withdrawn:new Set(),
  approved:new Set(),
  accepted:new Set(),
  waiting_for_team:new Set(),
  team_complete:new Set()
};

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

function defaultMessage(status:string,title:string,reviewerNotes:string,kind:string|null){
  const noun=kind==='interest'?'interest':'application';
  if(status==='in_review')return `Your project ${noun} for ${title} is now in review. No action is required from you right now. We will update My Mettelo when the next decision is available.`;
  if(status==='shortlisted')return `Your project ${noun} for ${title} has progressed to the shortlist. No action is required right now; we will contact you if we need more information before the final decision.`;
  if(status==='offered')return `Mettelo would like to offer you a place on ${title}. This selection does not enrol you automatically. Your place will only become confirmed after the explicit offer acceptance step is available.`;
  return `Your project ${noun} for ${title} was not selected for this team.${reviewerNotes?` ${reviewerNotes}`:''} You can continue exploring other Mettelo projects that match your profile.`;
}

function notificationMeta(status:string,kind:string|null){
  const label=kind==='interest'?'Project interest':'Project application';
  if(status==='in_review')return{type:'application_in_review',title:`${label} in review`,subject:`Your Mettelo ${label.toLowerCase()} is in review`};
  if(status==='shortlisted')return{type:'application_shortlisted',title:`${label} shortlisted`,subject:`Your Mettelo ${label.toLowerCase()} has been shortlisted`};
  if(status==='offered')return{type:'project_place_offered',title:'Project place offered',subject:'Mettelo project place offered'};
  return{type:'application_declined',title:`${label} update`,subject:`Your Mettelo ${label.toLowerCase()} has been updated`};
}

export async function PATCH(request:Request){
  try{
    const connection=await adminDb();
    if('error' in connection)return connection.error;
    const {db,user}=connection;
    const body=await request.json();
    const id=String(body.id||'');
    const status=String(body.status||'');
    const reviewerNotes=String(body.reviewer_notes||'').trim().slice(0,1500);
    const customMessage=String(body.custom_message||'').trim().slice(0,1800);

    if(!id||!reviewStatuses.has(status))return NextResponse.json({error:'Choose a valid project request and review action.'},{status:400});

    const {data:application,error:loadError}=await db
      .from('project_applications')
      .select('id,project_id,project_run_id,user_id,status,application_kind,admission_decision,reviewer_notes,projects(id,title,status,admission_mode)')
      .eq('id',id)
      .single();
    if(loadError||!application)return NextResponse.json({error:'Project request not found.'},{status:404});

    const project=Array.isArray(application.projects)?application.projects[0]:application.projects;
    if(!project)return NextResponse.json({error:'Project not found.'},{status:404});

    if(application.admission_decision==='auto_qualified'||project.admission_mode==='auto'){
      return NextResponse.json({error:'AUTO admissions are managed through the scheduled-start controls, not the human review queue.'},{status:409});
    }

    if(application.status===status){
      return NextResponse.json({ok:true,already_in_state:true,application:{id:application.id,status:application.status}});
    }

    const allowed=allowedTransitions[application.status]||new Set<string>();
    if(!allowed.has(status)){
      return NextResponse.json({error:`A project request cannot move from ${application.status.replaceAll('_',' ')} to ${status.replaceAll('_',' ')}.`},{status:409});
    }

    const now=new Date().toISOString();
    const patch:{status:string;reviewer_notes:string|null;decision_at?:string|null;decision_reason?:string|null;updated_at:string}={
      status,
      reviewer_notes:reviewerNotes||null,
      updated_at:now
    };
    if(status==='offered'){
      patch.decision_at=now;
      patch.decision_reason=reviewerNotes||null;
    }else if(status==='declined'){
      patch.decision_at=now;
      patch.decision_reason=reviewerNotes||null;
    }else{
      patch.decision_at=null;
      patch.decision_reason=null;
    }

    const {data:updated,error:updateError}=await db
      .from('project_applications')
      .update(patch)
      .eq('id',id)
      .eq('status',application.status)
      .select('id,status,updated_at')
      .maybeSingle();
    if(updateError)throw updateError;
    if(!updated)return NextResponse.json({error:'This project request changed while you were reviewing it. Refresh before trying again.'},{status:409});

    const eventInsert=await db.from('project_application_events').insert({
      application_id:id,
      from_status:application.status,
      to_status:status,
      actor_user_id:user.id,
      created_at:now
    });
    if(eventInsert.error)throw eventInsert.error;

    const activityInsert=await db.from('project_activity_log').insert({
      project_id:application.project_id,
      project_run_id:application.project_run_id||null,
      event_type:status==='offered'?'project_place_offered':`application_${status}`,
      actor_type:'admin',
      actor_user_id:user.id,
      from_status:application.status,
      to_status:status,
      metadata:{application_id:id,application_kind:application.application_kind,reviewer_notes:reviewerNotes||null}
    });
    if(activityInsert.error)throw activityInsert.error;

    const comm=notificationMeta(status,application.application_kind);
    const memberMessage=customMessage||defaultMessage(status,project.title,reviewerNotes,application.application_kind);
    await notifyUser(db,{
      userId:application.user_id,
      email:await memberEmail(db,application.user_id),
      projectId:application.project_id,
      applicationId:id,
      type:comm.type,
      title:comm.title,
      body:memberMessage,
      actionUrl:'/member/applications',
      subject:`${comm.subject}: ${project.title}`,
      templateKey:comm.type,
      payload:{project_title:project.title,review_status:status}
    });

    return NextResponse.json({
      ok:true,
      application:updated,
      selection:{status,creates_membership:false,requires_member_acceptance:status==='offered'},
      communication:{body:memberMessage}
    });
  }catch(error){
    console.error('project request review error',error);
    return NextResponse.json({error:'Unable to update this project request.'},{status:500});
  }
}
