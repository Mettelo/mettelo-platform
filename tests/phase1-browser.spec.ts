import {expect,test} from '@playwright/test';

const viewports=[
  {name:'small-phone',width:320,height:900},
  {name:'phone',width:390,height:900},
  {name:'large-phone',width:430,height:900},
  {name:'phone-landscape',width:844,height:390},
  {name:'tablet',width:768,height:1000},
  {name:'large-tablet',width:1024,height:1100},
  {name:'laptop',width:1280,height:900},
  {name:'desktop',width:1440,height:1000},
  {name:'large-desktop',width:1920,height:1100}
];

const pages=[
  '/signin',
  '/signin?mode=signup',
  '/signin?mode=reset',
  '/auth/check-email?email=long.member.address%40example.com&next=%2Fonboarding',
  '/auth/reset-sent?email=long.member.address%40example.com',
  '/auth/password-changed',
  '/auth/verified?next=%2Fonboarding',
  '/dev/phase-1-onboarding',
  '/onboarding/complete'
];

async function expectNoHorizontalOverflow(page:any){
  const result=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(result.scrollWidth,'document must not overflow horizontally').toBeLessThanOrEqual(result.clientWidth+1);
}

async function expectUsableControls(page:any){
  const controls=page.locator('button,input,select,textarea');
  const count=await controls.count();
  for(let i=0;i<count;i++){
    const control=controls.nth(i);
    if(!(await control.isVisible()))continue;
    const box=await control.boundingBox();
    if(!box)continue;
    expect(box.height,`control ${i} must have usable height`).toBeGreaterThanOrEqual(40);
  }
}

test.describe('Phase 1 responsive release matrix',()=>{
  for(const viewport of viewports){
    for(const path of pages){
      test(`${viewport.name} ${path}`,async({page})=>{
        await page.setViewportSize({width:viewport.width,height:viewport.height});
        await page.goto(path,{waitUntil:'networkidle'});
        await expect(page.locator('body')).toBeVisible();
        await expectNoHorizontalOverflow(page);
        await expectUsableControls(page);
        const bodyBox=await page.locator('body').boundingBox();
        expect(bodyBox?.width||0).toBeLessThanOrEqual(viewport.width+1);
      });
    }
  }
});

test('keyboard navigation exposes visible focus on sign in',async({page})=>{
  await page.goto('/signin');
  await page.keyboard.press('Tab');
  const focused=page.locator(':focus');
  await expect(focused).toBeVisible();
  const outline=await focused.evaluate(el=>{const s=getComputedStyle(el);return `${s.outlineStyle}|${s.outlineWidth}|${s.boxShadow}`});
  expect(outline).not.toMatch(/^none\|0px\|none$/);
});

test('auth fields expose browser autofill semantics',async({page})=>{
  await page.goto('/signin');
  await expect(page.locator('input[type="email"]')).toHaveAttribute('autocomplete',/email/);
  await expect(page.locator('input[type="password"]')).toHaveAttribute('autocomplete',/(current-password|new-password)/);
  await page.goto('/signin?mode=signup');
  await expect(page.locator('input[type="email"]')).toHaveAttribute('autocomplete',/email/);
  await expect(page.locator('input[type="password"]')).toHaveAttribute('autocomplete',/(new-password|current-password)/);
});

test('200 percent zoom remains horizontally usable',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  for(const path of ['/signin','/auth/check-email?email=long.member.address%40example.com&next=%2Fonboarding','/dev/phase-1-onboarding']){
    await page.goto(path,{waitUntil:'networkidle'});
    await page.evaluate(()=>{document.documentElement.style.zoom='2'});
    await expectNoHorizontalOverflow(page);
  }
});

test('long validation and status content remains visible',async({page})=>{
  await page.setViewportSize({width:320,height:900});
  await page.goto('/signin');
  const email=page.locator('input[type="email"]');
  await email.fill('not-an-email');
  const submit=page.locator('button[type="submit"]').first();
  if(await submit.isVisible())await submit.click();
  await expectNoHorizontalOverflow(page);
  const status=page.locator('[role="status"]');
  if(await status.count())await expect(status.first()).toBeVisible();
});
