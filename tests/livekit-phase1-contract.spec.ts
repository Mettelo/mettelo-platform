import {expect,test,type APIRequestContext,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

type Credentials={email:string;password:string};
type JwtPayload={sub?:string;name?:string;metadata?:string;video?:{room?:string;roomJoin?:boolean;canPublish?:boolean;canSubscribe?:boolean;canPublishData?:boolean;roomAdmin?:boolean}};

const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';
const expectedLiveKitUrl='wss://livekit.phase1.invalid';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required for LiveKit Phase 1 contract QA.`);return value;}
function credentials(prefix:'MEMBER'|'ARCHITECT'|'ADMIN'):Credentials{return{email:required(`E2E_${prefix}_EMAIL`),password:required(`E2E_${prefix}_PASSWORD`)}};
function serviceDb(){return createClient(required('E2E_SUPABASE_URL'),required('E2E_SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})};
function decodeJwt(token:string):JwtPayload{const part=token.split('.')[1];if(!part)throw new Error('Token is not a JWT.');return JSON.parse(Buffer.from(part,'base64url').toString('utf8')) as JwtPayload;}

async function signIn(page:Page,account:Credentials,next='/member/events'){
 await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
 const main=page.locator('#main-content');
 await main.locator('input[type="email"]').fill(account.email);
 await main.locator('input[type="password"]').fill(account.password);
 await main.getByRole('button',{name:'Sign in →'}).click();
 await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function createEvent(request:APIRequestContext,title:string){
 const start=new Date(Date.now()+5*60*1000),end=new Date(start.getTime()+60*60*1000);
 const response=await request.post('/api/project-events',{data:{action:'create',project_id:projectId,project_run_id:runId,title,purpose:'Disposable Phase 1 LiveKit contract event.',event_type:'learning_session',visibility:'community_learning',agenda:'Exercise secure room token contracts.',learning_objectives:'Prove the Event Room access and token contract.',timezone:'Europe/London',starts_at:start.toISOString(),ends_at:end.toISOString(),capacity:20,meeting_mode:'mettelo_video',presenter_ids:[],required_attendee_ids:[]}});
 expect(response.status()).toBe(200);
 const body=await response.json();
 expect(typeof body.event_id).toBe('string');
 return body.event_id as string;
}

async function userId(email:string){
 const db=serviceDb();const {data,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;
 const user=data.users.find(item=>item.email?.toLowerCase()===email.toLowerCase());if(!user)throw new Error(`Missing E2E user ${email}.`);return user.id;
}

async function setEvent(eventId:string,values:Record<string,unknown>){const {error}=await serviceDb().from('project_meetings').update(values).eq('id',eventId);if(error)throw error;}
async function token(request:APIRequestContext,eventId:string){return request.post(`/api/project-events/${eventId}/token`);}

async function expectSuccessfulToken(response:Awaited<ReturnType<typeof token>>,{eventId,title,role,room,canPublish,roomAdmin}:{eventId:string;title:string;role:string;room:string;canPublish:boolean;roomAdmin:boolean}){
 expect(response.status()).toBe(200);const body=await response.json();
 expect(body.url).toBe(expectedLiveKitUrl);expect(body.event).toEqual({id:eventId,title});expect(body.role).toBe(role);expect(typeof body.token).toBe('string');
 const payload=decodeJwt(body.token);
 expect(payload.video?.roomJoin).toBe(true);expect(payload.video?.room).toBe(room);expect(payload.video?.canPublish).toBe(canPublish);expect(payload.video?.canSubscribe).toBe(true);expect(payload.video?.canPublishData).toBe(canPublish);expect(Boolean(payload.video?.roomAdmin)).toBe(roomAdmin);
 const metadata=JSON.parse(payload.metadata||'{}');expect(metadata).toMatchObject({eventId,projectId,projectRunId:runId,role});
 return payload;
}

test.describe.configure({mode:'serial'});
test.describe('Phase 1 LiveKit token contract',()=>{
 test('signed-out access is rejected with 401',async({request})=>{
  const response=await request.post('/api/project-events/00000000-0000-4000-8000-00000000dead/token');
  expect(response.status()).toBe(401);expect(await response.json()).toEqual({error:'Sign in to join this event.'});
 });

 test('active project member receives a scoped publish-capable JWT inside the join window',async({page})=>{
  const title=`Phase 1 member ${Date.now()}`;await signIn(page,credentials('ADMIN'));const eventId=await createEvent(page.context().request,title);const room=`phase1-member-${eventId}`;await setEvent(eventId,{provider_room_name:room});
  await page.context().clearCookies();await signIn(page,credentials('MEMBER'));
  const response=await token(page.context().request,eventId);const payload=await expectSuccessfulToken(response,{eventId,title,role:'contributor',room,canPublish:true,roomAdmin:false});expect(payload.sub).toBe(await userId(credentials('MEMBER').email));
 });

 test('unrelated signed-in member is rejected with 403',async({page})=>{
  await signIn(page,credentials('ADMIN'));const eventId=await createEvent(page.context().request,`Phase 1 denied ${Date.now()}`);await page.context().clearCookies();await signIn(page,credentials('ARCHITECT'));
  const response=await token(page.context().request,eventId);expect(response.status()).toBe(403);expect(await response.json()).toEqual({error:'You do not have permission to join this event.'});
 });

 test('explicit event participant can join and receives the participant role',async({page})=>{
  const title=`Phase 1 participant ${Date.now()}`;await signIn(page,credentials('ADMIN'));const eventId=await createEvent(page.context().request,title);const architectId=await userId(credentials('ARCHITECT').email);const room=`phase1-participant-${eventId}`;
  const {error}=await serviceDb().from('project_event_participants').insert({event_id:eventId,project_run_id:runId,user_id:architectId,event_role:'observer',invited_by:await userId(credentials('ADMIN').email)});if(error)throw error;await setEvent(eventId,{provider_room_name:room});
  await page.context().clearCookies();await signIn(page,credentials('ARCHITECT'));await expectSuccessfulToken(await token(page.context().request,eventId),{eventId,title,role:'observer',room,canPublish:false,roomAdmin:false});
 });

 test('reserved event attendee can join without gaining project membership',async({page})=>{
  const title=`Phase 1 reserved ${Date.now()}`;await signIn(page,credentials('ADMIN'));const eventId=await createEvent(page.context().request,title);const architectId=await userId(credentials('ARCHITECT').email);const room=`phase1-reserved-${eventId}`;
  const {error}=await serviceDb().from('project_event_registrations').upsert({event_id:eventId,project_run_id:runId,user_id:architectId,event_role:'learner',status:'reserved',registered_at:new Date().toISOString()},{onConflict:'event_id,user_id'});if(error)throw error;await setEvent(eventId,{provider_room_name:room});
  await page.context().clearCookies();await signIn(page,credentials('ARCHITECT'));await expectSuccessfulToken(await token(page.context().request,eventId),{eventId,title,role:'learner',room,canPublish:true,roomAdmin:false});
  const {data:membership,error:membershipError}=await serviceDb().from('project_members').select('id').eq('project_run_id',runId).eq('user_id',architectId).maybeSingle();if(membershipError)throw membershipError;expect(membership).toBeNull();
 });

 test('admin fallback can join and receives room-admin grant',async({page})=>{
  const title=`Phase 1 admin ${Date.now()}`;await signIn(page,credentials('ADMIN'));const eventId=await createEvent(page.context().request,title);const room=`phase1-admin-${eventId}`;await setEvent(eventId,{provider_room_name:room});await expectSuccessfulToken(await token(page.context().request,eventId),{eventId,title,role:'admin',room,canPublish:true,roomAdmin:true});
 });

 test('provider room fallback is deterministic when provider_room_name is absent',async({page})=>{
  const title=`Phase 1 fallback ${Date.now()}`;await signIn(page,credentials('ADMIN'));const eventId=await createEvent(page.context().request,title);await setEvent(eventId,{provider_room_name:null});await expectSuccessfulToken(await token(page.context().request,eventId),{eventId,title,role:'admin',room:`mettelo-${eventId}`,canPublish:true,roomAdmin:true});
 });

 test('too-early, cancelled and closed sessions stay blocked',async({page})=>{
  await signIn(page,credentials('ADMIN'));
  const early=await createEvent(page.context().request,`Phase 1 early ${Date.now()}`);await setEvent(early,{starts_at:new Date(Date.now()+60*60*1000).toISOString(),ends_at:new Date(Date.now()+2*60*60*1000).toISOString()});let response=await token(page.context().request,early);expect(response.status()).toBe(425);expect(await response.json()).toEqual({error:'The room opens 15 minutes before the event starts.'});
  const cancelled=await createEvent(page.context().request,`Phase 1 cancelled ${Date.now()}`);await setEvent(cancelled,{status:'cancelled'});response=await token(page.context().request,cancelled);expect(response.status()).toBe(410);expect(await response.json()).toEqual({error:'This event was cancelled.'});
  const closed=await createEvent(page.context().request,`Phase 1 closed ${Date.now()}`);await setEvent(closed,{starts_at:new Date(Date.now()-2*60*60*1000).toISOString(),ends_at:new Date(Date.now()-31*60*1000).toISOString()});response=await token(page.context().request,closed);expect(response.status()).toBe(410);expect(await response.json()).toEqual({error:'This room has closed.'});
 });
});
