import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

type OfferResult={
  offer_id:string;
  application_id?:string;
  project_id?:string;
  status:'accepted'|'declined'|'expired';
  already_in_state?:boolean;
  expired?:boolean;
  creates_membership?:boolean;
  capacity_released?:boolean;
};
type OfferProject={title:string|null};
type OfferRow={
  id:string;
  application_id:string;
  project_id:string;
  user_id:string;
  expires_at:string;
  projects:OfferProject|OfferProject[]|null;
};

function mapRpcError(message:string){
  if(message.includes('OFFER_NOT_FOUND'))return{status:404,error:'Project offer not found.'};
  if(message.includes('OFFER_NOT_PENDING'))return{status:409,error:'This project offer has already been resolved. Refresh My Mettelo to see its current state.'};
  if(message.includes('APPLICATION_NOT_OFFERED'))return{status:409,error:'This project request is no longer awaiting an offer response. Refresh My Mettelo.'};
  if(message.includes('PROJECT_NOT_JOINABLE'))return{status:409,error:'This project is no longer able to accept this offer response.'};
  if(message.includes('OFFER_REQUIRES_REVIEW_REQUIRED')||message.includes('AUTO_OFFER_FORBIDDEN'))return{status:409,error:'This Offer is no longer valid for the project admission policy. Refresh My Mettelo.'};
  if(message.includes('ALREADY_PARTICIPATING'))return{status:409,error:'You are already participating in, confirmed for, or have completed this project.'};
  if(message.includes('OFFER_RESERVATION_INVALID'))return{status:409,error:'This reserved project place is no longer valid. Refresh My Mettelo before responding.'};
  if(message.includes('INVALID_OFFER_ACTION'))return{status:400,error:'Choose Accept place or Decline.'};
  if(message.includes('AUTH_REQUIRED'))return{status:401,error:'Your session has expired. Please sign in again.'};
  return{status:500,error:'We could not update this project offer right now.'};
}

async function memberEmail(db:NonNullable<ReturnType<typeof serviceDb>>,userId:string){
  const {data}=await db.auth.admin.getUserById(userId);
  return data.user?.email||null;
}

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Your session has expired. Please sign in again.'},{status:401});

    const body=await request.json().catch(()=>({}));
    const offerId=String(body.id||'').trim();
    const action=String(body.action||'').trim();
    if(!offerId||!['accept','decline'].includes(action)){
      return NextResponse.json({error:'Choose a valid project offer and response.'},{status:400});
    }

    const {data:resultData,error:resultError}=await auth.rpc('phase8_respond_to_project_offer',{
      p_offer_id:offerId,
      p_action:action
    });
    if(resultError){
      const mapped=mapRpcError(String(resultError.message||''));
      return NextResponse.json({error:mapped.error},{status:mapped.status});
    }

    const result=resultData as OfferResult;
    const db=serviceDb();
    let communicationRecorded=true;
    let projectTitle='your Mettelo project';

    if(db){
      const {data:offerData}=await db
        .from('project_offers')
        .select('id,application_id,project_id,user_id,expires_at,projects(title)')
        .eq('id',offerId)
        .single();
      const offer=offerData as unknown as OfferRow|null;
      const project=offer?(Array.isArray(offer.projects)?offer.projects[0]||null:offer.projects):null;
      projectTitle=project?.title||projectTitle;

      if(!result.already_in_state&&offer?.user_id===user.id){
        const isAccepted=result.status==='accepted';
        const isDeclined=result.status==='declined';
        const title=isAccepted?'Project place accepted':isDeclined?'Project place declined':'Project offer expired';
        const message=isAccepted
          ?`You accepted your place on ${projectTitle}. Your commitment is recorded. Mettelo will move this accepted place into the governed team-formation journey; project membership and private workspace access are not active yet.`
          :isDeclined
            ?`You declined your place on ${projectTitle}. The reserved capacity has been released and this offer is now closed.`
            :`Your offer for ${projectTitle} expired before a response was recorded. The reserved capacity has been released.`;
        try{
          await notifyUser(db,{
            userId:user.id,
            email:await memberEmail(db,user.id),
            projectId:offer.project_id,
            applicationId:offer.application_id,
            type:isAccepted?'project_offer_accepted':isDeclined?'project_offer_declined':'project_offer_expired',
            title,
            body:message,
            actionUrl:'/member/applications',
            subject:`${title} — ${projectTitle}`,
            templateKey:isAccepted?'project_offer_accepted':isDeclined?'project_offer_declined':'project_offer_expired',
            payload:{project_title:projectTitle,offer_id:offerId,offer_status:result.status},
            dedupeKey:`project-offer:${offerId}:${result.status}`
          });
        }catch(error){
          communicationRecorded=false;
          console.error('project offer response communication error',{offer_id:offerId,status:result.status,error});
        }
      }
    }else{
      communicationRecorded=false;
    }

    if(result.status==='expired'){
      return NextResponse.json({
        error:'This project offer has expired. The reserved place has been released.',
        offer:{id:result.offer_id,status:'expired'},
        application:{id:result.application_id,status:'expired'},
        participation:{creates_membership:false,capacity_released:true},
        communication:{recorded:communicationRecorded}
      },{status:409});
    }

    return NextResponse.json({
      ok:true,
      already_in_state:Boolean(result.already_in_state),
      offer:{id:result.offer_id,status:result.status},
      application:{id:result.application_id,status:result.status},
      participation:{creates_membership:false,capacity_released:Boolean(result.capacity_released)},
      communication:{recorded:communicationRecorded}
    });
  }catch(error){
    console.error('project offer response error',error);
    return NextResponse.json({error:'We could not update this project offer right now.'},{status:500});
  }
}
