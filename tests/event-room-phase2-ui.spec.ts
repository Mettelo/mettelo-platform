import {expect,test,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;

function required(name:string){
 const value=process.env[name]?.trim();
 if(!value)throw new Error(`Missing ${name}.`);
 return value;
}

async function signIn(page:Page){
 await page.goto(`/signin?next=${encodeURIComponent(joinUrl)}`,{waitUntil:'networkidle'});
 const main=page.locator('#main-content');
 await main.locator('input[type="email"]').fill(required('E2E_MEMBER_EMAIL'));
 await main.locator('input[type="password"]').fill(required('E2E_MEMBER_PASSWORD'));
 await main.getByRole('button',{name:'Sign in →'}).click();
 await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

const nonRetryable=[
 {code:'TOO_EARLY',status:425,heading:'Session not open yet'},
 {code:'EVENT_CANCELLED',status:410,heading:'This session has been cancelled'},
 {code:'SESSION_ENDED',status:410,heading:'This session has ended'},
 {code:'NO_PERMISSION',status:403,heading:'You don’t have access to this session'},
 {code:'PROVIDER_NOT_CONFIGURED',status:503,heading:'Live video is currently unavailable'}
] as const;

for(const item of nonRetryable){
 test(`${item.code} renders the correct non-retryable Event Room state`,async({page})=>{
  await signIn(page);
  const secretMarker='phase2-never-render-this-secret';
  await page.route(`**/api/project-events/${eventId}/token`,async route=>{
   await route.fulfill({
    status:item.status,
    contentType:'application/json',
    body:JSON.stringify({error:item.code==='TOO_EARLY'?'The room opens 15 minutes before the event starts.':secretMarker,code:item.code,eventId,stage:'token'})
   });
  });
  await page.goto(joinUrl,{waitUntil:'networkidle'});
  const state=page.locator('[data-event-room-category]');
  await expect(state.getByRole('heading',{name:item.heading})).toBeVisible();
  await expect(state.getByRole('button',{name:'Try again'})).toHaveCount(0);
  await expect(page.getByText(secretMarker,{exact:false})).toHaveCount(0);
 });
}

test('token failure renders retry and Try again starts a fresh token attempt',async({page})=>{
 await signIn(page);
 let attempts=0;
 await page.route(`**/api/project-events/${eventId}/token`,async route=>{
  attempts+=1;
  await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'Unable to prepare secure room access.',code:'TOKEN_ISSUE_FAILED',eventId,stage:'token'})});
 });
 await page.goto(joinUrl,{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'We couldn’t prepare the room'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
 const beforeRetry=attempts;
 expect(beforeRetry).toBeGreaterThanOrEqual(1);
 await page.getByRole('button',{name:'Try again'}).click();
 await expect.poll(()=>attempts).toBeGreaterThan(beforeRetry);
});

test('unknown token failure renders a safe retryable fallback',async({page})=>{
 await signIn(page);
 const secretMarker='unknown-sensitive-provider-detail';
 await page.route(`**/api/project-events/${eventId}/token`,async route=>{
  await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:secretMarker,code:'UNEXPECTED_INTERNAL',eventId,stage:'token'})});
 });
 await page.goto(joinUrl,{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Something went wrong while joining'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
 await expect(page.getByText(secretMarker,{exact:false})).toHaveCount(0);
});

test('connection failure is distinct from token failure and offers retry',async({page})=>{
 test.slow();
 await signIn(page);
 let tokenRequests=0;
 await page.route(`**/api/project-events/${eventId}/token`,async route=>{
  tokenRequests+=1;
  await route.fulfill({
   status:200,
   contentType:'application/json',
   body:JSON.stringify({
    token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItZTJlIiwiaXNzIjoicGhhc2UyLXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',
    url:'ws://127.0.0.1:9',
    event:{id:eventId,title:'Phase 2 connection failure'},
    role:'contributor'
   })
  });
 });
 await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 const connectionState=page.locator('[data-event-room-category="connection_failure"]');
 await expect(connectionState.getByRole('heading',{name:'We couldn’t connect to the room'})).toBeVisible({timeout:20_000});
 await expect(connectionState).toHaveAttribute('data-event-room-stage','connection');
 await expect(connectionState.getByRole('button',{name:'Try again'})).toBeVisible();
 const beforeRetry=tokenRequests;
 expect(beforeRetry).toBeGreaterThanOrEqual(1);
 await connectionState.getByRole('button',{name:'Try again'}).click();
 await expect.poll(()=>tokenRequests).toBeGreaterThan(beforeRetry);
});
