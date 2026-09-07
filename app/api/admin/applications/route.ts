import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

const reviewStatuses=new Set(['in_review','clarification_requested','shortlisted','offered','declined']);

type ReviewStatus='in_review'|'clarification_requested'|'shortlisted'|'offered'|'declined';

async function adminDb(){
  const auth=await createServerSupabaseClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return{error:NextResponse.json({error:'Authentication required.'},{status:401})};
  if(user.app_metadata?.role!=='admin')return{error:NextResponse.json({error:'Admin access required.'},{status:403})};
  const db=serviceDb();
  if(!db)return{error:NextResponse.json({error:'Admin data service is not configured.'},{status:503})};
  return{auth,db,user};
}

async function memberEmail(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){
  const {data}=await db.auth.admin.getUserById(userId);
  return data.user?.email||null;
}

function defaultMessage(status:ReviewStatus,title:string,reviewerNotes:string,kind:string|null,partnerName:string|null){
  const noun=kind==='interest'?'interest':'application';
  const owner=partnerName?`${partnerName} Partner Project`:`${title}`;
  if(status==='in_review')return `Your project ${noun} for ${title} is now in review. No action is required from you right now. We will update My Mettelo when the next decision is available.`;
  if(status==='clarification_requested')return `We need a little more information before we can continue reviewing your project ${noun} for ${title}.${reviewerNotes?` ${reviewerNotes}`:''} Open My Mettelo to review the request.`;
  if(status==='shortlisted')return `Your project ${noun} for ${title} has progressed to the shortlist. This is not yet a confirmed place. We will contact you when the next decision is available.`;
  if(status==='offered')return `Mettelo would like to offer you a place on ${owner}. This selection does not enrol you automatically. Explicit member acceptance remains required before membership or team formation.`;
  return `Your project ${noun} for ${title} was not selected for this team.${reviewerNotes?` ${reviewerNotes}`:''} You can continue exploring other Mettelo projects that match your profile.`;
}

function notificationMeta(status:ReviewStatus,kind:string|null){
  const label=kind==='interest'?'Project interest':'Project application';
  if(status==='in_review')return{type:'application_in_review',title:`${label} in review`,subject:`Your Mettelo ${label.toLowerCase()} is in review`};
  if(status==='clarification_requested')return{type:'application_clarification_requested',title:'More information requested',subject:'More information is needed for your Mettelo project request'};
  if(status==='shortlisted')return{type:'application_shortlisted',title:`${label} shortlisted`,subject:`Your Mettelo ${label.toLowerCase()} has been shortlisted`};
  if(status==='offered')return{type:'project_place_offered',title:'Project place offered',subject:'Mettelo project place offered'};
  return{type:'application_declined',title:`${label} update`,subject:`Your Mettelo ${label.toLowerCase()} has been updated`};
}

function rpcMessage(message:string){
  if(message.includes('OFFER_CAPACITY_FULL'))return{status:409,error:'This project no longer has capacity for another outstanding offer. Refresh the queue before making a different decision.'};
  if(message.includes('AUTO_REVIEW_FORBIDDEN'))return{status:409,error:'AUTO admissions are managed through the scheduled-start controls, not the human review queue.'};
  if(message.includes('INVALID_REVIEW_TRANSITION'))return{status:409,error:'This project request changed or cannot make that review transition. Refresh before trying again.'};
  if(message.includes('ADMIN_REQUIRED'))return{status:403,error:'Admin access required.'};
  if(message.includes('APPLICATION_NOT_FOUND'))return{status:404,error:'Project request not found.'};
  return{status:500,error:'Unable to update this project request.'};
}

export async function PATCH(request:Request){
  try{
    const connection=await adminDb();
    if('error' in connection)return connection.error;
    const {auth,db,user}=connection;
    const body=await request.json();
    const id=String(body.id||'');
    const status=String(body.status||'') as ReviewStatus;
    const reviewerNotes=String(body.reviewer_notes||'').trim().slice(0,1500);
    const customMessage=String(body.custom_message||'').trim().slice(0,1800);

    if(!id||!reviewStatuses.has(status))return NextResponse.json({error:'Choose a valid project request and review action.'},{status:400});
    if(status==='clarification_requested'&&!reviewerNotes&&!customMessage){
      return NextResponse.json({error:'Explain what information is needed before requesting clarification.'},{status:400});
    }

    const {data:application,error:loadError}=await db
      .from('project_applications')
      .select('id,project_id,project_run_id,user_id,status,application_kind,admission_decision,reviewer_notes,projects(id,title,status,project_type,partner_name,admission_mode)')
      .eq('id',id)
      .single();
    if(loadError||!application)return NextResponse.json({error:'Project request not found.'},{status:404});

    const project=Array.isArray(application.projects)?application.projects[0]:application.projects;
    if(!project)return NextResponse.json({error:'Project not found.'},{status:404});

    const {data:transition,error:transitionError}=await auth.rpc('phase7_transition_review_request',{
      p_application_id:id,
      p_to_status:status,
      p_reviewer_notes:reviewerNotes||null
    });
    if(transitionError){
      const mapped=rpcMessage(String(transitionError.message||''));
      return NextResponse.json({error:mapped.error},{status:mapped.status});
    }

    const result=transition as {id:string;status:string;previous_status?:string;already_in_state?:boolean;creates_membership?:boolean;requires_member_acceptance?:boolean;capacity?:unknown};
    if(result.already_in_state){
      return NextResponse.json({ok:true,already_in_state:true,application:{id:result.id,status:result.status},selection:{status:result.status,creates_membership:false,requires_member_acceptance:result.status==='offered'}});
    }

    const {data:offer}=status==='offered'
      ?await db.from('project_offers').select('id,expires_at').eq('application_id',id).maybeSingle()
      :{data:null};
    const expiryCopy=offer?.expires_at
      ?` Respond by ${new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/London'}).format(new Date(offer.expires_at))} UK time.`
      :'';

    const activityInsert=await db.from('project_activity_log').insert({
      project_id:application.project_id,
      project_run_id:application.project_run_id||null,
      event_type:status==='in_review'?'review_started':status==='clarification_requested'?'clarification_requested':status==='offered'?'project_place_offered':`application_${status}`,
      actor_type:'user',
      actor_user_id:user.id,
      from_status:application.status,
      to_status:status,
      metadata:{
        application_id:id,
        application_kind:application.application_kind,
        reviewer_notes:reviewerNotes||null,
        actor_role:'admin',
        project_type:project.project_type,
        partner_name:project.partner_name||null,
        creates_membership:false,
        capacity:result.capacity||null,
        offer_id:offer?.id||null,
        offer_expires_at:offer?.expires_at||null
      }
    });
    if(activityInsert.error)console.error('project review activity log error',activityInsert.error);

    const comm=notificationMeta(status,application.application_kind);
    const memberMessage=`${customMessage||defaultMessage(status,project.title,reviewerNotes,application.application_kind,project.partner_name||null)}${expiryCopy}`;
    let communicationRecorded=true;
    try{
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
        payload:{project_title:project.title,project_type:project.project_type,partner_name:project.partner_name||null,review_status:status,offer_id:offer?.id||null,offer_expires_at:offer?.expires_at||null},
        dedupeKey:status==='offered'&&offer?.id?`project-offer:${offer.id}:offered`:undefined
      });
    }catch(error){
      communicationRecorded=false;
      console.error('project review communication error',error);
    }

    return NextResponse.json({
      ok:true,
      application:{id:result.id,status:result.status},
      selection:{status:result.status,creates_membership:false,requires_member_acceptance:result.status==='offered',capacity:result.capacity||null,offer:offer?{id:offer.id,expires_at:offer.expires_at}:null},
      communication:{body:memberMessage,recorded:communicationRecorded}
    });
  }catch(error){
    console.error('project request review error',error);
    return NextResponse.json({error:'Unable to update this project request.'},{status:500});
  }
}
