import {expect,test,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';
const password='Local-E2E-phase13-2026!';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required`);return value}
function service(){const url=required('E2E_SUPABASE_URL');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 13 collaboration tests refuse non-local Supabase hosts.');return createClient(url,required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page){await page.goto(`/signin?next=${encodeURIComponent(`/member/projects/${projectId}?run=${runId}&view=chat`)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required('E2E_MEMBER_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_MEMBER_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function memberUserId(db:ReturnType<typeof service>){const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const user=data.users.find(item=>item.email===required('E2E_MEMBER_EMAIL'));if(!user)throw new Error('Disposable member identity was not seeded.');return user.id}
async function setPreference(db:ReturnType<typeof service>,userId:string,inApp:boolean,email:boolean){await db.from('notification_preferences').delete().eq('user_id',userId).eq('event_key','project_mention');const inserted=await db.from('notification_preferences').insert({user_id:userId,event_key:'project_mention',in_app_enabled:inApp,email_enabled:email});if(inserted.error)throw inserted.error}
async function cleanup(db:ReturnType<typeof service>,targetId:string,messageIds:string[]){if(messageIds.length)await db.from('project_discussions').delete().in('id',messageIds);await db.from('notifications').delete().eq('user_id',targetId).eq('event_key','project_mention');await db.from('email_outbox').delete().eq('user_id',targetId).eq('event_key','project_mention');await db.from('notification_preferences').delete().eq('user_id',targetId).eq('event_key','project_mention');await db.from('project_members').delete().eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',targetId);await db.auth.admin.deleteUser(targetId)}

test.describe('Project Experience Phase 13 collaboration',()=>{
 test('Chat categories, mention preferences and active-team boundaries work end to end',async({page})=>{
  test.slow();const db=service();const senderId=await memberUserId(db);const email=`phase13-mention-${Date.now()}@example.test`;const created=await db.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw created.error||new Error('Could not create Phase 13 mention target.');const targetId=created.data.user.id;const messageIds:string[]=[];let senderMembershipId:string|null=null;let originalSenderStatus:string|null=null;
  try{
   const senderMembership=await db.from('project_members').select('id,membership_status').eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',senderId).maybeSingle();if(senderMembership.error)throw senderMembership.error;if(!senderMembership.data)throw new Error('Phase 13 requires the seeded member to belong to the Lab run.');senderMembershipId=senderMembership.data.id;originalSenderStatus=senderMembership.data.membership_status;await db.from('project_members').update({membership_status:'active'}).eq('id',senderMembership.data.id);
   const targetMembership=await db.from('project_members').insert({project_id:projectId,project_run_id:runId,user_id:targetId,team_role:'contributor',membership_status:'active',activated_at:new Date().toISOString()});if(targetMembership.error)throw targetMembership.error;
   await setPreference(db,targetId,true,false);
   await signIn(page);

   const first=await page.context().request.post('/api/project-collaboration',{data:{action:'discussion',project_id:projectId,project_run_id:runId,message_type:'question',body:'Can @phase13 confirm the delivery assumption?',mentioned_user_ids:[targetId]}});expect(first.status()).toBe(200);const firstBody=await first.json();expect(firstBody.item.message_type).toBe('question');messageIds.push(firstBody.item.id);
   const stored=await db.from('project_discussions').select('message_type,mentioned_user_ids').eq('id',firstBody.item.id).single();if(stored.error)throw stored.error;expect(stored.data.message_type).toBe('question');expect(stored.data.mentioned_user_ids).toContain(targetId);
   const notice=await db.from('notifications').select('event_key,channel').eq('user_id',targetId).eq('event_key','project_mention').eq('dedupe_key',`discussion:${firstBody.item.id}:mention:${targetId}`).maybeSingle();if(notice.error)throw notice.error;expect(notice.data?.event_key).toBe('project_mention');expect(notice.data?.channel).toBe('in_app');
   const emailRows=await db.from('email_outbox').select('id').eq('user_id',targetId).eq('event_key','project_mention');if(emailRows.error)throw emailRows.error;expect(emailRows.data).toEqual([]);

   await setPreference(db,targetId,false,false);
   const second=await page.context().request.post('/api/project-collaboration',{data:{action:'discussion',project_id:projectId,project_run_id:runId,message_type:'decision',body:'Decision recorded for the active team.',mentioned_user_ids:[targetId]}});expect(second.status()).toBe(200);const secondBody=await second.json();messageIds.push(secondBody.item.id);const suppressed=await db.from('notifications').select('id').eq('user_id',targetId).eq('dedupe_key',`discussion:${secondBody.item.id}:mention:${targetId}`);if(suppressed.error)throw suppressed.error;expect(suppressed.data).toEqual([]);

   await db.from('project_members').update({membership_status:'completed'}).eq('project_id',projectId).eq('project_run_id',runId).eq('user_id',targetId);
   const inactiveMention=await page.context().request.post('/api/project-collaboration',{data:{action:'discussion',project_id:projectId,project_run_id:runId,message_type:'update',body:'Completed members cannot be newly mentioned as active collaborators.',mentioned_user_ids:[targetId]}});expect(inactiveMention.status()).toBe(400);

   await db.from('project_members').update({membership_status:'completed'}).eq('id',senderMembership.data.id);
   const historicalRead=await page.context().request.get(`/api/project-collaboration?project_id=${projectId}&project_run_id=${runId}`);expect(historicalRead.status()).toBe(200);
   const completedWrite=await page.context().request.post('/api/project-collaboration',{data:{action:'discussion',project_id:projectId,project_run_id:runId,message_type:'update',body:'This write must be rejected.',mentioned_user_ids:[]}});expect(completedWrite.status()).toBe(403);
  }finally{if(senderMembershipId&&originalSenderStatus)await db.from('project_members').update({membership_status:originalSenderStatus}).eq('id',senderMembershipId);await cleanup(db,targetId,messageIds)}
 });
});
