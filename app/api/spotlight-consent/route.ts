import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyAdmins,serviceDb} from '@/lib/project-flow';
import {publishSpotlightIfReady,recordSpotlightEvent} from '@/lib/spotlight-workflow';

const actions=new Set(['grant','decline','withdraw']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();
    const {data:{user}}=await auth.auth.getUser();
    if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});

    const body=await request.json().catch(()=>({}));
    const id=String(body.id||''),action=String(body.action||'');
    if(!id||!actions.has(action))return NextResponse.json({error:'Choose a valid Spotlight response.'},{status:400});

    const db=serviceDb();
    if(!db)return NextResponse.json({error:'Spotlight service is unavailable.'},{status:503});
    const {data:item,error:readError}=await db.from('spotlights')
      .select('id,user_id,title,status,consent_status,award_month,is_excluded,publication_held')
      .eq('id',id).eq('user_id',user.id).maybeSingle();
    if(readError)throw readError;
    if(!item)return NextResponse.json({error:'Spotlight recognition not found.'},{status:404});

    const now=new Date().toISOString();
    if(action==='grant'){
      if(item.status!=='draft'||item.is_excluded||!['pending','declined','withdrawn','not_requested'].includes(item.consent_status))return NextResponse.json({error:'This recognition is not awaiting publication consent.'},{status:409});
      const {data:updated,error}=await db.from('spotlights').update({consent_status:'granted',consented_at:now,consent_withdrawn_at:null}).eq('id',id).eq('user_id',user.id).select('id,consent_status,status,publication_held').single();
      if(error)throw error;
      await recordSpotlightEvent(db,id,'consent_granted',user.id,{award_month:item.award_month});
      await notifyAdmins(db,{type:'spotlight_consent',eventKey:'spotlight_published',title:'Spotlight consent granted',body:`A member granted publication consent for ${item.title}. Publication is automatic unless the award is held or excluded.`,actionUrl:'/admin/spotlights',subject:'Spotlight consent granted',dedupeKey:`spotlight:${id}:consent-granted`});
      const publication=await publishSpotlightIfReady(db,id,user.id);
      return NextResponse.json({
        ok:true,
        item:publication.item||updated,
        publicUrl:publication.item?.status==='published'?`/spotlight/${id}`:null,
        message:publication.published?'Consent granted. Your Spotlight recognition is now public and ready to share.':'Consent granted. Publication will happen automatically when any active publication hold is cleared.'
      });
    }

    if(action==='decline'){
      if(item.status!=='draft'||item.is_excluded)return NextResponse.json({error:'This recognition is no longer awaiting a publication response.'},{status:409});
      const {data:updated,error}=await db.from('spotlights').update({consent_status:'declined',consented_at:null,consent_withdrawn_at:now}).eq('id',id).eq('user_id',user.id).select('id,consent_status,status,publication_held').single();
      if(error)throw error;
      await recordSpotlightEvent(db,id,'consent_declined',user.id,{award_month:item.award_month});
      await notifyAdmins(db,{type:'spotlight_consent',eventKey:'spotlight_published',title:'Spotlight publication declined',body:`A member declined public publication for ${item.title}. The recognition remains in their private Mettelo history.`,actionUrl:'/admin/spotlights',subject:'Spotlight publication declined',dedupeKey:`spotlight:${id}:consent-declined`});
      return NextResponse.json({ok:true,item:updated,publicUrl:null,message:'You declined public publication. Your recognition remains in your private Spotlight history.'});
    }

    if(!['granted','pending'].includes(item.consent_status)&&item.status!=='published')return NextResponse.json({error:'There is no active Spotlight publication consent to withdraw.'},{status:409});
    const changes=item.status==='published'
      ?{consent_status:'withdrawn',consented_at:null,consent_withdrawn_at:now,status:'archived',published_at:null}
      :{consent_status:'withdrawn',consented_at:null,consent_withdrawn_at:now};
    const {data:updated,error}=await db.from('spotlights').update(changes).eq('id',id).eq('user_id',user.id).select('id,consent_status,status,publication_held').single();
    if(error)throw error;
    await recordSpotlightEvent(db,id,'consent_withdrawn',user.id,{award_month:item.award_month,was_public:item.status==='published'});
    await notifyAdmins(db,{type:'spotlight_consent',eventKey:'spotlight_published',title:'Spotlight consent withdrawn',body:`A member withdrew publication consent for ${item.title}. Any public Spotlight URL is no longer available.`,actionUrl:'/admin/spotlights',subject:'Spotlight consent withdrawn',dedupeKey:`spotlight:${id}:consent-withdrawn`});
    return NextResponse.json({ok:true,item:updated,publicUrl:null,message:'Publication consent withdrawn. Your recognition remains in your private history and is no longer publicly available.'});
  }catch(error){
    console.error('spotlight consent error',error);
    return NextResponse.json({error:'Unable to update Spotlight consent.'},{status:500});
  }
}
