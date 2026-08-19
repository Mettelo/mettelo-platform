import {expect,test,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

type Credentials={email:string;password:string};
const labProjectId='00000000-0000-4000-8000-00000000e2e1';
const labTeam1RunId='00000000-0000-4000-8000-00000000e211';
const basePath=`/member/projects/${labProjectId}?run=${labTeam1RunId}`;

const screens=[
  ['home','#mettelo-lab'],
  ['plan','#problem'],
  ['tasks','#delivery'],
  ['chat','#discussion'],
  ['data','#data-sources'],
  ['proof','#proof'],
  ['resources','#resources'],
  ['events','#meetings'],
  ['team','#team'],
] as const;

const viewports=[
  {name:'phone-375',width:375,height:812},
  {name:'phone-390',width:390,height:844},
  {name:'phone-414',width:414,height:896},
  {name:'tablet-768',width:768,height:1024},
  {name:'tablet-1024',width:1024,height:900},
  {name:'desktop-1440',width:1440,height:900},
] as const;

function credentials():Credentials{
  const email=process.env.E2E_MEMBER_EMAIL?.trim();
  const password=process.env.E2E_MEMBER_PASSWORD;
  if(!email||!password)throw new Error('Missing E2E member credentials.');
  return {email,password};
}

async function signIn(page:Page,next:string){
  const account=credentials();
  await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
  const main=page.locator('#main-content');
  await main.locator('input[type="email"]').fill(account.email);
  await main.locator('input[type="password"]').fill(account.password);
  await main.getByRole('button',{name:'Sign in →'}).click();
  await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function assertNoHorizontalOverflow(page:Page,label:string){
  const dimensions=await page.evaluate(()=>({
    documentScrollWidth:document.documentElement.scrollWidth,
    documentClientWidth:document.documentElement.clientWidth,
    bodyScrollWidth:document.body.scrollWidth,
  }));
  expect(dimensions.documentScrollWidth,`${label}: document overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth);
  expect(dimensions.bodyScrollWidth,`${label}: body overflow`).toBeLessThanOrEqual(dimensions.documentClientWidth);
}

test('Mettelo Lab matches the approved responsive composition screen by screen',async({page})=>{
  test.setTimeout(180_000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await signIn(page,basePath);
  await mkdir('artifacts/mettelo-lab-visual',{recursive:true});

  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await page.goto(basePath,{waitUntil:'networkidle'});
    await expect(page.getByText('METTELO LAB',{exact:true}).first()).toBeVisible();
    await assertNoHorizontalOverflow(page,viewport.name);

    const labRail=page.locator('aside[aria-label="Mettelo Lab workspace"]');
    const rightRail=page.locator('aside[aria-label="Mettelo Lab project context"]');
    const mobileNav=page.getByRole('navigation',{name:'Mettelo Lab mobile navigation'});
    const outerMemberNav=page.getByRole('navigation',{name:'Member mobile navigation'});
    await expect(outerMemberNav).toBeHidden();

    if(viewport.width<=480){
      await expect(labRail).toBeHidden();
      await expect(mobileNav).toBeVisible();
      for(const link of await mobileNav.getByRole('link').all()){
        const box=await link.boundingBox();
        expect(box?.height||0,`${viewport.name}: mobile Lab navigation target`).toBeGreaterThanOrEqual(44);
      }
    }else{
      await expect(mobileNav).toBeHidden();
      await expect(labRail).toBeVisible();
    }

    if(viewport.width>=1181)await expect(rightRail).toBeVisible();
    else await expect(rightRail).toBeHidden();

    for(const [screen,selector] of screens){
      const target=page.locator(selector).first();
      await expect(target,`${viewport.name}/${screen}: target exists`).toBeVisible();
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(80);
      await assertNoHorizontalOverflow(page,`${viewport.name}/${screen}`);

      if(viewport.width<=480&&screen==='chat'){
        const composer=page.locator('.messageComposer');
        await expect(composer).toBeVisible();
        const [composerBox,navBox]=await Promise.all([composer.boundingBox(),mobileNav.boundingBox()]);
        expect(composerBox,`${viewport.name}: Chat composer box`).not.toBeNull();
        expect(navBox,`${viewport.name}: Lab mobile nav box`).not.toBeNull();
        if(composerBox&&navBox)expect(composerBox.y+composerBox.height,`${viewport.name}: Chat composer must sit above nav`).toBeLessThanOrEqual(navBox.y+2);
        const fontSize=await composer.locator('textarea').evaluate(element=>Number.parseFloat(getComputedStyle(element).fontSize));
        expect(fontSize,`${viewport.name}: composer input avoids iOS focus zoom`).toBeGreaterThanOrEqual(16);
      }

      await page.screenshot({
        path:`artifacts/mettelo-lab-visual/${viewport.name}-${screen}.png`,
        fullPage:false,
        animations:'disabled',
      });
    }
  }
});
