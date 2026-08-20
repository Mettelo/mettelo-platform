import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type NavigationItem={id:string;label:string;href:string;placement:'primary'|'secondary'|'explore';desktop_visible:boolean;mobile_visible:boolean;enabled:boolean;sort_order:number};
type NavigationPayload={items:NavigationItem[]};

function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
async function saveNavigation(api:APIRequestContext,payload:NavigationPayload){const response=await api.patch('/api/admin/website/chrome',{data:{scope:'navigation',payload}});expect(response.status()).toBe(200);return response.json()}
async function publishNavigation(api:APIRequestContext){const response=await api.post('/api/admin/website/chrome',{data:{scope:'navigation',action:'publish'}});expect(response.status()).toBe(200);return response.json()}

test.describe('Admin Website public chrome management',()=>{
 test('navigation draft validation, publishing and public consumption are governed',async({page})=>{
  await signIn(page,'/admin/website/navigation');
  const api=page.context().request;
  const currentResponse=await api.get('/api/admin/website/chrome?scope=navigation');
  expect(currentResponse.status()).toBe(200);
  const current=await currentResponse.json();
  const original=(current.draft?.payload||current.published?.payload) as NavigationPayload;
  expect(Array.isArray(original?.items)).toBe(true);
  expect(original.items.length).toBeGreaterThan(0);

  const dangerous:NavigationPayload={items:original.items.map((item,index)=>index===0?{...item,href:'/\\evil.example'}:item)};
  const rejected=await api.patch('/api/admin/website/chrome',{data:{scope:'navigation',payload:dangerous}});
  expect(rejected.status()).toBe(400);

  const targetIndex=Math.max(0,original.items.findIndex(item=>item.enabled&&item.desktop_visible));
  const target=original.items[targetIndex];
  const marker=`${target.label} E2E`;
  const changed:NavigationPayload={items:original.items.map((item,index)=>index===targetIndex?{...item,label:marker}:item)};

  try{
   const saved=await saveNavigation(api,changed);expect(saved.ok).toBe(true);
   const published=await publishNavigation(api);expect(published.ok).toBe(true);
   await page.setViewportSize({width:1440,height:900});
   await page.goto('/',{waitUntil:'networkidle'});
   await expect(page.locator('.managedDesktopNavigation')).toContainText(marker);
   const audit=await api.get('/api/admin/audit?action=website.chrome.published&page=1&page_size=25');
   expect(audit.status()).toBe(200);const auditPayload=await audit.json();expect(auditPayload.total).toBeGreaterThan(0);
  }finally{
   await saveNavigation(api,original);
   await publishNavigation(api);
  }
 });

 test('Website editors are discoverable, responsive and bounded',async({page})=>{
  await signIn(page,'/admin/website');
  await expect(page.locator('a[href="/admin/website/navigation"].adminFoundationCard')).toBeVisible();
  await expect(page.locator('a[href="/admin/website/footer"].adminFoundationCard')).toBeVisible();
  await expect(page.locator('a[href="/admin/website/branding"].adminFoundationCard')).toBeVisible();

  const routes=[
   {path:'/admin/website/navigation',heading:'Public navigation'},
   {path:'/admin/website/footer',heading:'Footer & social'},
   {path:'/admin/website/branding',heading:'Branding'}
  ];
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});
   for(const route of routes){
    await page.goto(route.path,{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{level:1,name:route.heading})).toBeVisible();
    await expect(page.getByRole('button',{name:'Save draft'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Publish'})).toBeVisible();
    await noOverflow(page,`${route.heading} overflowed at ${width}px`);
   }
  }
 });
});
