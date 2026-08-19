import type {SupabaseClient} from '@supabase/supabase-js';
import {notifyUser} from '@/lib/notifications';

type SpotlightLifecycleRow={
  id:string;
  user_id:string|null;
  title:string;
  award_month:string|null;
  status:string;
  consent_status:string;
  is_excluded:boolean;
  publication_held:boolean;
};

export async function recordSpotlightEvent(
  db:SupabaseClient,
  spotlightId:string,
  eventType:string,
  actorUserId:string|null=null,
  metadata:Record<string,unknown>={}
){
  const {error}=await db.from('spotlight_events').insert({
    spotlight_id:spotlightId,
    actor_user_id:actorUserId,
    event_type:eventType,
    metadata
  });
  if(error)throw error;
}

async function recipientEmail(db:SupabaseClient,userId:string|null){
  if(!userId)return null;
  const {data,error}=await db.auth.admin.getUserById(userId);
  if(error){console.warn('Spotlight recipient lookup skipped',error);return null;}
  return data.user?.email||null;
}

export async function requestSpotlightConsent(db:SupabaseClient,spotlightId:string){
  const {data:item,error:readError}=await db.from('spotlights')
    .select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held')
    .eq('id',spotlightId).maybeSingle();
  if(readError)throw readError;
  if(!item||!item.user_id||item.status!=='draft'||item.is_excluded||item.publication_held)return {requested:false,item:null};
  if(['pending','granted'].includes(item.consent_status))return {requested:false,item};

  const now=new Date().toISOString();
  const {data:updated,error}=await db.from('spotlights').update({
    consent_status:'pending',
    consent_requested_at:now,
    selected_at:now,
    consented_at:null,
    consent_withdrawn_at:null
  }).eq('id',spotlightId).eq('status','draft').select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held').single();
  if(error)throw error;

  await recordSpotlightEvent(db,spotlightId,'consent_requested',null,{award_month:updated.award_month});
  await notifyUser(db,{
    userId:updated.user_id,
    email:await recipientEmail(db,updated.user_id),
    type:'spotlight_consent',
    eventKey:'spotlight_published',
    title:'Your Mettelo Spotlight recognition is ready',
    body:`You have been recognised as ${updated.title}. Review the evidence and choose whether this recognition may be published publicly.`,
    actionUrl:`/member/spotlight/${updated.id}`,
    subject:`Your Mettelo Spotlight recognition — ${updated.title}`,
    dedupeKey:`spotlight:${updated.id}:consent-request`
  });
  return {requested:true,item:updated};
}

export async function publishSpotlightIfReady(
  db:SupabaseClient,
  spotlightId:string,
  actorUserId:string|null=null
){
  const {data,error:readError}=await db.from('spotlights')
    .select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held')
    .eq('id',spotlightId).maybeSingle();
  if(readError)throw readError;
  const item=itemOrNull(data);
  if(!item||item.status==='archived')return {published:false,item};
  if(item.status==='published')return {published:false,item};
  if(item.consent_status!=='granted'||item.is_excluded||item.publication_held)return {published:false,item};

  const now=new Date().toISOString();
  const {data:published,error}=await db.from('spotlights').update({
    status:'published',
    published_at:now
  }).eq('id',spotlightId)
    .eq('status','draft')
    .eq('consent_status','granted')
    .eq('is_excluded',false)
    .eq('publication_held',false)
    .select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held').maybeSingle();
  if(error)throw error;
  if(!published)return {published:false,item};

  await recordSpotlightEvent(db,spotlightId,'published',actorUserId,{award_month:published.award_month});
  if(published.user_id){
    await notifyUser(db,{
      userId:published.user_id,
      email:await recipientEmail(db,published.user_id),
      type:'spotlight_published',
      eventKey:'spotlight_published',
      title:'Your Mettelo Spotlight recognition is live',
      body:`Your ${published.title} recognition is now public because you granted publication consent. You can view or share the public recognition from My Mettelo.`,
      actionUrl:`/spotlight/${published.id}`,
      subject:`Mettelo Spotlight — ${published.title}`,
      dedupeKey:`spotlight:${published.id}:published`
    });
  }
  return {published:true,item:published};
}

function itemOrNull(value:unknown){return value as SpotlightLifecycleRow|null;}
