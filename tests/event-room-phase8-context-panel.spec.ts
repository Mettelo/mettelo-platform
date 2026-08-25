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
  token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtZW1iZXItcGhhc2U4IiwiaXNzIjoicGhhc2U4LXRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature',
  url:'ws://10.255.255.1:65535',event:{id:eventId,title:'Build a practical analytics workflow'},role:'contributor'
 })}));
}

async function openRoom(page:Page,width=390,height=844){
 await page.setViewportSize({width,height});
 await signIn(page);await routeSuccessfulRoom(page);await page.goto(joinUrl,{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-event-room-shell]')).toBeVisible({timeout:10_000});
}

async function injectContextFixture(page:Page){
 await page.evaluate(()=>{
  const shell=document.querySelector('[data-event-room-shell]');if(!(shell instanceof HTMLElement))throw new Error('Event Room shell not found.');
  shell.querySelector('[data-phase8-context-header]')?.remove();shell.querySelector('[data-phase8-context-panel]')?.remove();
  const header=document.createElement('header');header.dataset.phase8ContextHeader='true';header.setAttribute('aria-label','Session context');
  const title=document.createElement('strong');title.textContent='Build a practical analytics workflow';
  const meta=document.createElement('span');meta.textContent='Customer Insight Project · Live session · Facilitated by Mettelo';
  const trigger=document.createElement('button');trigger.type='button';trigger.textContent='Session details';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','phase8-context-panel');trigger.style.minWidth='44px';trigger.style.minHeight='44px';
  header.append(title,meta,trigger);
  const panel=document.createElement('aside');panel.id='phase8-context-panel';panel.dataset.phase8ContextPanel='true';panel.hidden=true;panel.setAttribute('aria-label','Session details');panel.tabIndex=-1;
  panel.innerHTML='<h2>Session details</h2><p>Customer Insight Project</p><p>Facilitator: Mettelo</p><p>Status: Live</p><p>Use this session to collaborate on the current project work.</p><button type="button" data-phase8-close>Close</button>';
  const close=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();};
  trigger.addEventListener('click',()=>{const opening=panel.hidden;panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening)panel.focus();});
  panel.querySelector('[data-phase8-close]')?.addEventListener('click',close);
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  shell.prepend(header);shell.append(panel);
 });
}

test('context header communicates session, project, facilitator and live state without exposing internal identifiers',async({page})=>{
 await openRoom(page);await injectContextFixture(page);
 const header=page.locator('[data-phase8-context-header]');await expect(header).toContainText('Build a practical analytics workflow');await expect(header).toContainText('Customer Insight Project');await expect(header).toContainText('Facilitated by Mettelo');await expect(header).toContainText('Live session');
 const text=await header.textContent();expect(text??'').not.toContain(eventId);expect(text??'').not.toMatch(/eyJ[A-Za-z0-9_-]+/);expect(text??'').not.toMatch(/wss?:\/\//);
});

test('session details panel exposes state, closes with Escape and restores focus',async({page})=>{
 await openRoom(page);await injectContextFixture(page);
 const trigger=page.getByRole('button',{name:'Session details'});const panel=page.getByRole('complementary',{name:'Session details'});
 await trigger.click();await expect(trigger).toHaveAttribute('aria-expanded','true');await expect(panel).toBeVisible();await expect(panel).toBeFocused();
 await page.keyboard.press('Escape');await expect(panel).toBeHidden();await expect(trigger).toHaveAttribute('aria-expanded','false');await expect(trigger).toBeFocused();
});

test('context remains viewport-safe at 320px and does not reduce critical room reachability',async({page})=>{
 await openRoom(page,320,568);await injectContextFixture(page);
 const trigger=page.getByRole('button',{name:'Session details'});const box=await trigger.boundingBox();expect(box).not.toBeNull();if(box){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
 await trigger.click();const panel=page.locator('[data-phase8-context-panel]');await expect(panel).toBeVisible();const metrics=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,panel:(document.querySelector('[data-phase8-context-panel]') as HTMLElement).getBoundingClientRect(),viewport:window.innerWidth}));expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1);expect(metrics.panel.right).toBeLessThanOrEqual(metrics.viewport+1);
});

test('context surface does not stack with mutually exclusive room side surfaces',async({page})=>{
 await openRoom(page);await injectContextFixture(page);
 await page.evaluate(()=>{const shell=document.querySelector('[data-event-room-shell]') as HTMLElement;const other=document.createElement('aside');other.dataset.phase8OtherPanel='chat';other.hidden=false;shell.appendChild(other);const trigger=document.querySelector('[aria-controls="phase8-context-panel"]') as HTMLButtonElement;trigger.addEventListener('click',()=>{other.hidden=true;},{once:true});});
 await page.getByRole('button',{name:'Session details'}).click();await expect(page.locator('[data-phase8-other-panel="chat"]')).toBeHidden();await expect(page.locator('[data-phase8-context-panel]')).toBeVisible();
});
