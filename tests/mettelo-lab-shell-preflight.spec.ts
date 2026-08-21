import {expect,test,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
const labProjectId='00000000-0000-4000-8000-00000000e2e1';
const labTeam1RunId='00000000-0000-4000-8000-00000000e211';
const chatUrl=`/member/projects/${labProjectId}?run=${labTeam1RunId}&view=chat`;

function credentials():Credentials{
 const email=process.env.E2E_MEMBER_EMAIL?.trim();
 const password=process.env.E2E_MEMBER_PASSWORD;
 if(!email||!password)throw new Error('Missing E2E member credentials.');
 return{email,password};
}

async function signIn(page:Page){
 const account=credentials();
 await page.goto(`/signin?next=${encodeURIComponent(chatUrl)}`,{waitUntil:'networkidle'});
 const main=page.locator('#main-content');
 await main.locator('input[type="email"]').fill(account.email);
 await main.locator('input[type="password"]').fill(account.password);
 await main.getByRole('button',{name:'Sign in →'}).click();
 await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

async function expectLegacyChromeAbsent(page:Page,label:string){
 const legacySection=page.locator('[data-lab-surface] > section.softSection').first();
 if(!(await legacySection.count()))return;
 if(!(await legacySection.isVisible())){
  expect(await legacySection.boundingBox(),`${label}: hidden legacy wrapper must not consume Lab layout space`).toBeNull();
  return;
 }
 const chrome=[
  legacySection.locator(':scope > .shell > .sectionHead'),
  legacySection.locator(':scope > .shell > .workspaceNav'),
  legacySection.locator(':scope > .shell > .statBand'),
 ];
 for(const element of chrome){
  if(await element.count()){
   await expect(element,`${label}: legacy project chrome must not occupy the Lab workspace`).toBeHidden();
   expect(await element.boundingBox(),`${label}: hidden legacy chrome must not consume layout space`).toBeNull();
  }
 }
}

test('Lab shell owns its viewport without legacy project chrome',async({page})=>{
 test.setTimeout(90_000);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:320,height:740});
 await signIn(page);
 await page.goto(chatUrl,{waitUntil:'networkidle'});
 await expectLegacyChromeAbsent(page,'phone-320');

 const composer=page.locator('#discussion .messageComposer');
 const mobileNav=page.getByRole('navigation',{name:'Mettelo Lab mobile navigation'});
 await expect(composer).toBeVisible();
 await expect(mobileNav).toBeVisible();
 const[composerBox,navBox]=await Promise.all([composer.boundingBox(),mobileNav.boundingBox()]);
 expect(composerBox).not.toBeNull();
 expect(navBox).not.toBeNull();
 if(composerBox&&navBox){
  expect(composerBox.y+composerBox.height,'phone-320: Chat composer stays above Lab navigation').toBeLessThanOrEqual(navBox.y+2);
 }

 await page.setViewportSize({width:1440,height:900});
 await page.goto(chatUrl,{waitUntil:'networkidle'});
 await expectLegacyChromeAbsent(page,'desktop-1440');
 await expect(page.locator('#discussion .messageComposer')).toBeVisible();
});
