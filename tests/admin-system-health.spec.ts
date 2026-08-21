import {expect,test,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}

test.describe('Admin System aggregate health',()=>{
 test('health API is capability-gated and returns aggregate operational evidence only',async({page,request})=>{
  const anonymous=await request.get('/api/admin/system/health');expect(anonymous.status()).toBe(401);
  await signIn(page,'/admin/system/health');
  const response=await page.request.get('/api/admin/system/health');expect(response.status()).toBe(200);const body=await response.json();
  expect(body.audit.state).toBe('available');expect(body.delivery.state).toBe('available');expect(typeof body.audit.events_24h).toBe('number');expect(typeof body.delivery.queued).toBe('number');expect(typeof body.can_manage_delivery).toBe('boolean');
  const serialized=JSON.stringify(body).toLowerCase();for(const forbidden of ['recipient_email','subject','body_template','payload','service_role','anon_key','password','refresh_token','access_token'])expect(serialized).not.toContain(forbidden);
  expect(Object.keys(body.audit).sort()).toEqual(['denied_24h','events_24h','failures_24h','latest_event_at','state'].sort());
  expect(Object.keys(body.delivery).sort()).toEqual(['dead_letter','failed','latest_delivery_at','queued','retrying','sent_24h','state'].sort());
 });

 test('System health is discoverable and responsive',async({page})=>{
  await signIn(page,'/admin/system');await expect(page.locator('a[href="/admin/system/health"].adminFoundationCard')).toBeVisible();
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/admin/system/health',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:'System health'})).toBeVisible();await expect(page.getByRole('heading',{name:'Admin audit activity'})).toBeVisible();await expect(page.getByRole('heading',{name:'Transactional email delivery'})).toBeVisible();await expect(page.getByText('Unknown is not healthy.')).toBeVisible();await expect(page.getByRole('button',{name:'Refresh status'})).toBeVisible();await noOverflow(page,`System health overflowed at ${width}px`);}
 });
});
