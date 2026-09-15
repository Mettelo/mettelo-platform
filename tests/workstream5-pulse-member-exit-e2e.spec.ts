import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function localUrl(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Workstream 5 Pulse exit test refuses non-local Supabase hosts.');return url}
function service(){return createClient(localUrl(),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function anon(){return createClient(localUrl(),required('E2E_SUPABASE_ANON_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
function mondayUtc(value=new Date()){const date=new Date(Date.UTC(value.getUTCFullYear(),value.getUTCMonth(),value.getUTCDate()));const day=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()-day+1);return date.toISOString().slice(0,10)}
async function userIdByEmail(db:ReturnType<typeof service>,email:string){const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const user=data.users.find(item=>item.email===email);if(!user)throw new Error(`Disposable identity ${email} was not seeded.`);return user.id}
async function signedClient(email:string,password:string){const client=anon();const signed=await client.auth.signInWithPassword({email,password});if(signed.error)throw signed.error;return client}
async function signInPage(page:Page,email:string,password:string,next:string){await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(email);await main.locator('input[type="password"]').fill(password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}

test.describe('Workstream 5 Pulse member-exit privacy',()=>{
 test('member loses raw Pulse and Pulse API access immediately after canonical membership exit while history remains retained',async({page})=>{
  test.slow();
  const db=service();
  const email=required('E2E_MEMBER_EMAIL'),password=required('E2E_MEMBER_PASSWORD');
  const userId=await userIdByEmail(db,email),periodStart=mondayUtc();
  const membershipResult=await db.from('project_members').select('id,membership_status,left_at,activated_at').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',userId).maybeSingle();
  if(membershipResult.error)throw membershipResult.error;
  if(!membershipResult.data)throw new Error('Workstream 5 requires the seeded member to belong to the Phase 14 Lab run.');
  const membership=membershipResult.data;
  const runResult=await db.from('project_runs').select('status').eq('id',runId).eq('project_id',projectId).maybeSingle();
  if(runResult.error)throw runResult.error;
  if(!runResult.data)throw new Error('Workstream 5 requires the seeded Phase 14 Lab run.');
  const originalPulse=await db.from('project_weekly_pulses').select('*').eq('project_run_id',runId).eq('user_id',userId).eq('period_start',periodStart).maybeSingle();
  if(originalPulse.error)throw originalPulse.error;
  try{
   const activate=await db.from('project_members').update({membership_status:'active',left_at:null,activated_at:new Date().toISOString()}).eq('id',membership.id);if(activate.error)throw activate.error;
   const activateRun=await db.from('project_runs').update({status:'active'}).eq('id',runId);if(activateRun.error)throw activateRun.error;
   const seeded=await db.from('project_weekly_pulses').upsert({project_member_id:membership.id,project_id:projectId,project_run_id:runId,user_id:userId,period_start:periodStart,progress:'some_risk',workload:'heavy',team_state:'some_friction',support_need:'no',note:'Private Workstream 5 exit test note.'},{onConflict:'project_run_id,user_id,period_start'});if(seeded.error)throw seeded.error;

   const member:SupabaseClient=await signedClient(email,password);
   const before=await member.from('project_weekly_pulses').select('id,note').eq('project_run_id',runId).eq('period_start',periodStart);if(before.error)throw before.error;expect(before.data).toHaveLength(1);expect(before.data?.[0].note).toContain('Private Workstream 5');
   await signInPage(page,email,password,`/member/projects/${projectId}?run=${runId}`);
   const beforeApi=await page.context().request.get(`/api/project-pulse?project_id=${projectId}&project_run_id=${runId}`);expect(beforeApi.status()).toBe(200);

   const exited=await db.from('project_members').update({membership_status:'left',left_at:new Date().toISOString()}).eq('id',membership.id);if(exited.error)throw exited.error;
   const after=await member.from('project_weekly_pulses').select('id,note').eq('project_run_id',runId).eq('period_start',periodStart);if(after.error)throw after.error;expect(after.data).toEqual([]);
   const afterApi=await page.context().request.get(`/api/project-pulse?project_id=${projectId}&project_run_id=${runId}`);expect(afterApi.status()).toBe(403);
   const forged=await member.from('project_weekly_pulses').update({note:'should not write'}).eq('project_run_id',runId).eq('period_start',periodStart).select('id');expect(Boolean(forged.error)||forged.data?.length===0).toBe(true);
   const retained=await db.from('project_weekly_pulses').select('id,note').eq('project_run_id',runId).eq('user_id',userId).eq('period_start',periodStart);if(retained.error)throw retained.error;expect(retained.data).toHaveLength(1);
  }finally{
   await db.from('project_weekly_pulses').delete().eq('project_run_id',runId).eq('user_id',userId).eq('period_start',periodStart);
   if(originalPulse.data){const restore={...originalPulse.data};delete (restore as{blocked?:unknown}).blocked;delete (restore as{support_requested?:unknown}).support_requested;await db.from('project_weekly_pulses').insert(restore)}
   await db.from('project_members').update({membership_status:membership.membership_status,left_at:membership.left_at,activated_at:membership.activated_at}).eq('id',membership.id);
   await db.from('project_runs').update({status:runResult.data.status}).eq('id',runId);
  }
 });
});
