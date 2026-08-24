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

async function routeSuccessfulRoom(page:Page){
 await page.route(`**/api/project-events/${eventId}/token`,async route=>{
  await route.fulfill({
   status:200,
   contentType:'application/json',
   body:JSON.stringify({
    token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2U0IiwiaXNzIjoicGhhc2U0LXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',
    url:'ws://10.255.255.1:65535',
    event:{id:eventId,title:'Phase 4 presentation acceptance room'},
    role:'contributor'
   })
  });
 });
}

async function openRoom(page:Page,width:number,height:number){
 await page.setViewportSize({width,height});
 await signIn(page);
 await routeSuccessfulRoom(page);
 await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-event-room-shell]')).toBeVisible({timeout:10_000});
 await expect(page.locator('.lk-video-conference-inner')).toBeVisible({timeout:10_000});
}

async function injectPresentation(page:Page,participants=6){
 await page.evaluate(count=>{
  const inner=document.querySelector('.lk-video-conference-inner');
  if(!(inner instanceof HTMLElement))throw new Error('LiveKit conference inner surface not found.');
  inner.innerHTML='';

  const focus=document.createElement('div');
  focus.className='lk-focus-layout';
  focus.dataset.phase4Fixture='presentation';

  const rail=document.createElement('div');
  rail.className='lk-carousel';
  rail.dataset.phase4Fixture='rail';
  for(let index=0;index<count;index+=1){
   const tile=document.createElement('div');
   tile.className='lk-participant-tile';
   const name=document.createElement('span');
   name.className='lk-participant-name';
   name.textContent=index===count-1?'Participant-With-An-Extremely-Long-Identity-That-Must-Stay-In-The-Presentation-Rail':`Participant ${index+1}`;
   tile.appendChild(name);
   rail.appendChild(tile);
  }

  const stage=document.createElement('div');
  stage.className='lk-focus-layout-wrapper';
  stage.dataset.phase4Fixture='stage';
  const sharedTile=document.createElement('div');
  sharedTile.className='lk-participant-tile';
  const video=document.createElement('video');
  video.dataset.phase4Fixture='screen-share';
  video.setAttribute('aria-label','Shared screen');
  sharedTile.appendChild(video);
  stage.appendChild(sharedTile);

  focus.appendChild(rail);
  focus.appendChild(stage);
  inner.appendChild(focus);
 },participants);
 await expect(page.locator('[data-phase4-fixture="presentation"]')).toBeVisible();
}

async function geometry(page:Page){
 return page.evaluate(()=>{
  const focus=document.querySelector('[data-phase4-fixture="presentation"]')?.getBoundingClientRect();
  const stage=document.querySelector('[data-phase4-fixture="stage"]')?.getBoundingClientRect();
  const rail=document.querySelector('[data-phase4-fixture="rail"]')?.getBoundingClientRect();
  const video=document.querySelector('[data-phase4-fixture="screen-share"]');
  const root=document.documentElement;
  return {
   focus:focus&&{left:focus.left,right:focus.right,top:focus.top,bottom:focus.bottom,width:focus.width,height:focus.height},
   stage:stage&&{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom,width:stage.width,height:stage.height},
   rail:rail&&{left:rail.left,right:rail.right,top:rail.top,bottom:rail.bottom,width:rail.width,height:rail.height,clientWidth:(document.querySelector('[data-phase4-fixture="rail"]') as HTMLElement)?.clientWidth??0,scrollWidth:(document.querySelector('[data-phase4-fixture="rail"]') as HTMLElement)?.scrollWidth??0},
   objectFit:video instanceof HTMLElement?getComputedStyle(video).objectFit:'',
   rootClient:root.clientWidth,
   rootScroll:root.scrollWidth,
   viewportWidth:window.innerWidth,
   viewportHeight:window.innerHeight
  };
 });
}

test('desktop presentation gives the shared screen roughly 80 percent of the content width',async({page})=>{
 test.slow();
 await openRoom(page,1440,900);
 await injectPresentation(page,6);
 const report=await geometry(page);
 expect(report.focus&&report.stage&&report.rail).toBeTruthy();
 if(!report.focus||!report.stage||!report.rail)return;
 const stageShare=report.stage.width/(report.stage.width+report.rail.width);
 expect(stageShare).toBeGreaterThanOrEqual(.76);
 expect(stageShare).toBeLessThanOrEqual(.82);
 expect(report.stage.left).toBeGreaterThan(report.rail.left);
 expect(report.objectFit).toBe('contain');
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
});

test('phone presentation stacks the shared screen above a contained horizontal participant rail',async({page})=>{
 test.slow();
 await openRoom(page,320,568);
 await injectPresentation(page,10);
 const report=await geometry(page);
 expect(report.focus&&report.stage&&report.rail).toBeTruthy();
 if(!report.focus||!report.stage||!report.rail)return;
 expect(report.stage.top).toBeLessThan(report.rail.top);
 expect(report.stage.width).toBeGreaterThanOrEqual(report.focus.width-20);
 expect(report.stage.height).toBeGreaterThan(report.rail.height*2.5);
 expect(report.rail.scrollWidth).toBeGreaterThan(report.rail.clientWidth);
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
 expect(report.stage.bottom).toBeLessThanOrEqual(report.viewportHeight+1);
 expect(report.rail.bottom).toBeLessThanOrEqual(report.viewportHeight+1);
});

test('short mobile landscape keeps the shared screen dominant with a vertical participant rail',async({page})=>{
 test.slow();
 await openRoom(page,844,390);
 await injectPresentation(page,8);
 const report=await geometry(page);
 expect(report.focus&&report.stage&&report.rail).toBeTruthy();
 if(!report.focus||!report.stage||!report.rail)return;
 const stageShare=report.stage.width/(report.stage.width+report.rail.width);
 expect(stageShare).toBeGreaterThanOrEqual(.74);
 expect(report.stage.left).toBeLessThan(report.rail.left);
 expect(report.stage.height).toBeGreaterThanOrEqual(report.focus.height-20);
 expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
});

test('presentation rail contains dense participant content without expanding the Event Room',async({page})=>{
 test.slow();
 await openRoom(page,390,844);
 await injectPresentation(page,14);
 const shell=page.locator('[data-event-room-shell]');
 const rail=page.locator('[data-phase4-fixture="rail"]');
 await expect(shell).toBeVisible();
 await expect(rail).toBeVisible();
 const metrics=await page.evaluate(()=>({
  rootClient:document.documentElement.clientWidth,
  rootScroll:document.documentElement.scrollWidth,
  shell:(document.querySelector('[data-event-room-shell]') as HTMLElement).getBoundingClientRect(),
  rail:(document.querySelector('[data-phase4-fixture="rail"]') as HTMLElement).getBoundingClientRect(),
  longName:(document.querySelector('[data-phase4-fixture="rail"] .lk-participant-tile:last-child .lk-participant-name') as HTMLElement).getBoundingClientRect()
 }));
 expect(metrics.rootScroll).toBeLessThanOrEqual(metrics.rootClient+1);
 expect(metrics.rail.left).toBeGreaterThanOrEqual(metrics.shell.left-1);
 expect(metrics.rail.right).toBeLessThanOrEqual(metrics.shell.right+1);
 expect(metrics.longName.right).toBeLessThanOrEqual(metrics.rail.right+1);
});
