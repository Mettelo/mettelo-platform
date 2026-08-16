import {NextResponse} from 'next/server';
import {createServerSupabaseClient} from '@/lib/supabase/server';
import {notifyAdmins,serviceDb} from '@/lib/project-flow';

const actions=new Set(['grant','decline','withdraw']);

export async function PATCH(request:Request){
  try{
    const auth=await createServerSupabaseClient();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});
    const body=await request.json().catch(()=>({}));const id=String(body.id||''),action=String(body.action||'');if(!id||!actions.has(action))return NextResponse.json({error:'Choose a valid Spotlight response.'},{status:400});
    const db=serviceDb();if(!db)return NextResponse.json({error:'Spotlight service is unavailable.'},{status:503});
    const {data:item}=await db.from('spotlights').select('id,user_id,title,status,consent_status,award_month').eq('id',id).eq('user_id',user.id).maybeSingle();if(!item)return NextResponse.json({error:'Spotlight nomination not found.'},{status:404});
    const now=new Date().toISOString();
    if(action==='grant'){
      if(item.status!=='draft'||!['pending','declined','withdrawn'].includes(item.consent_status))return NextResponse.json({error:'This nomination is not awaiting publication consent.'},{status:409});
      const {data,error}=await db.from('spotlights').update({consent_status:'granted',consented_at:now,consent_withdrawn_at:null}).eq('id',id).select('id,consent_status,status').single();if(error)throw error;
      await notifyAdmins(db,{type:'spotlight_consent',eventKey:'spotlight_published',title:'Spotlight consent granted',body:`A member granted publication consent for ${item.title}.`,actionUrl:'/admin/spotlights',subject:'Spotlight consent granted',dedupeKey:`spotlight:${id}:consent:${now}`});
      return NextResponse.json({ok:true,item:data,message:'Consent granted. Admin can now publish this recognition after the monthly cohort is ready.'});
    }
    if(action==='decline'){
      if(item.status!=='draft')return NextResponse.json({error:'This nomination is no longer awaiting a response.'},{status:409});
      const {data,error}=await db.from('spotlights').update({consent_status:'declined',consented_at:null,consent_withdrawn_at:now}).eq('id',id).select('id,consent_status,status').single();if(error)throw error;
      await notifyAdmins(db,{type:'spotlight_consent',eventKey:'spotlight_published',title:'Spotlight consent declined',body:`A member declined publication consent for ${item.title}.`,actionUrl:'/admin/spotlights',subject:'Spotlight consent declined',dedupeKey:`spotlight:${id}:declined:${now}`});
      return NextResponse.json({ok:true,item:data,message:'You declined public Spotlight publication. This recognition will not be made public.'});
    }
    const {data,error}=await db.from('spotlights').update({consent_status:'withdrawn',consented_at:null,consent_withdrawn_at:now,status:item.status==='published'?'archived':item.status}).eq('id',id).select('id,consent_status,status').single();if(error)throw error;
    await notifyAdmins(db,{type:'spotlight_consent',eventKey:'spotlight_published',title:'Spotlight consent withdrawn',body:`A member withdrew publication consent for ${item.title}.`,actionUrl:'/admin/spotlights',subject:'Spotlight consent withdrawn',dedupeKey:`spotlight:${id}:withdrawn:${now}`});
    return NextResponse.json({ok:true,item:data,message:'Publication consent withdrawn. The recognition is no longer publicly available.'});
  }catch(error){console.error('spotlight consent error',error);return NextResponse.json({error:'Unable to update Spotlight consent.'},{status:500});}
}
