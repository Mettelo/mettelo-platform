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

async function expectViewportSafe(page:Page,selector:string){
 const report=await page.evaluate((targetSelector)=>{
  const root=document.documentElement;
  const target=document.querySelector(targetSelector);
  if(!(target instanceof HTMLElement))return {found:false,rootClient:root.clientWidth,rootScroll:root.scrollWidth};
  const rect=target.getBoundingClientRect();
  return {
   found:true,
   rootClient:root.clientWidth,
   rootScroll:root.scrollWidth,
   left:rect.left,
   right:rect.right,
   top:rect.top,
   bottom:rect.bottom,
   width:rect.width,
   height:rect.height,
   viewportWidth:window.innerWidth,
   viewportHeight:window.innerHeight
  };
 },selector);
 expect(report.found).toBe(true);
 if(!report.found)return;
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
 expect(report.left).toBeGreaterThanOrEqual(-1);
 expect(report.right).toBeLessThanOrEqual(report.viewportWidth+1);
 expect(report.top).toBeGreaterThanOrEqual(-1);
 expect(report.bottom).toBeLessThanOrEqual(report.viewportHeight+1);
 expect(report.width).toBeGreaterThan(0);
 expect(report.height).toBeGreaterThan(0);
}

const matrix=[
 {name:'320x568 phone',width:320,height:568},
 {name:'360x740 phone',width:360,height:740},
 {name:'375x812 phone',width:375,height:812},
 {name:'390x844 phone',width:390,height:844},
 {name:'430x932 phone',width:430,height:932},
 {name:'844x390 mobile landscape',width:844,height:390},
 {name:'768x1024 tablet',width:768,height:1024},
 {name:'1024x768 tablet boundary',width:1024,height:768},
 {name:'1280x800 desktop',width:1280,height:800},
 {name:'1440x900 desktop',width:1440,height:900}
] as const;

for(const viewport of matrix){
 test(`Event Room shell is viewport-safe at ${viewport.name}`,async({page})=>{
  test.slow();
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  await signIn(page);
  await page.route(`**/api/project-events/${eventId}/token`,async route=>{
   await route.fulfill({
    status:200,
    contentType:'application/json',
    body:JSON.stringify({
     token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2UzIiwiaXNzIjoicGhhc2UzLXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',
     url:'ws://10.255.255.1:65535',
     event:{id:eventId,title:'Phase 3 extremely long Event Room title that must wrap safely without breaking the secure room viewport'},
     role:'contributor'
    })
   });
  });
  await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
  const shell=page.locator('[data-event-room-shell]');
  await expect(shell).toBeVisible({timeout:10_000});
  await expectViewportSafe(page,'[data-event-room-shell]');
  const notice=shell.locator('div').first();
  await expect(notice).toBeVisible();
  const controlBar=page.locator('.lk-control-bar');
  await expect(controlBar).toBeVisible({timeout:10_000});
  const controlMetrics=await controlBar.evaluate(el=>{const rect=el.getBoundingClientRect();return{left:rect.left,right:rect.right,bottom:rect.bottom,height:rect.height,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight}});
  expect(controlMetrics.left).toBeGreaterThanOrEqual(-1);
  expect(controlMetrics.right).toBeLessThanOrEqual(controlMetrics.viewportWidth+1);
  expect(controlMetrics.bottom).toBeLessThanOrEqual(controlMetrics.viewportHeight+1);
  expect(controlMetrics.height).toBeGreaterThanOrEqual(44);
 });
}

test('Phase 2 failure surface remains viewport-safe and actionable at 200 percent text sizing',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await signIn(page);
 await page.route(`**/api/project-events/${eventId}/token`,async route=>{
  await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'internal detail must never render',code:'TOKEN_ISSUE_FAILED',eventId,stage:'token'})});
 });
 await page.goto(joinUrl,{waitUntil:'networkidle'});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 await expect(page.getByRole('heading',{name:'We couldn’t prepare the room'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
 await expect(page.getByRole('link',{name:'View upcoming events'})).toBeVisible();
 await expectViewportSafe(page,'[data-event-room-surface="failure"]');
});

test('Phase 2 non-retryable state remains viewport-safe in short mobile landscape',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await signIn(page);
 await page.route(`**/api/project-events/${eventId}/token`,async route=>{
  await route.fulfill({status:425,contentType:'application/json',body:JSON.stringify({error:'The room opens 15 minutes before the event starts.',code:'TOO_EARLY',eventId,stage:'token'})});
 });
 await page.goto(joinUrl,{waitUntil:'networkidle'});
 await expect(page.getByRole('heading',{name:'Session not open yet'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Try again'})).toHaveCount(0);
 await expectViewportSafe(page,'[data-event-room-surface="failure"]');
});
