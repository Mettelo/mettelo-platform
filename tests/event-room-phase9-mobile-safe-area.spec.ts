import {expect,test,type Page} from '@playwright/test';

const eventId='00000000-0000-4000-8000-00000000e299';
const joinUrl=`/member/events/${eventId}/join`;
const phoneMatrix=[
 {width:320,height:568,label:'320x568'},
 {width:360,height:740,label:'360x740'},
 {width:375,height:812,label:'375x812'},
 {width:390,height:844,label:'390x844'},
 {width:430,height:932,label:'430x932'},
 {width:844,height:390,label:'844x390 landscape'},
];

function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`Missing ${name}.`);return value;}
async function signIn(page:Page){await page.goto(`/signin?next=${encodeURIComponent(joinUrl)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(required('E2E_MEMBER_EMAIL'));await main.locator('input[type="password"]').fill(required('E2E_MEMBER_PASSWORD'));await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});}
async function routeSuccessfulRoom(page:Page){await page.route(`**/api/project-events/${eventId}/token`,async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwaGFzZTktbWVtYmVyIiwiZXhwIjo5OTk5OTk5OTk5fQ.signature',url:'ws://10.255.255.1:65535',event:{id:eventId,title:'Phase 9 mobile room'},role:'contributor'})}));}
async function openRoom(page:Page,width:number,height:number){await page.setViewportSize({width,height});await signIn(page);await routeSuccessfulRoom(page);await page.goto(joinUrl,{waitUntil:'domcontentloaded'});await expect(page.locator('[data-event-room-shell]')).toBeVisible({timeout:10_000});}
async function assertRootSafe(page:Page){const report=await page.evaluate(()=>({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,clientHeight:document.documentElement.clientHeight,scrollHeight:document.documentElement.scrollHeight,shell:(document.querySelector('[data-event-room-shell]') as HTMLElement|null)?.getBoundingClientRect()}));expect(report.scrollWidth).toBeLessThanOrEqual(report.clientWidth+1);expect(report.shell).toBeTruthy();if(report.shell){expect(report.shell.left).toBeGreaterThanOrEqual(-1);expect(report.shell.right).toBeLessThanOrEqual(report.clientWidth+1);}}

test('phone and short-landscape matrix stays inside the viewport',async({page})=>{for(const size of phoneMatrix){await openRoom(page,size.width,size.height);await assertRootSafe(page);const controls=page.locator('.lk-control-bar button:visible');const count=await controls.count();for(let i=0;i<count;i+=1){const box=await controls.nth(i).boundingBox();if(box){expect(box.height,`${size.label} control ${i}`).toBeGreaterThanOrEqual(44);}}}});

test('dynamic viewport reduction keeps the room and critical controls reachable',async({page})=>{await openRoom(page,390,844);await page.setViewportSize({width:390,height:520});await assertRootSafe(page);const bar=page.locator('.lk-control-bar');if(await bar.count()){await expect(bar).toBeVisible();const bounds=await bar.boundingBox();if(bounds)expect(bounds.y).toBeLessThan(520);}});

test('portrait to landscape orientation change preserves the same room shell',async({page})=>{await openRoom(page,390,844);const shell=page.locator('[data-event-room-shell]');await expect(shell).toBeVisible();await page.setViewportSize({width:844,height:390});await expect(shell).toBeVisible();await assertRootSafe(page);await page.setViewportSize({width:390,height:844});await expect(shell).toBeVisible();await assertRootSafe(page);});

test('mobile contextual panel behaves as an overlay and does not squeeze the room',async({page})=>{await openRoom(page,320,568);const shell=page.locator('[data-event-room-shell]');const before=await shell.boundingBox();await page.evaluate(()=>{const shell=document.querySelector('[data-event-room-shell]') as HTMLElement;if(!shell)return;const panel=document.createElement('aside');panel.dataset.phase9MobileOverlay='true';panel.setAttribute('aria-label','Mobile room panel');Object.assign(panel.style,{position:'absolute',inset:'0 0 0 auto',width:'min(88vw, 360px)',maxWidth:'100%',zIndex:'20',overflowY:'auto'});panel.innerHTML='<button type="button" style="min-width:44px;min-height:44px">Close</button><p>Context panel</p>';shell.appendChild(panel);});const after=await shell.boundingBox();expect(before).not.toBeNull();expect(after).not.toBeNull();if(before&&after)expect(Math.abs(after.width-before.width)).toBeLessThanOrEqual(1);const panel=page.locator('[data-phase9-mobile-overlay]');await expect(panel).toBeVisible();const panelBox=await panel.boundingBox();expect(panelBox).not.toBeNull();if(panelBox){expect(panelBox.right).toBeLessThanOrEqual(321);expect(panelBox.width).toBeLessThanOrEqual(320);}await assertRootSafe(page);});

test('200 percent reflow equivalent remains usable without two-dimensional page scrolling',async({page})=>{await openRoom(page,640,400);await page.locator('html').evaluate(el=>{(el as HTMLElement).style.fontSize='200%';});await assertRootSafe(page);const shell=page.locator('[data-event-room-shell]');await expect(shell).toBeVisible();});
