import {expect,test,type Page} from '@playwright/test';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';

const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';
const password='Local-E2E-phase14-2026!';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function localUrl(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 14 pulse tests refuse non-local Supabase hosts.');return url}
function service(){return createClient(localUrl(),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function anon(){return createClient(localUrl(),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function mondayUtc(value=new Date()){const date=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));const day=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()-day+1);return date.toISOString().slice(0,10)}
async function userIdByEmail(db:ReturnType<typeof service>,email:string){const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const user=data.users.find(item=>item.email===email);if(!user)throw new Error(`Disposable identity ${email} was not seeded.`);return user.id}
async function signInClient(client:SupabaseClient,email:string,userPassword:string){const {error}=await client.auth.signInWithPassword({email,password:userPassword});if(error)throw error;return client}
async function signInPage(page:Page,email:string,userPassword:string,next:string,origin=''){await page.goto(`${origin}/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(email);await main.locator('input[type="password"]').fill(userPassword);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}

test.describe('Project Experience Phase 14 weekly pulse',()=>{
 test('member pulse, private RLS and Lead/Admin aggregate health work end to end',async({page,browser})=>{
  test.slow();
  const db=service();
  const memberEmail=required('E2E_MEMBER_EMAIL'),adminEmail=required('E2E_ADMIN_EMAIL');
  const memberId=await userIdByEmail(db,memberEmail);
  const leadEmail=`phase14-lead-${Date.now()}@example.test`,outsiderEmail=`phase14-outsider-${Date.now()}@example.test`;
  const leadCreated=await db.auth.admin.createUser({email:leadEmail,password,email_confirm:true});if(leadCreated.error||!leadCreated.data.user)throw leadCreated.error||new Error('Could not create Phase 14 lead.');
  const outsiderCreated=await db.auth.admin.createUser({email:outsiderEmail,password,email_confirm:true});if(outsiderCreated.error||!outsiderCreated.data.user)throw outsiderCreated.error||new Error('Could not create Phase 14 outsider.');
  const leadId=leadCreated.data.user.id,outsiderId=outsiderCreated.data.user.id,periodStart=mondayUtc();
  let originalMemberStatus:string|null=null,originalRunStatus:string|null=null;
  try{
   const [{data:membership,error:membershipError},{data:run,error:runError}]=await Promise.all([
    db.from('project_members').select('id,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',memberId).maybeSingle(),
    db.from('project_runs').select('status').eq('id',runId).eq('project_id',projectId).maybeSingle()
   ]);
   if(membershipError)throw membershipError;if(!membership)throw new Error('Phase 14 requires the seeded member to belong to the Lab run.');
   if(runError)throw runError;if(!run)throw new Error('Phase 14 requires the seeded Lab run.');
   originalMemberStatus=membership.membership_status;originalRunStatus=run.status;
   const memberActive=await db.from('project_members').update({membership_status:'active',activated_at:new Date().toISOString()}).eq('id',membership.id);if(memberActive.error)throw memberActive.error;
   const runActive=await db.from('project_runs').update({status:'active'}).eq('id',runId);if(runActive.error)throw runActive.error;
   const leadMembership=await db.from('project_members').insert({project_id:projectId,project_run_id:runId,user_id:leadId,team_role:'project_lead',membership_status:'active',activated_at:new Date().toISOString()}).select('id').single();if(leadMembership.error)throw leadMembership.error;

   const privilegedSpoof=await db.from('project_weekly_pulses').insert({project_member_id:leadMembership.data.id,project_id:projectId,project_run_id:runId,user_id:outsiderId,period_start:periodStart,progress:'on_track',workload:'manageable',team_state:'working_well',support_need:'no'});expect(privilegedSpoof.error).toBeTruthy();expect(privilegedSpoof.error?.message).toContain('Project pulse member, project, run and user do not match');

   await signInPage(page,memberEmail,required('E2E_MEMBER_PASSWORD'),`/member/projects/${projectId}?run=${runId}`);
   await expect(page.getByRole('heading',{name:'How is the project going this week?'})).toBeVisible();
   await expect(page.getByText('Your individual response is private.')).toBeVisible();
   const submitted=await page.context().request.post('/api/project-pulse',{data:{project_id:projectId,project_run_id:runId,progress:'some_risk',workload:'heavy',team_state:'some_friction',support_need:'maybe',note:'Private context for Phase 14 RLS verification.'}});expect(submitted.status()).toBe(200);
   const submittedBody=await submitted.json();expect(submittedBody.item.period_start).toBe(periodStart);expect(submittedBody.item.progress).toBe('some_risk');

   const memberClient=await signInClient(anon(),memberEmail,required('E2E_MEMBER_PASSWORD'));
   const own=await memberClient.from('project_weekly_pulses').select('project_member_id,user_id,progress,note').eq('project_run_id',runId).eq('period_start',periodStart);if(own.error)throw own.error;expect(own.data).toHaveLength(1);expect(own.data?.[0].project_member_id).toBe(membership.id);expect(own.data?.[0].user_id).toBe(memberId);expect(own.data?.[0].note).toContain('Private context');

   const leadClient=await signInClient(anon(),leadEmail,password);
   const hiddenRaw=await leadClient.from('project_weekly_pulses').select('project_member_id,user_id,progress,note').eq('project_run_id',runId).eq('period_start',periodStart);if(hiddenRaw.error)throw hiddenRaw.error;expect(hiddenRaw.data).toEqual([]);
   const leadHealth=await leadClient.rpc('project_weekly_pulse_health',{target_project:projectId,target_run:runId,target_period:periodStart});if(leadHealth.error)throw leadHealth.error;const leadRow=Array.isArray(leadHealth.data)?leadHealth.data[0]:leadHealth.data;expect(Number(leadRow.submissions)).toBe(1);expect(Number(leadRow.some_risk)).toBe(1);expect(Number(leadRow.heavy)).toBe(1);expect(Number(leadRow.some_friction)).toBe(1);expect(Number(leadRow.support_maybe)).toBe(1);expect('note' in leadRow).toBeFalsy();expect('user_id' in leadRow).toBeFalsy();expect('project_member_id' in leadRow).toBeFalsy();expect('health_score' in leadRow).toBeFalsy();

   const outsiderClient=await signInClient(anon(),outsiderEmail,password);
   const outsiderInsert=await outsiderClient.from('project_weekly_pulses').insert({project_member_id:membership.id,project_id:projectId,project_run_id:runId,user_id:outsiderId,period_start:periodStart,progress:'on_track',workload:'manageable',team_state:'working_well',support_need:'no'});expect(outsiderInsert.error).toBeTruthy();
   const outsiderApplicability=await outsiderClient.rpc('project_pulse_team_applicable',{target_project:projectId,target_run:runId,target_period:periodStart});expect(outsiderApplicability.error).toBeTruthy();
   const outsiderHealth=await outsiderClient.rpc('project_weekly_pulse_health',{target_project:projectId,target_run:runId,target_period:periodStart});expect(outsiderHealth.error).toBeTruthy();

   const updated=await page.context().request.post('/api/project-pulse',{data:{project_id:projectId,project_run_id:runId,progress:'blocked',workload:'unsustainable',team_state:'significant_concern',support_need:'yes',note:'Updated private context.'}});expect(updated.status()).toBe(200);
   const rows=await db.from('project_weekly_pulses').select('id,project_member_id,progress,workload,team_state,support_need,note').eq('project_run_id',runId).eq('user_id',memberId).eq('period_start',periodStart);if(rows.error)throw rows.error;expect(rows.data).toHaveLength(1);expect(rows.data?.[0]).toMatchObject({project_member_id:membership.id,progress:'blocked',workload:'unsustainable',team_state:'significant_concern',support_need:'yes',note:'Updated private context.'});

   const adminClient=await signInClient(anon(),adminEmail,required('E2E_ADMIN_PASSWORD'));
   const adminHealth=await adminClient.rpc('project_weekly_pulse_health',{target_project:projectId,target_run:runId,target_period:periodStart});if(adminHealth.error)throw adminHealth.error;const adminRow=Array.isArray(adminHealth.data)?adminHealth.data[0]:adminHealth.data;expect(Number(adminRow.submissions)).toBe(1);expect(Number(adminRow.blocked)).toBe(1);expect(Number(adminRow.unsustainable)).toBe(1);expect(Number(adminRow.significant_concern)).toBe(1);expect(Number(adminRow.support_yes)).toBe(1);expect('note' in adminRow).toBeFalsy();expect('user_id' in adminRow).toBeFalsy();expect('project_member_id' in adminRow).toBeFalsy();

   const origin=new URL(page.url()).origin;
   const adminBrowserContext=await browser.newContext();
   try{
    const adminPage=await adminBrowserContext.newPage();
    await signInPage(adminPage,adminEmail,required('E2E_ADMIN_PASSWORD'),'/admin/project-governance',origin);
    await expect(adminPage).toHaveURL(/\/admin\/project-governance/);
    const healthSection=adminPage.locator('section').filter({has:adminPage.getByRole('heading',{name:'Project health triage'})});
    await expect(healthSection).toBeVisible();
    await expect(healthSection.getByText('Individual responses, identities, private notes and productivity scores are not shown.')).toBeVisible();
    await expect(healthSection.getByText('Submitted')).toBeVisible();
    await expect(healthSection.getByText('Blocked')).toBeVisible();
   }finally{await adminBrowserContext.close()}
  }finally{
   await db.from('project_weekly_pulses').delete().eq('project_run_id',runId).in('user_id',[memberId,leadId,outsiderId]);
   await db.from('project_members').delete().eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',leadId);
   if(originalMemberStatus)await db.from('project_members').update({membership_status:originalMemberStatus}).eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',memberId);
   if(originalRunStatus)await db.from('project_runs').update({status:originalRunStatus}).eq('id',runId);
   await db.auth.admin.deleteUser(leadId);await db.auth.admin.deleteUser(outsiderId);
  }
 });
});
