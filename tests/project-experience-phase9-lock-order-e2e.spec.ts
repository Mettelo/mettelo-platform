import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import {PROJECT_PARTICIPATION_TERMS_VERSION} from '../lib/project-participation-terms';

const projectId='00000000-0000-4000-8000-00000000c909';
const existingProjectId='00000000-0000-4000-8000-00000000e2e1';

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

async function withTimeout<T>(promise:PromiseLike<T>,milliseconds=8000){
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

async function signIn(page:Page,prefix:'MEMBER'|'ADMIN',next:string){
  const email=required(`E2E_${prefix}_EMAIL`);
  const password=required(`E2E_${prefix}_PASSWORD`);
  await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
  const main=page.locator('#main-content');
  await main.locator('input[type="email"]').fill(email);
  await main.locator('input[type="password"]').fill(password);
  await main.getByRole('button',{name:'Sign in →'}).click();
  await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function expectNoOverflow(page:Page,label:string){
  const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth+1);
}

async function expectVisibleFocus(page:Page){
  let found=false;
  for(let i=0;i<40;i++){
    await page.keyboard.press('Tab');
    const focus=await page.evaluate(()=>{
      const element=document.activeElement as HTMLElement|null;
      if(!element||element===document.body)return null;
      const style=getComputedStyle(element);
      return{outline:style.outlineStyle,width:parseFloat(style.outlineWidth||'0'),shadow:style.boxShadow};
    });
    if(focus&&((focus.outline!=='none'&&focus.width>0)||focus.shadow!=='none')){found=true;break}
  }
  expect(found,'Phase 9 interactive controls need visible keyboard focus').toBe(true);
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

test.describe('Project Experience Phase 9 real-surface responsive and accessibility contract',()=>{
  test('Member Project participation capacity reflows from 320px through desktop with semantic labels',async({page})=>{
    test.slow();
    await signIn(page,'MEMBER',`/member/discover/${existingProjectId}`);
    for(const viewport of [
      {name:'320px',width:320,height:900},
      {name:'phone landscape',width:844,height:390},
      {name:'tablet',width:768,height:1000},
      {name:'desktop',width:1440,height:1000},
    ]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      const response=await page.goto(`/member/discover/${existingProjectId}`,{waitUntil:'networkidle'});
      expect(response?.status(),`Member Project should render at ${viewport.name}`).toBe(200);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
      await expect(page.getByText('Participation',{exact:true}).first()).toBeVisible();
      await expect(page.getByText('Minimum to start',{exact:true}).first()).toBeVisible();
      await expect(page.getByText('Target team',{exact:true}).first()).toBeVisible();
      await expect(page.getByText('Maximum team',{exact:true}).first()).toBeVisible();
      await expectNoOverflow(page,`Member Project participation overflowed at ${viewport.name}`);
    }
  });

  test('Admin participation controls are accessible, responsive and expose fixed six-hour AUTO policy',async({page})=>{
    test.slow();
    await signIn(page,'ADMIN',`/admin/project-operations/projects/${existingProjectId}`);
    for(const viewport of [
      {name:'320px',width:320,height:900},
      {name:'phone landscape',width:844,height:390},
      {name:'tablet',width:768,height:1000},
      {name:'desktop',width:1440,height:1000},
    ]){
      await page.setViewportSize({width:viewport.width,height:viewport.height});
      const response=await page.goto(`/admin/project-operations/projects/${existingProjectId}`,{waitUntil:'networkidle'});
      expect(response?.status(),`Admin Project Operations should render at ${viewport.name}`).toBe(200);
      await expect(page.getByRole('heading',{name:'How this project forms and stays open'})).toBeVisible();
      for(const label of ['TEAM','SOLO','FLEXIBLE'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
      await expect(page.getByLabel('Auto-start intervention window')).toBeDisabled();
      await expect(page.getByLabel('Auto-start intervention window')).toHaveValue(/6 hours|Not applicable/);
      await expectNoOverflow(page,`Admin Phase 9 policy overflowed at ${viewport.name}`);
    }
    await expectVisibleFocus(page);
  });

  test('Phase 9 project surfaces reflow at 200 percent and retain readable text status',async({page})=>{
    await signIn(page,'ADMIN',`/admin/project-operations/projects/${existingProjectId}`);
    await page.setViewportSize({width:640,height:900});
    await page.goto(`/admin/project-operations/projects/${existingProjectId}`,{waitUntil:'networkidle'});
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    await expect(page.getByRole('heading',{name:'How this project forms and stays open'})).toBeVisible();
    await expect(page.getByText(/Minimum controls participation readiness/)).toBeVisible();
    await expectNoOverflow(page,'Phase 9 Admin policy overflowed at 200% text size');
    const radios=page.getByRole('radio',{name:/TEAM|SOLO|FLEXIBLE/i});
    expect(await radios.count()).toBeGreaterThanOrEqual(3);
    for(let i=0;i<await radios.count();i++)await expect(radios.nth(i)).toHaveAccessibleName(/\S+/);
  });
});