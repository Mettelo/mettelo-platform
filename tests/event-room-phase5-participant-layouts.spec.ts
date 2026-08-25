import {expect,test,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;
const longName='Alexandria-Participant-With-An-Extremely-Long-Professional-Identity-That-Must-Stay-In-The-Tile';

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`Missing ${name}.`);return value;}

async function signIn(page:Page){
 await page.goto(`/signin?next=${encodeURIComponent(joinUrl)}`,{waitUntil:'networkidle'});
 const main=page.locator('#main-content');
 await main.locator('input[type="email"]').fill(required('E2E_MEMBER_EMAIL'));
 await main.locator('input[type="password"]').fill(required('E2E_MEMBER_PASSWORD'));
 await main.getByRole('button',{name:'Sign in →'}).click();
 await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function routeSuccessfulRoom(page:Page){
 await page.route(`**/api/project-events/${eventId}/token`,async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2U1IiwiaXNzIjoicGhhc2U1LXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',url:'ws://10.255.255.1:65535',event:{id:eventId,title:'Phase 5 participant layout acceptance room'},role:'contributor'})}));
}

async function openRoom(page:Page,width:number,height:number){
 await page.setViewportSize({width,height});
 await signIn(page);await routeSuccessfulRoom(page);await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-event-room-shell]')).toBeVisible({timeout:10_000});
 await expect(page.locator('.lk-video-conference-inner')).toBeVisible({timeout:10_000});
}

async function injectGrid(page:Page,count:number){
 await page.evaluate(({participantCount,pathologicalName})=>{
  const inner=document.querySelector('.lk-video-conference-inner');
  if(!(inner instanceof HTMLElement))throw new Error('LiveKit conference inner surface not found.');
  inner.innerHTML='';
  const grid=document.createElement('div');grid.className='lk-grid-layout';grid.dataset.phase5Fixture='grid';
  for(let i=0;i<participantCount;i+=1){
   const tile=document.createElement('div');tile.className='lk-participant-tile';tile.dataset.phase5Fixture='tile';tile.dataset.participantId=`participant-${i+1}`;
   const video=document.createElement('video');video.setAttribute('aria-label',`Participant ${i+1} video`);tile.appendChild(video);
   const name=document.createElement('span');name.className='lk-participant-name';name.textContent=i===participantCount-1?pathologicalName:`Participant ${i+1}`;tile.appendChild(name);
   grid.appendChild(tile);
  }
  inner.appendChild(grid);
 },{participantCount:count,pathologicalName:longName});
 await expect(page.locator('[data-phase5-fixture="tile"]')).toHaveCount(count);
}

async function injectPresentation(page:Page,count:number){
 await page.evaluate(({participantCount,pathologicalName})=>{
  const inner=document.querySelector('.lk-video-conference-inner');
  if(!(inner instanceof HTMLElement))throw new Error('LiveKit conference inner surface not found.');
  inner.innerHTML='';
  const focus=document.createElement('div');focus.className='lk-focus-layout';focus.dataset.phase5Fixture='presentation';
  const rail=document.createElement('div');rail.className='lk-carousel';
  for(let i=0;i<participantCount;i+=1){const tile=document.createElement('div');tile.className='lk-participant-tile';tile.dataset.participantId=`participant-${i+1}`;const name=document.createElement('span');name.className='lk-participant-name';name.textContent=i===participantCount-1?pathologicalName:`Participant ${i+1}`;tile.appendChild(name);rail.appendChild(tile);}
  const stage=document.createElement('div');stage.className='lk-focus-layout-wrapper';const shared=document.createElement('div');shared.className='lk-participant-tile';shared.dataset.source='screen_share';const video=document.createElement('video');video.setAttribute('aria-label','Shared screen');shared.appendChild(video);stage.appendChild(shared);focus.appendChild(rail);focus.appendChild(stage);inner.appendChild(focus);
 },{participantCount:count,pathologicalName:longName});
 await expect(page.locator('[data-phase5-fixture="presentation"]')).toBeVisible();
}

async function metrics(page:Page){
 return page.evaluate(()=>{
  const grid=document.querySelector('[data-phase5-fixture="grid"]') as HTMLElement;
  const shell=document.querySelector('[data-event-room-shell]') as HTMLElement;
  const tiles=[...document.querySelectorAll('[data-phase5-fixture="tile"]')] as HTMLElement[];
  const names=[...document.querySelectorAll('[data-phase5-fixture="tile"] .lk-participant-name')] as HTMLElement[];
  const g=grid.getBoundingClientRect();const s=shell.getBoundingClientRect();
  const style=getComputedStyle(grid);const columns=style.gridTemplateColumns.split(' ').filter(Boolean).length;
  return {columns,grid:{left:g.left,right:g.right,top:g.top,bottom:g.bottom,width:g.width,height:g.height},shell:{left:s.left,right:s.right,top:s.top,bottom:s.bottom},clientHeight:grid.clientHeight,scrollHeight:grid.scrollHeight,clientWidth:grid.clientWidth,scrollWidth:grid.scrollWidth,rootClient:document.documentElement.clientWidth,rootScroll:document.documentElement.scrollWidth,tilesInside:tiles.every(tile=>{const r=tile.getBoundingClientRect();return r.left>=g.left-1&&r.right<=g.right+1&&r.top>=g.top-1;}),namesInside:names.every(name=>{const r=name.getBoundingClientRect();const tile=name.closest('.lk-participant-tile')?.getBoundingClientRect();return !!tile&&r.left>=tile.left-1&&r.right<=tile.right+1;})};
 });
}

const desktopCases=[
 {count:1,columns:1,label:'single participant hero'},
 {count:2,columns:2,label:'balanced pair'},
 {count:3,columns:2,label:'three participants'},
 {count:4,columns:2,label:'four participants'},
 {count:5,columns:3,label:'five participants'},
 {count:6,columns:3,label:'six participants'},
 {count:7,columns:3,label:'seven participants'},
 {count:9,columns:3,label:'nine participants'},
 {count:10,columns:4,label:'ten participant dense grid'},
] as const;

for(const item of desktopCases){
 test(`desktop ${item.label} uses the intended participant density`,async({page})=>{
  test.slow();await openRoom(page,1440,900);await injectGrid(page,item.count);const report=await metrics(page);
  expect(report.columns).toBe(item.columns);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.tilesInside).toBe(true);expect(report.namesInside).toBe(true);expect(report.grid.left).toBeGreaterThanOrEqual(report.shell.left-1);expect(report.grid.right).toBeLessThanOrEqual(report.shell.right+1);
 });
}

test('phone keeps one participant prominent and two participants vertically usable',async({page})=>{
 test.slow();await openRoom(page,320,568);
 await injectGrid(page,1);let report=await metrics(page);expect(report.columns).toBe(1);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
 await injectGrid(page,2);report=await metrics(page);expect(report.columns).toBe(1);expect(report.tilesInside).toBe(true);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
});

test('phone uses two columns from three participants upward without page overflow',async({page})=>{
 test.slow();await openRoom(page,320,568);
 for(const count of [3,4,6,9,12]){await injectGrid(page,count);const report=await metrics(page);expect(report.columns).toBe(2);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.tilesInside).toBe(true);expect(report.namesInside).toBe(true);}
});

test('short landscape increases useful horizontal density without escaping the room',async({page})=>{
 test.slow();await openRoom(page,844,390);
 await injectGrid(page,2);let report=await metrics(page);expect(report.columns).toBe(2);
 await injectGrid(page,6);report=await metrics(page);expect(report.columns).toBe(3);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.tilesInside).toBe(true);
 await injectGrid(page,12);report=await metrics(page);expect(report.columns).toBe(4);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);
});

test('10 plus participant layouts scroll inside the grid instead of growing the page',async({page})=>{
 test.slow();await openRoom(page,1024,768);await injectGrid(page,16);const report=await metrics(page);
 expect(report.columns).toBe(4);expect(report.scrollHeight).toBeGreaterThanOrEqual(report.clientHeight);expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth+1);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.namesInside).toBe(true);expect(report.grid.bottom).toBeLessThanOrEqual(report.shell.bottom+1);
});

test('25 participant room remains bounded and internally scrollable',async({page})=>{
 test.slow();await openRoom(page,1280,800);await injectGrid(page,25);const report=await metrics(page);
 expect(report.columns).toBe(4);expect(report.scrollHeight).toBeGreaterThan(report.clientHeight);expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth+1);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.tilesInside).toBe(true);expect(report.namesInside).toBe(true);expect(report.grid.bottom).toBeLessThanOrEqual(report.shell.bottom+1);
});

test('dense grid returns safely after presentation without losing participant identity',async({page})=>{
 test.slow();await openRoom(page,1024,768);await injectGrid(page,12);const before=await page.locator('[data-phase5-fixture="tile"]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.participantId));
 await injectPresentation(page,12);await expect(page.locator('.lk-carousel .lk-participant-tile')).toHaveCount(12);
 await injectGrid(page,12);const after=await page.locator('[data-phase5-fixture="tile"]').evaluateAll(nodes=>nodes.map(node=>(node as HTMLElement).dataset.participantId));
 expect(after).toEqual(before);const report=await metrics(page);expect(report.columns).toBe(4);expect(report.rootScroll).toBeLessThanOrEqual(report.rootClient+1);expect(report.namesInside).toBe(true);
});
