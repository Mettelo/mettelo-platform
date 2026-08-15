import {expect,test,type Page} from '@playwright/test';

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
  '/dev/phase-1-onboarding?step=0',
  '/dev/phase-1-onboarding?step=1',
  '/dev/phase-1-onboarding?step=2',
  '/dev/phase-1-onboarding?step=3',
  '/dev/phase-1-onboarding?step=4',
  '/onboarding/complete'
];

async function expectNoHorizontalOverflow(page:Page){
  const result=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(result.scrollWidth,'document must not overflow horizontally').toBeLessThanOrEqual(result.clientWidth+1);
}

async function expectUsableControls(page:Page){
  const controls=page.locator('button,input:not([type="checkbox"]):not([type="radio"]),select,textarea');
  const count=await controls.count();
  for(let i=0;i<count;i++){
    const control=controls.nth(i);
    if(!(await control.isVisible()))continue;
    const box=await control.boundingBox();
    if(!box)continue;
    expect(box.height,`control ${i} must have usable height`).toBeGreaterThanOrEqual(40);
  }
  const toggles=page.locator('input[type="checkbox"],input[type="radio"]');
  for(let i=0;i<await toggles.count();i++){
    const toggle=toggles.nth(i);if(!(await toggle.isVisible()))continue;
    const label=toggle.locator('xpath=ancestor::label[1]');
    if(await label.count()){const box=await label.boundingBox();if(box)expect(box.height,`toggle target ${i} must be usable`).toBeGreaterThanOrEqual(40)}
  }
}

async function expectNamedFormControls(page:Page){
  const controls=page.locator('input:not([type="hidden"]),select,textarea');
  for(let i=0;i<await controls.count();i++){
    const control=controls.nth(i);if(!(await control.isVisible()))continue;
    const named=await control.evaluate((element:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)=>Boolean(element.getAttribute('aria-label')||element.getAttribute('aria-labelledby')||element.labels?.length));
    expect(named,`form control ${i} must have an accessible name`).toBeTruthy();
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
        await expectNamedFormControls(page);
        const bodyBox=await page.locator('body').boundingBox();
        expect(bodyBox?.width||0).toBeLessThanOrEqual(viewport.width+1);
      });
    }
  }
});

test('protected onboarding redirects to sign in and preserves origin',async({page})=>{
  await page.goto('/onboarding');
  await expect(page).toHaveURL(/\/signin\?next=%2Fonboarding$/);
});

test('OAuth cancellation returns to a clear recoverable state',async({page})=>{
  await page.goto('/auth/callback?flow=oauth&error=access_denied&next=%2Fmember');
  await expect(page).toHaveURL(/\/signin\?/);
  await expect(page.getByText('Social sign-in was cancelled. You can try again or use email instead.')).toBeVisible();
});

test('Google OAuth provider starts from account creation',async({page})=>{
  await page.goto('/signin?mode=signup');
  await page.getByRole('button',{name:/Create account with Google/i}).click();
  await page.waitForURL(url=>url.hostname.includes('google.com')||url.hostname.includes('supabase.co'),{timeout:20000});
  expect(page.url()).toMatch(/google\.com|supabase\.co/);
});

test('GitHub OAuth provider starts from account creation',async({page})=>{
  await page.goto('/signin?mode=signup');
  await page.getByRole('button',{name:/Create account with GitHub/i}).click();
  await page.waitForURL(url=>url.hostname==='github.com'||url.hostname.includes('supabase.co'),{timeout:20000});
  expect(page.url()).toMatch(/github\.com|supabase\.co/);
});

test('keyboard navigation exposes visible focus and advances focus order',async({page})=>{
  await page.goto('/signin');
  let previous='';
  for(let i=0;i<6;i++){
    await page.keyboard.press('Tab');
    const focused=page.locator(':focus');
    await expect(focused).toBeVisible();
    const signature=await focused.evaluate(el=>`${el.tagName}:${el.getAttribute('href')||''}:${el.getAttribute('name')||''}:${el.textContent||''}`);
    expect(signature).not.toBe(previous);previous=signature;
    const focusStyle=await focused.evaluate(el=>{const s=getComputedStyle(el);return `${s.outlineStyle}|${s.outlineWidth}|${s.boxShadow}`});
    expect(focusStyle).not.toMatch(/^none\|0px\|none$/);
  }
});

test('auth fields expose mobile keyboard and password-manager semantics',async({page})=>{
  await page.goto('/signin');
  await expect(page.locator('input[type="email"]')).toHaveAttribute('autocomplete',/email/);
  await expect(page.locator('input[type="email"]')).toHaveAttribute('inputmode','email');
  await expect(page.locator('input[type="password"]')).toHaveAttribute('autocomplete','current-password');
  await page.goto('/signin?mode=signup');
  await expect(page.locator('input[type="email"]')).toHaveAttribute('autocomplete',/email/);
  await expect(page.locator('input[type="password"]')).toHaveAttribute('autocomplete','new-password');
});

test('errors are textual and announced, not colour-only',async({page})=>{
  await page.goto('/signin?error=oauth-failed');
  const status=page.locator('[role="status"][aria-live="polite"]').filter({hasText:'Social sign-in could not be completed'});
  await expect(status).toBeVisible();
});

test('200 percent zoom remains horizontally usable',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  for(const path of ['/signin','/auth/check-email?email=long.member.address%40example.com&next=%2Fonboarding','/dev/phase-1-onboarding?step=4']){
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
