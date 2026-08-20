import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type SeoPayload={title:string;description:string;canonical:string;og_title:string;og_description:string;og_image:string;index:boolean;follow:boolean};

function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
function clone(payload:SeoPayload):SeoPayload{return{...payload}}
async function state(api:APIRequestContext){const response=await api.get('/api/admin/website/seo?scope=home');expect(response.status()).toBe(200);return response.json()}
async function save(api:APIRequestContext,payload:SeoPayload){const response=await api.patch('/api/admin/website/seo',{data:{scope:'home',payload}});expect(response.status()).toBe(200);return response.json()}
async function publish(api:APIRequestContext){const response=await api.post('/api/admin/website/seo',{data:{scope:'home',action:'publish'}});expect(response.status()).toBe(200);return response.json()}

test.describe('Admin Website SEO management',()=>{
 test('published Homepage metadata and indexing update without changing page content',async({page})=>{
  await signIn(page,'/admin/website/seo');
  const api=page.context().request;const current=await state(api);
  const originalPublished=clone(current.published.payload as SeoPayload);const originalDraft=clone(current.draft.payload as SeoPayload);
  const marker='Mettelo SEO E2E Marker';
  const changed:SeoPayload={...originalPublished,title:marker,description:'Temporary governed SEO description used only by the isolated release test.',og_title:`${marker} Social`,og_description:'Temporary social preview copy used only by the isolated release test.',index:false,follow:true};

  const unsafe=await api.patch('/api/admin/website/seo',{data:{scope:'home',payload:{...changed,canonical:'javascript:alert(1)'}}});
  expect(unsafe.status()).toBe(400);

  try{
   const saved=await save(api,changed);expect(saved.ok).toBe(true);
   const published=await publish(api);expect(published.ok).toBe(true);

   await page.goto('/',{waitUntil:'networkidle'});
   await expect(page).toHaveTitle(marker);
   await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',changed.description);
   await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content',changed.og_title);
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://mettelo.com/');
   const robots=await page.locator('meta[name="robots"]').getAttribute('content');expect(robots||'').toContain('noindex');
   await expect(page.getByRole('heading',{level:1})).toBeVisible();

   const sitemap=await api.get('/sitemap.xml');expect(sitemap.status()).toBe(200);const sitemapText=await sitemap.text();expect(sitemapText).not.toContain('<loc>https://mettelo.com/</loc>');
   expect(sitemapText).toContain('<loc>https://mettelo.com/about</loc>');

   const audit=await api.get('/api/admin/audit?action=website.seo.published&page=1&page_size=25');expect(audit.status()).toBe(200);const auditPayload=await audit.json();expect(auditPayload.total).toBeGreaterThan(0);
  }finally{
   await save(api,originalPublished);await publish(api);if(JSON.stringify(originalDraft)!==JSON.stringify(originalPublished))await save(api,originalDraft);
  }
 });

 test('SEO workspace is discoverable, responsive and clearly separates draft from publish',async({page})=>{
  await signIn(page,'/admin/website');
  await expect(page.locator('a[href="/admin/website/seo"].adminFoundationCard')).toBeVisible();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto('/admin/website/seo',{waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{level:1,name:'Search & social SEO'})).toBeVisible();
   await expect(page.getByLabel('Scope')).toBeVisible();
   await expect(page.getByRole('button',{name:'Save draft'})).toBeVisible();
   await expect(page.getByRole('button',{name:'Publish SEO'})).toBeVisible();
   await expect(page.getByText(/do not guarantee a particular Google ranking/i)).toBeVisible();
   await noOverflow(page,`Website SEO overflowed at ${width}px`);
  }
  await page.getByLabel('Scope').selectOption('global');
  await expect(page.getByText('Google verification token')).toBeVisible();
  await expect(page.getByText('Bing verification token')).toBeVisible();
 });
});
