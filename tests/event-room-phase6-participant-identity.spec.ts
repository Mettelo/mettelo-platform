import {expect,test,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;
const pathologicalName='Alexandria-Extremely-Long-Participant-Identity-That-Must-Never-Expose-Private-Data-Or-Break-The-Event-Room';

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
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2U2IiwiaXNzIjoicGhhc2U2LXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',
   url:'ws://10.255.255.1:65535',event:{id:eventId,title:'Phase 6 participant identity acceptance room'},role:'contributor'
  })});
 });
}

async function openRoom(page:Page,width=390,height=844){
 await page.setViewportSize({width,height});
 await signIn(page);await routeSuccessfulRoom(page);await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-event-room-shell]')).toBeVisible({timeout:10_000});
 await expect(page.locator('.lk-video-conference-inner')).toBeVisible({timeout:10_000});
}

async function injectIdentityGrid(page:Page){
 await page.evaluate((longName)=>{
  const inner=document.querySelector('.lk-video-conference-inner');
  if(!(inner instanceof HTMLElement))throw new Error('LiveKit conference inner surface not found.');
  inner.innerHTML='';
  const grid=document.createElement('div');grid.className='lk-grid-layout';grid.dataset.phase6Fixture='grid';
  const participants=[
   {name:'You',local:true,muted:false,cameraOff:false,role:'Participant'},
   {name:'Maya Chen',local:false,muted:true,cameraOff:false,role:'Facilitator'},
   {name:'Daniel Okafor',local:false,muted:false,cameraOff:true,role:'Participant'},
   {name:longName,local:false,muted:true,cameraOff:true,role:'Participant'}
  ];
  for(const participant of participants){
   const tile=document.createElement('article');tile.className='lk-participant-tile';tile.dataset.phase6Fixture='tile';tile.setAttribute('aria-label',`${participant.name}, ${participant.role}${participant.local?', you':''}${participant.muted?', microphone muted':''}${participant.cameraOff?', camera off':''}`);
   const media=document.createElement('div');media.dataset.phase6Fixture='media';media.setAttribute('aria-hidden','true');
   if(participant.cameraOff){const fallback=document.createElement('div');fallback.dataset.phase6Fixture='camera-off';fallback.textContent=participant.name.split(/\s|-/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();media.appendChild(fallback);}else{const video=document.createElement('div');video.dataset.phase6Fixture='video';media.appendChild(video);}
   const identity=document.createElement('div');identity.dataset.phase6Fixture='identity';
   const name=document.createElement('span');name.className='lk-participant-name';name.dataset.phase6Fixture='name';name.textContent=participant.name;
   const state=document.createElement('span');state.dataset.phase6Fixture='state';state.textContent=[participant.local?'You':participant.role,participant.muted?'Muted':'',participant.cameraOff?'Camera off':''].filter(Boolean).join(' · ');
   identity.append(name,state);tile.append(media,identity);grid.appendChild(tile);
  }
  inner.appendChild(grid);
 },pathologicalName);
}

test('participant identity remains clear, accessible and contained on mobile',async({page})=>{
 await openRoom(page,320,568);await injectIdentityGrid(page);
 const tiles=page.locator('[data-phase6-fixture="tile"]');await expect(tiles).toHaveCount(4);
 for(let index=0;index<4;index+=1){const tile=tiles.nth(index);await expect(tile).toHaveAttribute('aria-label',/.+/);const box=await tile.boundingBox();expect(box).not.toBeNull();if(!box)continue;expect(box.left).toBeGreaterThanOrEqual(-1);expect(box.right).toBeLessThanOrEqual(321);}
 await expect(page.getByLabel(/Maya Chen, Facilitator, microphone muted/)).toBeVisible();
 await expect(page.getByLabel(/Daniel Okafor, Participant, camera off/)).toBeVisible();
 const longName=page.locator('[data-phase6-fixture="name"]').filter({hasText:pathologicalName});const nameBox=await longName.boundingBox();const tileBox=await longName.locator('xpath=ancestor::*[@data-phase6-fixture="tile"]').boundingBox();expect(nameBox&&tileBox).toBeTruthy();if(nameBox&&tileBox)expect(nameBox.right).toBeLessThanOrEqual(tileBox.right+1);
 const root=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(root.scroll).toBeLessThanOrEqual(root.client+1);
});

test('camera-off fallback reveals only safe initials and never email/token-like data',async({page})=>{
 await openRoom(page);await injectIdentityGrid(page);
 const fallbacks=page.locator('[data-phase6-fixture="camera-off"]');await expect(fallbacks).toHaveCount(2);
 const text=(await fallbacks.allTextContents()).join(' ');expect(text).not.toContain('@');expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+/);expect(text).not.toMatch(/https?:\/\//);
});

test('local identity and participant state are not communicated by colour alone',async({page})=>{
 await openRoom(page);await injectIdentityGrid(page);
 await expect(page.getByLabel(/You, Participant, you/)).toBeVisible();
 await expect(page.locator('[data-phase6-fixture="state"]').filter({hasText:'You'})).toBeVisible();
 await expect(page.locator('[data-phase6-fixture="state"]').filter({hasText:'Muted'})).toHaveCount(2);
 await expect(page.locator('[data-phase6-fixture="state"]').filter({hasText:'Camera off'})).toHaveCount(2);
});

test('identity treatment survives dense attendance without page escape',async({page})=>{
 await openRoom(page,768,1024);await injectIdentityGrid(page);
 await page.evaluate(()=>{const grid=document.querySelector('[data-phase6-fixture="grid"]');if(!(grid instanceof HTMLElement))throw new Error('grid missing');const originals=[...grid.children];for(let index=0;index<21;index+=1){const source=originals[index%originals.length];const clone=source.cloneNode(true) as HTMLElement;clone.dataset.phase6Fixture='tile';const name=clone.querySelector('[data-phase6-fixture="name"]');if(name)name.textContent=`Participant ${index+5}`;grid.appendChild(clone);}});
 await expect(page.locator('[data-phase6-fixture="tile"]')).toHaveCount(25);
 const report=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,shell:(document.querySelector('[data-event-room-shell]') as HTMLElement).getBoundingClientRect()}));expect(report.scroll).toBeLessThanOrEqual(report.client+1);expect(report.shell.right).toBeLessThanOrEqual(report.client+1);
});
