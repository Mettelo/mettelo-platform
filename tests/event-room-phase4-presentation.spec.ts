import {expect,test,type Locator,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;
const longParticipantName='Participant-With-An-Extremely-Long-Identity-That-Must-Stay-In-The-Presentation-Rail';

type PresentationOwner='local'|'remote';

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
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2U0IiwiaXNzIjoicGhhc2U0LXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',url:'ws://10.255.255.1:65535',event:{id:eventId,title:'Phase 4 presentation acceptance room'},role:'contributor'})});
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

async function injectPresentation(page:Page,participants=6,owner:PresentationOwner='remote'){
 await page.evaluate(({count,presentationOwner,longName})=>{
  const inner=document.querySelector('.lk-video-conference-inner');
  if(!(inner instanceof HTMLElement))throw new Error('LiveKit conference inner surface not found.');
  inner.innerHTML='';
  const focus=document.createElement('div'); focus.className='lk-focus-layout'; focus.dataset.phase4Fixture='presentation'; focus.dataset.presentationOwner=presentationOwner;
  const rail=document.createElement('div'); rail.className='lk-carousel'; rail.dataset.phase4Fixture='rail';
  for(let index=0;index<count;index+=1){const tile=document.createElement('div');tile.className='lk-participant-tile';const name=document.createElement('span');name.className='lk-participant-name';name.textContent=index===count-1?longName:`Participant ${index+1}`;tile.appendChild(name);rail.appendChild(tile);}
  const stage=document.createElement('div');stage.className='lk-focus-layout-wrapper';stage.dataset.phase4Fixture='stage';const sharedTile=document.createElement('div');sharedTile.className='lk-participant-tile';sharedTile.dataset.source='screen_share';sharedTile.dataset.owner=presentationOwner;const video=document.createElement('video');video.dataset.phase4Fixture='screen-share';video.setAttribute('aria-label',presentationOwner==='local'?'Your shared screen':'Shared screen from another participant');sharedTile.appendChild(video);stage.appendChild(sharedTile);
  focus.appendChild(rail);focus.appendChild(stage);inner.appendChild(focus);
 },{count:participants,presentationOwner:owner,longName:longParticipantName});
 await expect(page.locator('[data-phase4-fixture="presentation"]')).toBeVisible();
}

async function exitPresentation(page:Page,participants=6){
 await page.evaluate(({count,longName})=>{const inner=document.querySelector('.lk-video-conference-inner');if(!(inner instanceof HTMLElement))throw new Error('LiveKit conference inner surface not found.');inner.innerHTML='';const grid=document.createElement('div');grid.className='lk-grid-layout';grid.dataset.phase4Fixture='normal-grid';for(let index=0;index<count;index+=1){const tile=document.createElement('div');tile.className='lk-participant-tile';const name=document.createElement('span');name.className='lk-participant-name';name.textContent=index===count-1?longName:`Participant ${index+1}`;tile.appendChild(name);grid.appendChild(tile);}inner.appendChild(grid);},{count:participants,longName:longParticipantName});
 await expect(page.locator('[data-phase4-fixture="normal-grid"]')).toBeVisible();
}

async function injectPresentationControls(page:Page){
 await page.evaluate(()=>{
  const conference=document.querySelector('.lk-video-conference');
  if(!(conference instanceof HTMLElement))throw new Error('LiveKit conference surface not found.');
  let bar=conference.querySelector('.lk-control-bar');
  if(!(bar instanceof HTMLElement)){bar=document.createElement('div');bar.className='lk-control-bar';bar.setAttribute('role','toolbar');bar.dataset.phase4Fixture='control-bar';conference.appendChild(bar);}
  bar.innerHTML='';
  for(const label of ['Microphone','Camera','Share screen','People','Chat','More','Leave']){const button=document.createElement('button');button.type='button';button.className='lk-button';button.dataset.phase4Fixture='control';button.textContent=label;bar.appendChild(button);}
 });
}

async function expectControlsReachable(page:Page,controlBar:Locator){
 const buttons=controlBar.locator('[data-phase4-fixture="control"]');await expect(buttons).toHaveCount(7);
 for(let index=0;index<7;index+=1){const button=buttons.nth(index);const box=await button.boundingBox();expect(box).not.toBeNull();if(!box)continue;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
 await buttons.first().scrollIntoViewIfNeeded();await expect(buttons.first()).toBeVisible();await buttons.last().scrollIntoViewIfNeeded();await expect(buttons.last()).toBeVisible();
 const report=await page.evaluate(()=>({rootClient:document.documentElement.clientWidth,rootScroll:document.documentElement.scrollWidth}));expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
}

async function geometry(page:Page){return page.evaluate(()=>{const focus=document.querySelector('[data-phase4-fixture="presentation"]')?.getBoundingClientRect();const stage=document.querySelector('[data-phase4-fixture="stage"]')?.getBoundingClientRect();const rail=document.querySelector('[data-phase4-fixture="rail"]')?.getBoundingClientRect();const video=document.querySelector('[data-phase4-fixture="screen-share"]');const root=document.documentElement;return{focus:focus&&{left:focus.left,right:focus.right,top:focus.top,bottom:focus.bottom,width:focus.width,height:focus.height},stage:stage&&{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom,width:stage.width,height:stage.height},rail:rail&&{left:rail.left,right:rail.right,top:rail.top,bottom:rail.bottom,width:rail.width,height:rail.height,clientWidth:(document.querySelector('[data-phase4-fixture="rail"]') as HTMLElement)?.clientWidth??0,scrollWidth:(document.querySelector('[data-phase4-fixture="rail"]') as HTMLElement)?.scrollWidth??0},objectFit:video instanceof HTMLElement?getComputedStyle(video).objectFit:'',rootClient:root.clientWidth,rootScroll:root.scrollWidth,viewportWidth:window.innerWidth,viewportHeight:window.innerHeight};});}

test('desktop presentation gives the shared screen roughly 80 percent of the content width and meaningful usable area',async({page})=>{test.slow();await openRoom(page,1440,900);await injectPresentation(page,6,'remote');const report=await geometry(page);expect(report.focus&&report.stage&&report.rail).toBeTruthy();if(!report.focus||!report.stage||!report.rail)return;const stageShare=report.stage.width/(report.stage.width+report.rail.width);expect(stageShare).toBeGreaterThanOrEqual(.76);expect(stageShare).toBeLessThanOrEqual(.82);expect(report.stage.left).toBeGreaterThan(report.rail.left);expect(report.stage.width).toBeGreaterThan(800);expect(report.stage.height).toBeGreaterThan(450);expect(report.objectFit).toBe('contain');expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);});

test('phone presentation stacks the shared screen above a contained horizontal participant rail',async({page})=>{test.slow();await openRoom(page,320,568);await injectPresentation(page,10,'remote');const report=await geometry(page);expect(report.focus&&report.stage&&report.rail).toBeTruthy();if(!report.focus||!report.stage||!report.rail)return;expect(report.stage.top).toBeLessThan(report.rail.top);expect(report.stage.width).toBeGreaterThanOrEqual(report.focus.width-20);expect(report.stage.height).toBeGreaterThan(report.rail.height*2.5);expect(report.rail.scrollWidth).toBeGreaterThan(report.rail.clientWidth);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.stage.bottom).toBeLessThanOrEqual(report.viewportHeight+1);expect(report.rail.bottom).toBeLessThanOrEqual(report.viewportHeight+1);});

test('short mobile landscape keeps the shared screen dominant with a vertical participant rail',async({page})=>{test.slow();await openRoom(page,844,390);await injectPresentation(page,8,'remote');const report=await geometry(page);expect(report.focus&&report.stage&&report.rail).toBeTruthy();if(!report.focus||!report.stage||!report.rail)return;const stageShare=report.stage.width/(report.stage.width+report.rail.width);expect(stageShare).toBeGreaterThanOrEqual(.74);expect(report.stage.left).toBeLessThan(report.rail.left);expect(report.stage.height).toBeGreaterThanOrEqual(report.focus.height-20);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);});

test('presentation rail contains dense participant content without expanding the Event Room',async({page})=>{test.slow();await openRoom(page,390,844);await injectPresentation(page,14,'remote');const shell=page.locator('[data-event-room-shell]');const rail=page.locator('[data-phase4-fixture="rail"]');await expect(shell).toBeVisible();await expect(rail).toBeVisible();const metrics=await page.evaluate(()=>({rootClient:document.documentElement.clientWidth,rootScroll:document.documentElement.scrollWidth,shell:(document.querySelector('[data-event-room-shell]') as HTMLElement).getBoundingClientRect(),rail:(document.querySelector('[data-phase4-fixture="rail"]') as HTMLElement).getBoundingClientRect(),longName:(document.querySelector('[data-phase4-fixture="rail"] .lk-participant-tile:last-child .lk-participant-name') as HTMLElement).getBoundingClientRect()}));expect(metrics.rootScroll).toBeLessThanOrEqual(metrics.rootClient+1);expect(metrics.rail.left).toBeGreaterThanOrEqual(metrics.shell.left-1);expect(metrics.rail.right).toBeLessThanOrEqual(metrics.shell.right+1);expect(metrics.longName.left).toBeGreaterThanOrEqual(metrics.rail.left-1);expect(metrics.longName.right).toBeLessThanOrEqual(metrics.rail.right+1);});

test('both remote and local share states use the same safe dominant presentation contract',async({page})=>{test.slow();await openRoom(page,1280,800);for(const owner of ['remote','local'] as const){await injectPresentation(page,6,owner);await expect(page.locator(`[data-presentation-owner="${owner}"]`)).toBeVisible();const report=await geometry(page);expect(report.stage&&report.rail).toBeTruthy();if(!report.stage||!report.rail)continue;expect(report.stage.width/(report.stage.width+report.rail.width)).toBeGreaterThanOrEqual(.75);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);}});

test('presentation lifecycle returns to the normal participant grid when sharing stops',async({page})=>{test.slow();await openRoom(page,390,844);await injectPresentation(page,8,'remote');await expect(page.locator('[data-phase4-fixture="presentation"]')).toBeVisible();await exitPresentation(page,8);await expect(page.locator('[data-phase4-fixture="presentation"]')).toHaveCount(0);await expect(page.locator('[data-phase4-fixture="normal-grid"]')).toBeVisible();const report=await page.evaluate(()=>({rootClient:document.documentElement.clientWidth,rootScroll:document.documentElement.scrollWidth,shell:(document.querySelector('[data-event-room-shell]') as HTMLElement).getBoundingClientRect(),viewportWidth:window.innerWidth,viewportHeight:window.innerHeight}));expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.shell.right).toBeLessThanOrEqual(report.viewportWidth+1);expect(report.shell.bottom).toBeLessThanOrEqual(report.viewportHeight+1);});

test('all critical Event Room controls remain reachable while presentation is active at 320px',async({page})=>{test.slow();await openRoom(page,320,568);await injectPresentation(page,10,'local');await injectPresentationControls(page);const controlBar=page.locator('.lk-control-bar');await expect(controlBar).toBeVisible({timeout:10_000});await expectControlsReachable(page,controlBar);const overflow=await controlBar.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,bottom:el.getBoundingClientRect().bottom,viewportHeight:window.innerHeight}));expect(overflow.scroll).toBeGreaterThanOrEqual(overflow.client);expect(overflow.bottom).toBeLessThanOrEqual(overflow.viewportHeight+1);});
