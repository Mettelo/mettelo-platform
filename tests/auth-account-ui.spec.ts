import {expect,test} from '@playwright/test';

const mobileWidths=[375,390,414];

for(const width of mobileWidths){
  test(`signup hierarchy fits ${width}px without competing account actions`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto('/signin?mode=signup',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{name:'Create your Mettelo account'})).toBeVisible();
    await expect(page.getByText('Step 1 of 6')).toBeVisible();
    await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Reset password',exact:true})).toHaveCount(0);
    await expect(page.getByLabel('Username *')).toBeVisible();
    await expect(page.locator('#username')).toHaveAttribute('aria-describedby','username-help');
    await expect(page.locator('#username-help')).toContainText('3–30');
    const modeTabs=page.locator('.authMobileOptionsCard .authModeTabs');
    await expect(modeTabs).toBeVisible();
    const tabBox=await modeTabs.boundingBox();
    expect(tabBox?.width||0).toBeLessThanOrEqual(width-20);
    await expect(page.getByRole('button',{name:/Create account with Google/i})).toBeVisible();
    await expect(page.getByRole('button',{name:/Create account with GitHub/i})).toBeVisible();
    const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
  });
}

test('signup username validation blocks reserved identity before Auth submission',async({page})=>{
  await page.goto('/signin?mode=signup');
  await page.getByLabel('Full name *').fill('Phase One Member');
  await page.getByLabel('Username *').fill('admin');
  await page.getByLabel('Email address *').fill('phase-one@example.test');
  await page.getByLabel('Password *').fill('Correct-Horse-42!');
  await page.getByRole('button',{name:'Create Mettelo account →'}).click();
  await expect(page.getByRole('status')).toContainText('reserved');
  await expect(page).toHaveURL(/\/signin\?mode=signup/);
});

test('signup remains usable at 200 percent text scaling without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:640,height:900});
  await page.goto('/signin?mode=signup',{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
  await expect(page.getByLabel('Username *')).toBeVisible();
  await expect(page.getByRole('button',{name:'Create Mettelo account →'})).toBeVisible();
  const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth+1);
});

test('sign in exposes recovery beside password and password visibility control',async({page})=>{
  await page.goto('/signin');
  await expect(page.getByRole('button',{name:'Forgot password?'})).toBeVisible();
  const password=page.locator('#password');
  await expect(password).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(password).toHaveAttribute('type','text');
  await expect(page.getByRole('button',{name:'Hide password'})).toBeVisible();
});

test('signup strength feedback updates as password changes',async({page})=>{
  await page.goto('/signin?mode=signup');
  const password=page.locator('#password');
  await expect(page.locator('#password-strength')).toContainText('Not entered');
  await password.fill('abcdefgh');
  await expect(page.locator('#password-strength')).toContainText(/Weak|Good/);
  await password.fill('Correct-Horse-42!');
  await expect(page.locator('#password-strength')).toContainText('Strong');
});
