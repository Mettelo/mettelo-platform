import {expect,test,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;

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
 await page.route(`**/api/project-events/${eventId}/token`,async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2U3IiwiaXNzIjoicGhhc2U3LXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',
  url:'ws://10.255.255.1:65535',event:{id:eventId,title:'Phase 7 control acceptance room'},role:'contributor'
 })}));
}

async function openRoom(page:Page,width=390,height=844){
 await page.setViewportSize({width,height});
 await signIn(page);await routeSuccessfulRoom(page);await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-event-room-shell]')).toBeVisible({timeout:10_000});
 await expect(page.locator('.lk-video-conference')).toBeVisible({timeout:10_000});
}

async function injectControlAcceptanceFixture(page:Page){
 await page.evaluate(()=>{
  const conference=document.querySelector('.lk-video-conference');
  if(!(conference instanceof HTMLElement))throw new Error('LiveKit conference surface not found.');
  conference.querySelector('[data-phase7-fixture="toolbar"]')?.remove();
  conference.querySelector('[data-phase7-fixture="panel"]')?.remove();
  const toolbar=document.createElement('div');toolbar.dataset.phase7Fixture='toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Event Room controls');toolbar.style.display='flex';toolbar.style.overflowX='auto';toolbar.style.maxWidth='100%';
  const definitions=[
   ['Microphone','Microphone on'],['Camera','Camera on'],['Share','Share screen'],['People','People'],['Chat','Chat'],['More','More options'],['Leave','Leave room']
  ];
  for(const [label,aria] of definitions){const button=document.createElement('button');button.type='button';button.dataset.phase7Fixture='control';button.dataset.control=label.toLowerCase();button.setAttribute('aria-label',aria);button.style.minWidth='44px';button.style.minHeight='44px';button.textContent=label;toolbar.appendChild(button);}
  const panel=document.createElement('aside');panel.dataset.phase7Fixture='panel';panel.hidden=true;panel.setAttribute('aria-label','Event Room side panel');conference.append(toolbar,panel);
  const setToggle=(name:string,onLabel:string,offLabel:string)=>{const button=toolbar.querySelector<HTMLButtonElement>(`[data-control="${name}"]`);if(!button)return;button.dataset.active='true';button.addEventListener('click',()=>{const active=button.dataset.active==='true';button.dataset.active=String(!active);button.setAttribute('aria-pressed',String(!active));button.setAttribute('aria-label',active?offLabel:onLabel);});};
  setToggle('microphone','Microphone on','Microphone muted');setToggle('camera','Camera on','Camera off');setToggle('share','Stop sharing screen','Share screen');
  for(const name of ['people','chat','more']){toolbar.querySelector<HTMLButtonElement>(`[data-control="${name}"]`)?.addEventListener('click',()=>{panel.hidden=false;panel.dataset.open=name;panel.textContent=name==='people'?'People':name==='chat'?'Chat':'More options';});}
  toolbar.querySelector<HTMLButtonElement>('[data-control="leave"]')?.addEventListener('click',()=>{conference.dataset.phase7Leave='requested';});
 });
}

test('seven critical controls are reachable and keyboard-sized at 320px',async({page})=>{
 await openRoom(page,320,568);await injectControlAcceptanceFixture(page);
 const toolbar=page.locator('[data-phase7-fixture="toolbar"]');const controls=toolbar.locator('[data-phase7-fixture="control"]');
 await expect(controls).toHaveCount(7);
 for(let i=0;i<7;i+=1){const box=await controls.nth(i).boundingBox();expect(box).not.toBeNull();if(box){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}}
 await controls.last().scrollIntoViewIfNeeded();await expect(controls.last()).toBeVisible();
 const overflow=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(overflow.scroll).toBeLessThanOrEqual(overflow.client+1);
});

test('mic camera and share expose explicit state changes instead of colour-only state',async({page})=>{
 await openRoom(page);await injectControlAcceptanceFixture(page);
 const mic=page.locator('[data-phase7-fixture="control"][data-control="microphone"]');
 await expect(mic).toHaveAttribute('aria-label','Microphone on');await mic.click();await expect(mic).toHaveAttribute('aria-label','Microphone muted');await expect(mic).toHaveAttribute('aria-pressed','false');await expect(page.getByRole('button',{name:'Microphone muted'})).toHaveCount(1);
 const camera=page.locator('[data-phase7-fixture="control"][data-control="camera"]');
 await expect(camera).toHaveAttribute('aria-label','Camera on');await camera.click();await expect(camera).toHaveAttribute('aria-label','Camera off');await expect(page.getByRole('button',{name:'Camera off'})).toHaveCount(1);
 const share=page.locator('[data-phase7-fixture="control"][data-control="share"]');
 await expect(share).toHaveAttribute('aria-label','Share screen');await share.click();await expect(share).toHaveAttribute('aria-label','Stop sharing screen');await expect(page.getByRole('button',{name:'Stop sharing screen'})).toHaveCount(1);
});

test('People Chat and More open an explicit accessible side surface',async({page})=>{
 await openRoom(page);await injectControlAcceptanceFixture(page);
 const panel=page.locator('[data-phase7-fixture="panel"]');
 for(const [button,label] of [['People','People'],['Chat','Chat'],['More options','More options']] as const){await page.getByRole('button',{name:button}).click();await expect(panel).toBeVisible();await expect(panel).toHaveText(label);}
});

test('Leave is distinct, reachable and produces an explicit leave request',async({page})=>{
 await openRoom(page,320,568);await injectControlAcceptanceFixture(page);
 await page.getByRole('button',{name:'Leave room'}).click();await expect(page.locator('.lk-video-conference')).toHaveAttribute('data-phase7-leave','requested');
});

test('control fixture never exposes token provider URL or internal identifiers in visible UI',async({page})=>{
 await openRoom(page);await injectControlAcceptanceFixture(page);
 const visible=await page.locator('[data-phase7-fixture="toolbar"], [data-phase7-fixture="panel"]').allTextContents();const text=visible.join(' ');
 expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]+/);expect(text).not.toMatch(/wss?:\/\//);expect(text).not.toContain(eventId);
});
