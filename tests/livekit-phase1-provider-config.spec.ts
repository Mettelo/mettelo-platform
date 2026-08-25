import {expect,test,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
const projectId='00000000-0000-4000-8000-00000000e2e1';
const runId='00000000-0000-4000-8000-00000000e211';
function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required.`);return value;}
function admin():Credentials{return{email:required('E2E_ADMIN_EMAIL'),password:required('E2E_ADMIN_PASSWORD')}};
async function signIn(page:Page){await page.goto('/signin?next=%2Fmember%2Fevents',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(admin().email);await main.locator('input[type="password"]').fill(admin().password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});}

test('missing LiveKit server configuration fails closed with structured provider diagnostics',async({page})=>{
 await signIn(page);const start=new Date(Date.now()+5*60*1000),end=new Date(start.getTime()+60*60*1000);const title=`Phase 1 provider config ${Date.now()}`;
 const create=await page.context().request.post('/api/project-events',{data:{action:'create',project_id:projectId,project_run_id:runId,title,purpose:'Disposable provider configuration contract event.',event_type:'learning_session',visibility:'project_team',agenda:'Verify missing provider configuration fails closed.',learning_objectives:'Verify provider configuration handling.',timezone:'Europe/London',starts_at:start.toISOString(),ends_at:end.toISOString(),meeting_mode:'mettelo_video',presenter_ids:[],required_attendee_ids:[]}});expect(create.status()).toBe(200);const body=await create.json();
 const eventId=body.event_id as string;const response=await page.context().request.post(`/api/project-events/${eventId}/token`);expect(response.status()).toBe(503);expect(await response.json()).toEqual({error:'Live video is awaiting provider configuration.',code:'PROVIDER_NOT_CONFIGURED',eventId,stage:'token'});
});
