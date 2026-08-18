import {expect,test,type Page} from '@playwright/test';

type Credentials={email:string;password:string};

function credentials(prefix:'MEMBER'|'ARCHITECT'|'ADMIN'):Credentials{
  const email=process.env[`E2E_${prefix}_EMAIL`]?.trim();
  const password=process.env[`E2E_${prefix}_PASSWORD`];
  if(!email||!password)throw new Error(`Missing E2E_${prefix}_EMAIL or E2E_${prefix}_PASSWORD. Run npm run check:e2e-config first.`);
  return{email,password};
}

async function signIn(page:Page,account:Credentials,next:string){
  await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});
  const main=page.locator('main');
  await main.locator('input[type="email"]').fill(account.email);
  await main.locator('input[type="password"]').fill(account.password);
  await main.getByRole('button',{name:'Sign in →'}).click();
  await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000});
}

test.describe('authenticated staging smoke tests',()=>{
  test('member can access their application tracker',async({page})=>{
    const account=credentials('MEMBER');
    await signIn(page,account,'/member/applications');
    await page.goto('/member/applications',{waitUntil:'networkidle'});
    await expect(page.locator('main,section').first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/signin/);
  });

  test('Project Architect can open their project workspace',async({page})=>{
    const account=credentials('ARCHITECT');
    await signIn(page,account,'/member/architect-projects');
    await page.goto('/member/architect-projects',{waitUntil:'networkidle'});
    await expect(page.locator('main,section').first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/signin|\/member$/);
  });

  test('admin can open project applications and intake queues',async({page})=>{
    const account=credentials('ADMIN');
    await signIn(page,account,'/admin');
    await page.goto('/admin/project-operations/applications',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{name:/Applications/i})).toBeVisible();
    await page.goto('/admin/intake',{waitUntil:'networkidle'});
    await expect(page.locator('main,section').first()).toBeVisible();
    await expect(page).not.toHaveURL(/\/signin|\/member/);
  });
});