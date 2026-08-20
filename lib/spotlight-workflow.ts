import type {SupabaseClient} from '@supabase/supabase-js';
import {notifyUser} from '@/lib/notifications';

type SpotlightLifecycleRow={id:string;user_id:string|null;title:string;award_month:string|null;status:string;consent_status:string;is_excluded:boolean;publication_held:boolean;selected_at?:string|null};
// These lifecycle milestones can happen at most once for a given recognition.
// Member consent decisions are intentionally NOT singleton events because a draft
// can move private -> granted -> withdrawn -> granted again before publication.
const singletonEvents=new Set(['selected','replacement_selected','consent_requested','published','excluded']);

export async function recordSpotlightEvent(db:SupabaseClient,spotlightId:string,eventType:string,actorUserId:string|null=null,metadata:Record<string,unknown>={}){
  const dedupeKey=singletonEvents.has(eventType)?`spotlight:${spotlightId}:event:${eventType}`:null;
  const {error}=await db.from('spotlight_events').insert({spotlight_id:spotlightId,actor_user_id:actorUserId,event_type:eventType,dedupe_key:dedupeKey,metadata});
  if(error&&error.code!=='23505')throw error;
}

async function recipientEmail(db:SupabaseClient,userId:string|null){if(!userId)return null;const {data,error}=await db.auth.admin.getUserById(userId);if(error){console.warn('Spotlight recipient lookup skipped',error);return null;}return data.user?.email||null;}

async function notifyConsentRequest(db:SupabaseClient,item:SpotlightLifecycleRow){
  if(!item.user_id)return;
  await notifyUser(db,{userId:item.user_id,email:await recipientEmail(db,item.user_id),type:'spotlight_consent',eventKey:'spotlight_published',title:'Your Mettelo Spotlight recognition is ready',body:`You have been recognised as ${item.title}. Review the evidence and choose whether this recognition may be published publicly.`,actionUrl:`/member/spotlight/${item.id}`,subject:`Your Mettelo Spotlight recognition — ${item.title}`,dedupeKey:`spotlight:${item.id}:consent-request`});
}

async function notifyPublished(db:SupabaseClient,item:SpotlightLifecycleRow){
  if(!item.user_id)return;
  await notifyUser(db,{userId:item.user_id,email:await recipientEmail(db,item.user_id),type:'spotlight_published',eventKey:'spotlight_published',title:'Your Mettelo Spotlight recognition is live',body:`Your ${item.title} recognition is now public because you granted publication consent. You can view or share the public recognition from My Mettelo.`,actionUrl:`/spotlight/${item.id}`,subject:`Mettelo Spotlight — ${item.title}`,dedupeKey:`spotlight:${item.id}:published`});
}

export async function requestSpotlightConsent(db:SupabaseClient,spotlightId:string){
  const {data:item,error:readError}=await db.from('spotlights').select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held,selected_at').eq('id',spotlightId).maybeSingle();
  if(readError)throw readError;
  // A publication hold pauses public exposure, not the member's right to decide.
  if(!item||!item.user_id||item.status!=='draft'||item.is_excluded)return {requested:false,item:null};
  if(item.consent_status==='granted')return {requested:false,item};

  if(item.consent_status==='pending'){
    // A previous run may have persisted the state before notification delivery failed.
    // Reissuing with a stable dedupe key repairs that partial run without duplicates.
    await notifyConsentRequest(db,item as SpotlightLifecycleRow);
    return {requested:false,item};
  }

  const now=new Date().toISOString();
  const {data:updated,error}=await db.from('spotlights').update({consent_status:'pending',consent_requested_at:now,selected_at:item.selected_at||now,consented_at:null,consent_withdrawn_at:null}).eq('id',spotlightId).eq('status','draft').select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held,selected_at').single();
  if(error)throw error;
  await recordSpotlightEvent(db,spotlightId,'consent_requested',null,{award_month:updated.award_month});
  await notifyConsentRequest(db,updated as SpotlightLifecycleRow);
  return {requested:true,item:updated};
}

export async function publishSpotlightIfReady(db:SupabaseClient,spotlightId:string,actorUserId:string|null=null){
  const {data,error:readError}=await db.from('spotlights').select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held').eq('id',spotlightId).maybeSingle();
  if(readError)throw readError;
  const item=itemOrNull(data);
  if(!item||item.status==='archived')return {published:false,item};
  if(item.status==='published'){
    await recordSpotlightEvent(db,spotlightId,'published',actorUserId,{award_month:item.award_month});
    await notifyPublished(db,item);
    return {published:false,item};
  }
  if(item.consent_status!=='granted'||item.is_excluded||item.publication_held)return {published:false,item};

  const now=new Date().toISOString();
  const {data:published,error}=await db.from('spotlights').update({status:'published',published_at:now}).eq('id',spotlightId).eq('status','draft').eq('consent_status','granted').eq('is_excluded',false).eq('publication_held',false).select('id,user_id,title,award_month,status,consent_status,is_excluded,publication_held').maybeSingle();
  if(error)throw error;
  if(!published)return {published:false,item};
  await recordSpotlightEvent(db,spotlightId,'published',actorUserId,{award_month:published.award_month});
  await notifyPublished(db,published as SpotlightLifecycleRow);
  return {published:true,item:published};
}

function itemOrNull(value:unknown){return value as SpotlightLifecycleRow|null;}
