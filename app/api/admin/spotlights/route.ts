import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyUser,serviceDb} from '@/lib/project-flow';

async function admin(){const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();return user?.app_metadata?.role==='admin'?user:null;}

export async function PATCH(request:Request){
  try{
    const reviewer=await admin();if(!reviewer)return NextResponse.json({error:'Forbidden'},{status:403});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Service unavailable'},{status:503});
    const body=await request.json().catch(()=>({}));const id=typeof body.id==='string'?body.id:'';const action=typeof body.action==='string'?body.action:'';
    if(!id||!['request_consent','publish','exclude','restore'].includes(action))return NextResponse.json({error:'Invalid request'},{status:400});
    const now=new Date().toISOString();
    const {data:selected}=await db.from('spotlights').select('id,user_id,title,award_month,status,is_excluded,consent_status,selected_at').eq('id',id).maybeSingle();if(!selected)return NextResponse.json({error:'Spotlight not found'},{status:404});

    if(action==='request_consent'){
      if(selected.status!=='draft'||selected.is_excluded)return NextResponse.json({error:'Only an active draft can be sent for member consent.'},{status:409});
      if(selected.consent_status==='granted')return NextResponse.json({error:'This member has already granted publication consent.'},{status:409});
      const {data:item,error}=await db.from('spotlights').update({consent_status:'pending',consent_requested_at:now,selected_at:selected.selected_at||now,consented_at:null,consent_withdrawn_at:null,reviewed_by:reviewer.id,reviewed_at:now}).eq('id',id).select('id,consent_status').single();if(error)throw error;
      const {data:recipient}=await db.auth.admin.getUserById(selected.user_id);
      await notifyUser(db,{userId:selected.user_id,email:recipient.user?.email||null,type:'spotlight_consent',eventKey:'spotlight_published',title:'Review your Mettelo Spotlight recognition',body:`Mettelo selected you for ${selected.title}. Review the proposed recognition and choose whether it may be published publicly.`,actionUrl:'/member/spotlight',subject:`Review your Mettelo Spotlight recognition — ${selected.title}`,dedupeKey:`spotlight:${id}:consent-request:${now}`});
      return NextResponse.json({ok:true,item,message:'Publication consent requested from the member.'});
    }

    if(action==='publish'){
      const {data:winners,error:winnerError}=await db.from('spotlights').select('id,user_id,title,category,consent_status').eq('award_month',selected.award_month).eq('status','draft').eq('is_excluded',false);if(winnerError)throw winnerError;
      if((winners||[]).length<3)return NextResponse.json({error:'All three eligible monthly awards must be present before publication.'},{status:409});
      const withoutConsent=(winners||[]).filter(item=>item.consent_status!=='granted');if(withoutConsent.length)return NextResponse.json({error:`Publication is blocked until all three members grant consent. ${withoutConsent.length} consent response${withoutConsent.length===1?' is':'s are'} still outstanding.`},{status:409});
      const {error}=await db.from('spotlights').update({status:'published',published_at:now,reviewed_by:reviewer.id,reviewed_at:now}).eq('award_month',selected.award_month).eq('status','draft').eq('is_excluded',false).eq('consent_status','granted');if(error)throw error;
      for(const winner of winners||[]){const {data:recipient}=await db.auth.admin.getUserById(winner.user_id);await notifyUser(db,{userId:winner.user_id,email:recipient.user?.email||null,type:'spotlight_published',eventKey:'spotlight_published',title:'Your Mettelo Spotlight recognition is live',body:`Your ${winner.title} recognition is now published because you granted publication consent.`,actionUrl:`/spotlight/${winner.id}`,subject:`Mettelo Spotlight — ${winner.title}`,dedupeKey:`spotlight:${winner.id}:published`});}
      return NextResponse.json({ok:true,publishedMonth:selected.award_month});
    }

    const excluded=action==='exclude';const reason=excluded&&typeof body.reason==='string'?body.reason.trim().slice(0,500):null;
    const changes=excluded?{is_excluded:true,exclusion_reason:reason,selection_method:'override',consent_status:'not_requested',consent_requested_at:null,consented_at:null,consent_withdrawn_at:null,reviewed_by:reviewer.id,reviewed_at:now}:{is_excluded:false,exclusion_reason:null,selection_method:'automatic',reviewed_by:reviewer.id,reviewed_at:now};
    const {data:item,error}=await db.from('spotlights').update(changes).eq('id',id).select('id,is_excluded,exclusion_reason,consent_status').single();if(error)throw error;
    return NextResponse.json({ok:true,item});
  }catch(error){console.error('admin spotlight error',error);return NextResponse.json({error:'Unable to update Spotlight review.'},{status:500});}
}
