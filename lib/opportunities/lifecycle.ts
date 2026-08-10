import { createClient } from '@supabase/supabase-js';

type LifecycleRow={id:string;source_url:string|null;official_application_url:string|null;closes_at:string|null;last_verified_at:string|null;next_verification_at:string|null;source_type:string|null;verification_failure_count:number|null;published_at:string|null;original_published_at:string|null};

function dbClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error('Opportunity lifecycle is not configured.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
async function expire(db:ReturnType<typeof dbClient>,id:string,reason:string){const now=new Date().toISOString();await db.from('opportunities').update({status:'expired',verification_status:'expired',expired_at:now,next_verification_at:null,last_verification_error:reason,updated_at:now}).eq('id',id);await db.from('opportunity_verification_checks').insert({opportunity_id:id,check_type:'lifecycle_expiry',result:'fail',score:0,detail:reason,checked_by:'opportunity-lifecycle-v1'});}
async function probe(url:string){try{let response=await fetch(url,{method:'HEAD',redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'user-agent':'Mettelo opportunity verifier'}});if(response.status===405)response=await fetch(url,{method:'GET',redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'user-agent':'Mettelo opportunity verifier'}});return {status:response.status,ok:response.ok||response.status===301||response.status===302||response.status===307||response.status===308,error:null};}catch(error){return {status:null,ok:false,error:error instanceof Error?error.message:String(error)};}}

export async function runOpportunityLifecycle(){
  const db=dbClient(),now=new Date(),nowIso=now.toISOString();
  const deadlineResult=await db.from('opportunities').select('id').eq('status','published').not('closes_at','is',null).lt('closes_at',nowIso).limit(500);
  let expiredByDeadline=0,expiredBySource=0,verifiedActive=0,transientFailures=0,expiredStale=0;
  for(const row of deadlineResult.data||[]){await expire(db,row.id,'Closing date has passed.');expiredByDeadline++;}

  const staleCutoff=new Date(now.getTime()-14*24*60*60*1000).toISOString();
  const stale=await db.from('opportunities').select('id,last_verified_at,source_type').eq('status','published').like('source_type','discovery_%').lt('last_verified_at',staleCutoff).limit(250);
  for(const row of stale.data||[]){await expire(db,row.id,'Opportunity has not been seen in its discovery source for 14 days.');expiredStale++;}

  const due=await db.from('opportunities').select('id,source_url,official_application_url,closes_at,last_verified_at,next_verification_at,source_type,verification_failure_count,published_at,original_published_at').eq('status','published').or(`next_verification_at.is.null,next_verification_at.lte.${nowIso}`).limit(60);
  for(const row of (due.data||[]) as LifecycleRow[]){const target=row.official_application_url||row.source_url;if(!target){await db.from('opportunities').update({next_verification_at:new Date(now.getTime()+24*60*60*1000).toISOString(),last_verification_error:'No source URL available for automated verification.',updated_at:nowIso}).eq('id',row.id);continue;}
    const result=await probe(target);if(result.ok){await db.from('opportunities').update({last_verified_at:nowIso,next_verification_at:new Date(now.getTime()+24*60*60*1000).toISOString(),verification_failure_count:0,last_verification_error:null,updated_at:nowIso}).eq('id',row.id);verifiedActive++;continue;}
    const previous=row.verification_failure_count||0,newFailures=previous+1;
    if(result.status===404||result.status===410){if(newFailures>=2){await expire(db,row.id,`Source returned ${result.status} on ${newFailures} consecutive checks.`);expiredBySource++;}else{await db.from('opportunities').update({verification_failure_count:newFailures,last_verification_error:`Source returned ${result.status}. Awaiting confirmation before expiry.`,next_verification_at:new Date(now.getTime()+6*60*60*1000).toISOString(),updated_at:nowIso}).eq('id',row.id);}continue;}
    transientFailures++;await db.from('opportunities').update({last_verification_error:result.error||`Source returned ${result.status||'unknown status'}.`,next_verification_at:new Date(now.getTime()+24*60*60*1000).toISOString(),updated_at:nowIso}).eq('id',row.id);
  }
  return {ok:true,expired_by_deadline:expiredByDeadline,expired_by_source:expiredBySource,expired_stale:expiredStale,verified_active:verifiedActive,transient_failures:transientFailures};
}
