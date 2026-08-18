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
