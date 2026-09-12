import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {expect,test} from '@playwright/test';

function env(){
  const url=process.env.E2E_SUPABASE_URL||'';
  const anon=process.env.E2E_SUPABASE_ANON_KEY||'';
  const service=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY||'';
  if(!url||!anon||!service)throw new Error('Missing isolated Supabase E2E credentials.');
  if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Workstream 1 security tests refuse non-local Supabase.');
  return{url,anon,service};
}

function token(prefix:string){return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`.replace(/[^a-z0-9_]/g,'').slice(0,28)}

async function createDisposableUser(admin:SupabaseClient,url:string,anon:string,label:string){
  const suffix=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const email=`w1-${label}-${suffix}@example.test`;
  const password='W1-local-test-password-123!';
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:`W1 ${label}`}});
  if(error||!data.user)throw error||new Error('Unable to create disposable Workstream 1 user.');
  const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const login=await client.auth.signInWithPassword({email,password});
  if(login.error)throw login.error;
  return{user:data.user,client,email,password};
}

async function removeUser(admin:SupabaseClient,userId:string){
  const result=await admin.auth.admin.deleteUser(userId);
  if(result.error)throw result.error;
}

test.describe('Workstream 1 canonical identity security',()=>{
  test('username claim/change is normalized, concurrency-safe, audited and keeps Member ID immutable',async()=>{
    test.setTimeout(120_000);
    const {url,anon,service}=env();
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const first=await createDisposableUser(admin,url,anon,'identity-a');
    const second=await createDisposableUser(admin,url,anon,'identity-b');
    const raceFirst=await createDisposableUser(admin,url,anon,'race-a');
    const raceSecond=await createDisposableUser(admin,url,anon,'race-b');
    const shared=token('w1shared');
    try{
      const before=await first.client.from('profiles').select('member_id,username').eq('id',first.user.id).single();
      expect(before.error).toBeNull();
      expect(before.data?.member_id).toMatch(/^MTL-\d{6,}$/);
      expect(before.data?.username).toBeNull();

      const claim=await first.client.rpc('claim_member_username',{p_username:'  W1_TestUser  '});
      expect(claim.error).toBeNull();
      const claimed=Array.isArray(claim.data)?claim.data[0]:claim.data;
      expect(claimed).toMatchObject({success:true,code:'CLAIMED',claimed_username:'w1_testuser'});
      expect(claimed?.claimed_member_id).toBe(before.data?.member_id);

      const changed=await first.client.rpc('change_member_username',{p_username:'w1_testuser2'});
      expect(changed.error).toBeNull();
      const changedRow=Array.isArray(changed.data)?changed.data[0]:changed.data;
      expect(changedRow).toMatchObject({success:true,code:'CHANGED',changed_username:'w1_testuser2'});
      expect(changedRow?.stable_member_id).toBe(before.data?.member_id);

      // Username history is intentionally a locked internal table. Even the
      // service-role REST client does not receive a direct table grant; the
      // SECURITY DEFINER identity functions are the controlled boundary.
      const serviceHistoryRead=await admin.from('member_username_history').select('user_id,username').eq('user_id',first.user.id);
      expect(serviceHistoryRead.error).not.toBeNull();

      const immediateSecondChange=await first.client.rpc('change_member_username',{p_username:'w1_testuser3'});
      expect(immediateSecondChange.error).toBeNull();
      const limited=Array.isArray(immediateSecondChange.data)?immediateSecondChange.data[0]:immediateSecondChange.data;
      expect(limited).toMatchObject({success:false,code:'RATE_LIMITED'});

      // This is the behavioral proof that the successful change wrote the old
      // handle into protected history: another account cannot reclaim it.
      const historicalReuse=await second.client.rpc('claim_member_username',{p_username:'w1_testuser'});
      expect(historicalReuse.error).toBeNull();
      const unavailable=Array.isArray(historicalReuse.data)?historicalReuse.data[0]:historicalReuse.data;
      expect(unavailable).toMatchObject({success:false,code:'UNAVAILABLE'});

      const directMemberIdMutation=await first.client.from('profiles').update({member_id:'MTL-999999'}).eq('id',first.user.id).select('member_id');
      expect(directMemberIdMutation.error).not.toBeNull();

      const historyRead=await first.client.from('member_username_history').select('username').eq('user_id',first.user.id);
      expect(historyRead.error).not.toBeNull();

      const [raceA,raceB]=await Promise.all([
        raceFirst.client.rpc('claim_member_username',{p_username:shared}),
        raceSecond.client.rpc('claim_member_username',{p_username:shared})
      ]);
      expect(raceA.error).toBeNull();
      expect(raceB.error).toBeNull();
      const rows=[Array.isArray(raceA.data)?raceA.data[0]:raceA.data,Array.isArray(raceB.data)?raceB.data[0]:raceB.data];
      expect(rows.filter(row=>row?.success===true)).toHaveLength(1);
      expect(rows.filter(row=>row?.code==='UNAVAILABLE')).toHaveLength(1);
    }finally{
      await Promise.all([
        removeUser(admin,first.user.id),
        removeUser(admin,second.user.id),
        removeUser(admin,raceFirst.user.id),
        removeUser(admin,raceSecond.user.id)
      ]);
    }
  });

  test('reserved and Unicode-confusable usernames are rejected without exposing another account',async()=>{
    const {url,anon,service}=env();
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const reservedUser=await createDisposableUser(admin,url,anon,'reserved');
    const confusableUser=await createDisposableUser(admin,url,anon,'confusable');
    try{
      const reserved=await reservedUser.client.rpc('claim_member_username',{p_username:'admin'});
      expect(reserved.error).toBeNull();
      const reservedRow=Array.isArray(reserved.data)?reserved.data[0]:reserved.data;
      expect(reservedRow).toMatchObject({success:false,code:'RESERVED'});
      expect(reservedRow?.claimed_username).toBeNull();

      const confusable=await confusableUser.client.rpc('claim_member_username',{p_username:'аdmin'}); // Cyrillic small a.
      expect(confusable.error).toBeNull();
      const confusableRow=Array.isArray(confusable.data)?confusable.data[0]:confusable.data;
      expect(confusableRow).toMatchObject({success:false,code:'INVALID'});
      expect(confusableRow?.claimed_username).toBeNull();
    }finally{
      await Promise.all([removeUser(admin,reservedUser.user.id),removeUser(admin,confusableUser.user.id)]);
    }
  });

  test('privacy preferences are owner-scoped and survive a fresh authenticated session',async()=>{
    const {url,anon,service}=env();
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const member=await createDisposableUser(admin,url,anon,'privacy');
    const other=await createDisposableUser(admin,url,anon,'privacy-other');
    try{
      const save=await member.client.rpc('phase18_save_member_privacy_preferences',{
        p_profile_discoverable:false,
        p_allow_project_invitations:false,
        p_allow_member_messages:false,
        p_allow_collaboration_recommendations:false
      });
      expect(save.error).toBeNull();

      const forged=await member.client.from('member_privacy_preferences').upsert({
        user_id:other.user.id,
        allow_project_invitations:true,
        allow_member_messages:true,
        allow_collaboration_recommendations:true
      },{onConflict:'user_id'}).select('user_id');
      expect(forged.error).not.toBeNull();

      const fresh=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
      const login=await fresh.auth.signInWithPassword({email:member.email,password:member.password});
      expect(login.error).toBeNull();
      const [profile,privacy]=await Promise.all([
        fresh.from('profiles').select('is_public').eq('id',member.user.id).single(),
        fresh.from('member_privacy_preferences').select('allow_project_invitations,allow_member_messages,allow_collaboration_recommendations').eq('user_id',member.user.id).single()
      ]);
      expect(profile.error).toBeNull();
      expect(profile.data?.is_public).toBe(false);
      expect(privacy.error).toBeNull();
      expect(privacy.data).toMatchObject({allow_project_invitations:false,allow_member_messages:false,allow_collaboration_recommendations:false});
    }finally{
      await Promise.all([removeUser(admin,member.user.id),removeUser(admin,other.user.id)]);
    }
  });
});
