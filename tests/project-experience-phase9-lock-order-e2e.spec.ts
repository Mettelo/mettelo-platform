import {createClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '../lib/project-participation-terms';

const projectId='00000000-0000-4000-8000-00000000c909';

function required(name:string){
  const value=process.env[name]?.trim();
  if(!value)throw new Error(`${name} is required`);
  return value;
}

function serviceDb(){
  const url=required('E2E_SUPABASE_URL');
  if(!['127.0.0.1','localhost'].includes(new URL(url).hostname)){
    throw new Error('Phase 9 lock-order tests refuse non-local Supabase hosts.');
  }
  return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
}

async function cleanup(client:ReturnType<typeof serviceDb>){
  const {data:apps}=await client.from('project_applications').select('id').eq('project_id',projectId);
  const appIds=(apps||[]).map(row=>row.id);
  await client.from('project_activity_log').delete().eq('project_id',projectId);
  await client.from('project_members').delete().eq('project_id',projectId);
  await client.from('project_offers').delete().eq('project_id',projectId);
  if(appIds.length)await client.from('project_application_events').delete().in('application_id',appIds);
  await client.from('project_applications').delete().eq('project_id',projectId);
  await client.from('project_runs').delete().eq('project_id',projectId);
  await client.from('project_roles').delete().eq('project_id',projectId);
  await client.from('projects').delete().eq('id',projectId);
}

async function memberIdentity(client:ReturnType<typeof serviceDb>){
  const {data,error}=await client.auth.admin.listUsers({page:1,perPage:1000});
  if(error)throw error;
  const member=data.users.find(user=>user.email===required('E2E_MEMBER_EMAIL'));
  if(!member)throw new Error('Disposable member identity is required.');
  return member;
}

async function withTimeout<T>(promise:Promise<T>,milliseconds=8000){
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    return await Promise.race([
      promise,
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('PHASE9_LOCK_ORDER_TIMEOUT')),milliseconds)}),
    ]);
  }finally{
    if(timer)clearTimeout(timer);
  }
}

test.describe('Project Experience Phase 9 Offer/membership lock ordering',()=>{
  test('acceptance and final-place membership settle without deadlock and consume reservation once',async()=>{
    const client=serviceDb();
    const member=await memberIdentity(client);
    await cleanup(client);
    try{
      const project=await client.from('projects').insert({
        id:projectId,
        slug:'phase9-lock-order-race',
        title:'Phase 9 lock order race',
        summary:'Disposable Phase 9 concurrency fixture.',
        problem_statement:'Verify accepted Offer reservation handoff cannot deadlock against canonical membership creation.',
        status:'open',
        visibility:'private',
        project_type:'open',
        applications_open:true,
        team_size_threshold:1,
        participation_mode:'solo',
        min_team_size:1,
        target_team_size:1,
        max_team_size:1,
        admission_mode:'review_required',
      });
      if(project.error)throw project.error;

      const runResult=await client.from('project_runs').insert({
        project_id:projectId,
        run_number:1,
        status:'forming',
        team_size_threshold:1,
        required_team_size:1,
        has_started:false,
        recruitment_open:true,
      }).select('id').single();
      if(runResult.error||!runResult.data)throw runResult.error||new Error('Could not create Phase 9 race run.');
      const runId=runResult.data.id as string;

      const now=new Date().toISOString();
      const appResult=await client.from('project_applications').insert({
        project_id:projectId,
        user_id:member.id,
        status:'shortlisted',
        application_kind:'interest',
        admission_mode_snapshot:'review_required',
        admission_decision:'review_required',
        participation_preference:'solo',
        contribution_statement:'Disposable Phase 9 final-place concurrency test interest.',
        terms_accepted_at:now,
        terms_version:PROJECT_PARTICIPATION_TERMS_VERSION,
        submitted_at:now,
      }).select('id').single();
      if(appResult.error||!appResult.data)throw appResult.error||new Error('Could not create Phase 9 race application.');

      const offered=await client.from('project_applications').update({status:'offered',updated_at:now}).eq('id',appResult.data.id);
      if(offered.error)throw offered.error;
      const offerResult=await client.from('project_offers').select('id,status,capacity_consumed_at').eq('application_id',appResult.data.id).single();
      if(offerResult.error||!offerResult.data)throw offerResult.error||new Error('Expected Phase 9 race Offer.');

      const memberClient=createClient(required('E2E_SUPABASE_URL'),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
      const signed=await memberClient.auth.signInWithPassword({email:required('E2E_MEMBER_EMAIL'),password:required('E2E_MEMBER_PASSWORD')});
      if(signed.error)throw signed.error;

      const race=await withTimeout(Promise.all([
        memberClient.rpc('phase8_respond_to_project_offer',{p_offer_id:offerResult.data.id,p_action:'accept'}),
        client.from('project_members').insert({
          project_id:projectId,
          project_run_id:runId,
          user_id:member.id,
          project_role_id:null,
          team_role:'contributor',
          membership_status:'waiting',
        }).select('id').single(),
      ]));

      const [accept,membership]=race;
      expect(accept.error).toBeNull();
      expect(accept.data).toMatchObject({status:'accepted'});
      if(membership.error){
        expect(membership.error.message).toContain('PARTICIPATION_CAPACITY_FULL');
        const retry=await withTimeout(client.from('project_members').insert({
          project_id:projectId,
          project_run_id:runId,
          user_id:member.id,
          project_role_id:null,
          team_role:'contributor',
          membership_status:'waiting',
        }).select('id').single());
        if(retry.error)throw retry.error;
      }

      const [{data:storedOffer,error:storedOfferError},{count:memberCount,error:memberCountError},{count:consumptionEvents,error:eventError}]=await Promise.all([
        client.from('project_offers').select('status,capacity_consumed_at,project_run_id').eq('id',offerResult.data.id).single(),
        client.from('project_members').select('id',{count:'exact',head:true}).eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',member.id).in('membership_status',['waiting','active']),
        client.from('project_activity_log').select('id',{count:'exact',head:true}).eq('project_id',projectId).eq('project_run_id',runId).eq('event_type','offer_capacity_consumed'),
      ]);
      if(storedOfferError)throw storedOfferError;
      if(memberCountError)throw memberCountError;
      if(eventError)throw eventError;
      expect(storedOffer).toMatchObject({status:'accepted',project_run_id:runId});
      expect(storedOffer?.capacity_consumed_at).toBeTruthy();
      expect(memberCount).toBe(1);
      expect(consumptionEvents).toBe(1);

      await memberClient.auth.signOut();
    }finally{
      await cleanup(client);
    }
  });
});
