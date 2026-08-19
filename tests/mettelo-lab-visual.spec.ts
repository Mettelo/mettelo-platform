import {expect,test,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const labProjectId='00000000-0000-4000-8000-00000000e2e1';
const labTeam1RunId='00000000-0000-4000-8000-00000000e211';
const screens=[['home','#mettelo-lab'],['plan','#problem'],['tasks','#delivery'],['chat','#discussion'],['data','#data-sources'],['proof','#proof'],['resources','#resources'],['events','#meetings'],['team','#team']] as const;
const viewports=[{name:'phone-375',width:375,height:812},{name:'phone-390',width:390,height:844},{name:'phone-414',width:414,height:896},{name:'tablet-768',width:768,height:1024},{name:'tablet-1024',width:1024,height:900},{name:'desktop-1440',width:1440,height:900}] as const;
const urlFor=(view:string)=>`/member/projects/${labProjectId}?run=${labTeam1RunId}&view=${view}`;
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function assertNoHorizontalOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({documentScrollWidth:document.documentElement.scrollWidth,documentClientWidth:document.documentElement.clientWidth,bodyScrollWidth:document.body.scrollWidth}));expect(dimensions.documentScrollWidth,`${label}: document overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth);expect(dimensions.bodyScrollWidth,`${label}: body overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth)}
async function assertShell(page:Page,width:number,label:string){const labRail=page.locator('aside[aria-label="Mettelo Lab workspace"]'),rightRail=page.locator('aside[aria-label="Mettelo Lab project context"]'),mobileNav=page.getByRole('navigation',{name:'Mettelo Lab mobile navigation'}),outerMemberNav=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await expect(outerMemberNav).toBeHidden();if(width<=480){await expect(labRail).toBeHidden();await expect(page.getByText('METTELO LAB',{exact:true}).first()).toBeVisible();await expect(mobileNav).toBeVisible();for(const link of await mobileNav.getByRole('link').all()){const box=await link.boundingBox();expect(box?.height||0,`${label}: mobile Lab navigation target`).toBeGreaterThanOrEqual(44)}}else if(width<=1024){await expect(labRail).toBeVisible();await expect(page.getByText('METTELO LAB',{exact:true}).first()).toBeVisible();await expect(mobileNav).toBeHidden()}else{await expect(labRail).toBeVisible();await expect(labRail.getByRole('heading',{name:'Mettelo Lab'})).toBeVisible();await expect(mobileNav).toBeHidden()}if(width>=1181)await expect(rightRail).toBeVisible();else await expect(rightRail).toBeHidden()}

test('Mettelo Lab matches the approved responsive composition screen by screen',async({page})=>{
 test.setTimeout(240_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page,urlFor('home'));await mkdir('artifacts/mettelo-lab-visual',{recursive:true});
 for(const viewport of viewports){
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  for(const [screen,selector] of screens){
   await page.goto(urlFor(screen),{waitUntil:'networkidle'});await expect(page.locator('[data-lab-view]')).toHaveAttribute('data-lab-view',screen);await assertShell(page,viewport.width,`${viewport.name}/${screen}`);await assertNoHorizontalOverflow(page,`${viewport.name}/${screen}`);
   const target=page.locator(selector).first();await expect(target,`${viewport.name}/${screen}: destination visible`).toBeVisible();
   if(screen!=='home'&&screen!=='team')await expect(page.locator('#mettelo-lab')).toBeHidden();
   if(screen==='home')await expect(page.locator('[data-lab-team-section]')).toBeHidden();
   if(screen==='team')await expect(page.locator('[data-lab-home-section]').first()).toBeHidden();
   if(screen==='chat'&&viewport.width<=480){const composer=page.locator('.messageComposer');await composer.scrollIntoViewIfNeeded();await expect(composer).toBeVisible();const mobileNav=page.getByRole('navigation',{name:'Mettelo Lab mobile navigation'});const[composerBox,navBox]=await Promise.all([composer.boundingBox(),mobileNav.boundingBox()]);expect(composerBox).not.toBeNull();expect(navBox).not.toBeNull();if(composerBox&&navBox)expect(composerBox.y+composerBox.height,`${viewport.name}: Chat composer must sit above nav`).toBeLessThanOrEqual(navBox.y+2);const fontSize=await composer.locator('textarea').evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize));expect(fontSize,`${viewport.name}: composer input avoids iOS focus zoom`).toBeGreaterThanOrEqual(16)}
   await page.screenshot({path:`artifacts/mettelo-lab-visual/${viewport.name}-${screen}.png`,fullPage:false,animations:'disabled'});
  }
  if(viewport.width<=480){await page.goto(urlFor('more'),{waitUntil:'networkidle'});await expect(page.locator('[data-lab-view]')).toHaveAttribute('data-lab-view','more');await expect(page.locator('#lab-more')).toBeVisible();await assertNoHorizontalOverflow(page,`${viewport.name}/more`);await page.screenshot({path:`artifacts/mettelo-lab-visual/${viewport.name}-more.png`,fullPage:false,animations:'disabled'})}
 }
});
