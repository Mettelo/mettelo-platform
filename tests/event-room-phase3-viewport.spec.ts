import {expect,test,type Locator,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;
const longParticipantName='Alexandria-Extremely-Long-Participant-Identity-That-Must-Never-Expand-The-Event-Room-Outside-Its-Viewport';

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

async function routeSuccessfulRoom(page:Page){
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

async function expectRenderedControlsReachable(page:Page,controlBar:Locator){
 const buttons=controlBar.getByRole('button');
 const count=await buttons.count();
 expect(count).toBeGreaterThanOrEqual(3);

 for(let index=0;index<count;index+=1){
  const button=buttons.nth(index);
  const box=await button.boundingBox();
  expect(box).not.toBeNull();
  if(!box)continue;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
 }

 const first=buttons.first();
 const last=buttons.last();
 await first.scrollIntoViewIfNeeded();
 await expect(first).toBeVisible();
 await last.scrollIntoViewIfNeeded();
 await expect(last).toBeVisible();

 const report=await page.evaluate(()=>({rootClient:document.documentElement.clientWidth,rootScroll:document.documentElement.scrollWidth}));
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
}

async function injectRepresentativeParticipants(page:Page,count=6){
 await page.evaluate(({participantCount,longName})=>{
  const grid=document.querySelector('.lk-grid-layout');
  if(!(grid instanceof HTMLElement))throw new Error('LiveKit grid layout not found.');
  grid.innerHTML='';
  for(let index=0;index<participantCount;index+=1){
   const tile=document.createElement('div');
   tile.className='lk-participant-tile';
   tile.dataset.phase3Fixture='participant';
   tile.style.minHeight='96px';
   const name=document.createElement('span');
   name.className='lk-participant-name';
   name.textContent=index===participantCount-1?longName:`Participant ${index+1}`;
   tile.appendChild(name);
   grid.appendChild(tile);
  }
 },{participantCount:count,longName});
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
  await routeSuccessfulRoom(page);
  await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
  const shell=page.locator('[data-event-room-shell]');
  await expect(shell).toBeVisible({timeout:10_000});
  await expectViewportSafe(page,'[data-event-room-shell]');
  await expect(shell.locator('div').first()).toBeVisible();
  const controlBar=page.locator('.lk-control-bar');
  await expect(controlBar).toBeVisible({timeout:10_000});
  const controlMetrics=await controlBar.evaluate(el=>{const rect=el.getBoundingClientRect();return{left:rect.left,right:rect.right,bottom:rect.bottom,height:rect.height,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight}});
  expect(controlMetrics.left).toBeGreaterThanOrEqual(-1);
  expect(controlMetrics.right).toBeLessThanOrEqual(controlMetrics.viewportWidth+1);
  expect(controlMetrics.bottom).toBeLessThanOrEqual(controlMetrics.viewportHeight+1);
  expect(controlMetrics.height).toBeGreaterThanOrEqual(44);
 });
}

test('all rendered Event Room controls remain reachable at 320px without page overflow',async({page})=>{
 test.slow();
 await page.setViewportSize({width:320,height:568});
 await signIn(page);
 await routeSuccessfulRoom(page);
 await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 const controlBar=page.locator('.lk-control-bar');
 await expect(controlBar).toBeVisible({timeout:10_000});
 await expectRenderedControlsReachable(page,controlBar);
 const overflow=await controlBar.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
 expect(overflow.scroll).toBeGreaterThanOrEqual(overflow.client);
});

test('representative participant tiles and a pathological participant name stay contained on phone',async({page})=>{
 test.slow();
 await page.setViewportSize({width:320,height:568});
 await signIn(page);
 await routeSuccessfulRoom(page);
 await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('.lk-grid-layout')).toBeVisible({timeout:10_000});
 await injectRepresentativeParticipants(page,6);
 await expect(page.locator('[data-phase3-fixture="participant"]')).toHaveCount(6);
 await expectViewportSafe(page,'[data-event-room-shell]');
 const report=await page.evaluate((expectedLongName)=>{
  const root=document.documentElement;
  const tiles=[...document.querySelectorAll('[data-phase3-fixture="participant"]')];
  const grid=document.querySelector('.lk-grid-layout');
  const longName=[...document.querySelectorAll('.lk-participant-name')].find(el=>el.textContent===expectedLongName);
  const gridRect=grid?.getBoundingClientRect();
  return {
   rootClient:root.clientWidth,
   rootScroll:root.scrollWidth,
   tilesInside:tiles.every(tile=>{
    const rect=tile.getBoundingClientRect();
    return !!gridRect&&rect.left>=gridRect.left-1&&rect.right<=gridRect.right+1;
   }),
   longNameClient:longName instanceof HTMLElement?longName.clientWidth:0,
   longNameScroll:longName instanceof HTMLElement?longName.scrollWidth:0
  };
 },longParticipantName);
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
 expect(report.tilesInside).toBe(true);
 expect(report.longNameClient).toBeGreaterThan(0);
 expect(report.longNameScroll).toBeGreaterThanOrEqual(report.longNameClient);
});

test('representative participant tiles remain contained at the tablet boundary',async({page})=>{
 test.slow();
 await page.setViewportSize({width:768,height:1024});
 await signIn(page);
 await routeSuccessfulRoom(page);
 await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('.lk-grid-layout')).toBeVisible({timeout:10_000});
 await injectRepresentativeParticipants(page,9);
 await expect(page.locator('[data-phase3-fixture="participant"]')).toHaveCount(9);
 await expectViewportSafe(page,'[data-event-room-shell]');
 const report=await page.evaluate(()=>({rootClient:document.documentElement.clientWidth,rootScroll:document.documentElement.scrollWidth}));
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
});

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

test('Event Room survives a 200 percent browser-zoom reflow equivalent',async({page})=>{
 test.slow();
 // A 1280x800 browser viewport at 200% zoom exposes roughly a 640x400 CSS layout viewport.
 // Testing that effective viewport catches reflow/overflow defects that root-font scaling alone does not.
 await page.setViewportSize({width:640,height:400});
 await signIn(page);
 await routeSuccessfulRoom(page);
 await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 const shell=page.locator('[data-event-room-shell]');
 await expect(shell).toBeVisible({timeout:10_000});
 await expectViewportSafe(page,'[data-event-room-shell]');
 const controlBar=page.locator('.lk-control-bar');
 await expect(controlBar).toBeVisible({timeout:10_000});
 await expectRenderedControlsReachable(page,controlBar);
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
