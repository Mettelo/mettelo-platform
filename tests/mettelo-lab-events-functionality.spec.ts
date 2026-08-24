import {expect,test,type Browser,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

type Credentials={email:string;password:string};
const labProjectId='00000000-0000-4000-8000-00000000e2e1';
const labRunId='00000000-0000-4000-8000-00000000e211';
const labEventsUrl=`/member/projects/${labProjectId}?run=${labRunId}&view=events`;

function credentials(prefix:'MEMBER'|'ADMIN'):Credentials{
  const email=process.env[`E2E_${prefix}_EMAIL`]?.trim();
  const password=process.env[`E2E_${prefix}_PASSWORD`];
  if(!email||!password)throw new Error(`Missing E2E_${prefix}_EMAIL or E2E_${prefix}_PASSWORD.`);
  return{email,password};
}

function serviceDb(){
  const url=process.env.E2E_SUPABASE_URL?.trim();
  const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if(!url||!key)throw new Error('Missing isolated E2E Supabase service configuration.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

async function signIn(page:Page,account:Credentials,next:string){
  await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
  const main=page.locator('#main-content');
  await main.locator('input[type="email"]').fill(account.email);
  await main.locator('input[type="password"]').fill(account.password);
  await main.getByRole('button',{name:'Sign in →'}).click();
  await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function createEvent(page:Page,{title,visibility}:{title:string;visibility:'project_team'|'community_learning'}){
  const start=new Date(Date.now()+2*60*60*1000);
  const end=new Date(start.getTime()+60*60*1000);
  const deadline=new Date(start.getTime()-30*60*1000);
  const response=await page.context().request.post('/api/project-events',{
    data:{
      action:'create',
      project_id:labProjectId,
      project_run_id:labRunId,
      title,
      purpose:'Disposable E2E event used to verify Mettelo Lab event persistence and access.',
      event_type:'learning_session',
      visibility,
      agenda:'Verify create, refetch, public visibility and governed registration.',
      learning_objectives:'Verify the end-to-end Mettelo event lifecycle.',
      timezone:'Europe/London',
      starts_at:start.toISOString(),
      ends_at:end.toISOString(),
      capacity:8,
      registration_deadline:deadline.toISOString(),
      meeting_mode:'mettelo_video',
      presenter_ids:[],
      required_attendee_ids:[]
    }
  });
  expect(response.status()).toBe(200);
  const body=await response.json();
  expect(body.ok).toBe(true);
  expect(typeof body.event_id).toBe('string');
  return body.event_id as string;
}

async function moveIntoJoinWindow(eventId:string){
  const start=new Date(Date.now()+5*60*1000);
  const end=new Date(start.getTime()+60*60*1000);
  const {error}=await serviceDb().from('project_meetings').update({starts_at:start.toISOString(),ends_at:end.toISOString()}).eq('id',eventId);
  if(error)throw error;
}

async function anonymousPage(browser:Browser,origin:string){
  const context=await browser.newContext({baseURL:origin});
  const page=await context.newPage();
  return{context,page};
}

test.describe('Mettelo Lab governed event lifecycle',()=>{
  test('created events refetch into Lab, public opt-in is sanitised, and registration stays governed',async({page,browser})=>{
    test.slow();
    await signIn(page,credentials('ADMIN'),labEventsUrl);
    const suffix=Date.now().toString(36);
    const publicTitle=`E2E public learning ${suffix}`;
    const privateTitle=`E2E private session ${suffix}`;
    const publicEventId=await createEvent(page,{title:publicTitle,visibility:'community_learning'});
    await createEvent(page,{title:privateTitle,visibility:'project_team'});

    // The same authenticated PostgREST read used by the Lab page must be able to
    // refetch the service-created rows. This is the regression that previously
    // produced “created” followed by Upcoming · 0.
    await page.goto(labEventsUrl,{waitUntil:'networkidle'});
    await expect(page.getByText(publicTitle,{exact:true}).first()).toBeVisible();
    await expect(page.getByText(privateTitle,{exact:true}).first()).toBeVisible();
    await expect(page.locator(`a[href="/member/events/${publicEventId}/join"]`).first()).toBeVisible();

    // Public listing is deliberately checked from an anonymous browser context so
    // an admin session cannot accidentally satisfy the public.events RLS policy.
    const origin=new URL(page.url()).origin;
    const anon=await anonymousPage(browser,origin);
    try{
      await anon.page.goto('/events',{waitUntil:'networkidle'});
      await expect(anon.page.getByText(publicTitle,{exact:true})).toBeVisible();
      await expect(anon.page.getByText(privateTitle,{exact:true})).toHaveCount(0);
      const publicCard=anon.page.getByText(publicTitle,{exact:true}).locator('xpath=ancestor::article[1]');
      const registration=publicCard.locator(`a[href="/member/events?event=${publicEventId}"]`);
      await expect(registration).toBeVisible();
      await expect(publicCard).not.toContainText('livekit');
      await expect(publicCard).not.toContainText(labRunId);
    }finally{await anon.context.close();}

    // A normal member can use the existing event-only registration lifecycle.
    const memberContext=await browser.newContext({baseURL:origin});
    const memberPage=await memberContext.newPage();
    try{
      await signIn(memberPage,credentials('MEMBER'),'/member/events');
      const registrationResponse=await memberPage.context().request.post('/api/project-events',{
        data:{action:'register',project_id:labProjectId,project_run_id:labRunId,event_id:publicEventId,event_role:'learner'}
      });
      expect(registrationResponse.status()).toBe(200);
      const registrationBody=await registrationResponse.json();
      expect(registrationBody.status).toBe('reserved');

      // Reservation alone must not surface an active Join action before the
      // established 15-minute opening window.
      await memberPage.goto('/member/events',{waitUntil:'networkidle'});
      let memberCard=memberPage.getByText(publicTitle,{exact:true}).locator('xpath=ancestor::article[1]');
      await expect(memberCard.getByRole('link',{name:'Join session →'})).toHaveCount(0);
      await expect(memberCard).toContainText('Join available soon');
      const tokenResponse=await memberPage.context().request.post(`/api/project-events/${publicEventId}/token`);
      expect(tokenResponse.status()).toBe(425);

      // Once the same event moves inside the authorised join window, the member
      // workspace must surface the Join action without changing entitlement.
      await moveIntoJoinWindow(publicEventId);
      await memberPage.reload({waitUntil:'networkidle'});
      memberCard=memberPage.getByText(publicTitle,{exact:true}).locator('xpath=ancestor::article[1]');
      await expect(memberCard.getByRole('link',{name:'Join session →'})).toHaveAttribute('href',`/member/events/${publicEventId}/join`);
      await expect(memberCard).toContainText('Session is open');
    }finally{await memberContext.close();}
  });
});
