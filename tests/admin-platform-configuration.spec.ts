import {expect,test,type BrowserContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type StatusValue='configured'|'missing'|'enabled'|'disabled'|'unknown';
type StatusPayload={status:Record<string,StatusValue>};

function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
async function close(context:BrowserContext|null){if(context)await context.close()}

test.describe('Admin Platform configuration safety',()=>{
 test('authentication status is bounded, secret-free and anonymously protected',async({page,browser})=>{
  await signIn(page,'/admin/platform/auth');
  const response=await page.request.get('/api/admin/platform/auth-status');expect(response.status()).toBe(200);const body=await response.json() as StatusPayload;
  const allowed=new Set<StatusValue>(['configured','missing','enabled','disabled','unknown']);
  for(const value of Object.values(body.status)){expect(allowed.has(value),`Unexpected auth status ${value}`).toBe(true)}
  const serialized=JSON.stringify(body);
  for(const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY]){if(secret)expect(serialized).not.toContain(secret)}

  let anonymous:BrowserContext|null=null;try{anonymous=await browser.newContext();const anonymousPage=await anonymous.newPage();const unauthenticated=await anonymousPage.request.get('/api/admin/platform/auth-status');expect(unauthenticated.status()).toBe(401)}finally{await close(anonymous)}

  const invalidSetting=await page.request.patch('/api/admin/settings',{data:{setting_key:'social_x',value:'http://unsafe.example'}});expect(invalidSetting.status()).toBe(400);const invalidBody=await invalidSetting.json();expect(String(invalidBody.error||'')).toContain('https://');
  const roles=await page.request.get('/api/admin/project-role-catalogue');expect(roles.status()).toBe(200);
 });

 test('Platform controls and authentication status remain discoverable and responsive',async({page})=>{
  await signIn(page,'/admin/platform');
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto('/admin/platform',{waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{level:1,name:'Platform controls'})).toBeVisible();
   await expect(page.locator('a[href="/admin/platform/auth"].adminFoundationCard')).toBeVisible();
   await noOverflow(page,`Platform overview overflowed at ${width}px`);

   await page.goto('/admin/platform/auth',{waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{level:1,name:'Authentication & SSO status'})).toBeVisible();
   await expect(page.getByRole('link',{name:'Refresh status'})).toBeVisible();
   await expect(page.getByText(/Unknown state means/i)).toBeVisible();
   await expect(page.getByText('Feature flags are not managed here.')).toBeVisible();
   await noOverflow(page,`Authentication status overflowed at ${width}px`);

   await page.goto('/admin/settings',{waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{level:1,name:'Settings'})).toBeVisible();
   await noOverflow(page,`Platform Settings overflowed at ${width}px`);
  }
 });
});
