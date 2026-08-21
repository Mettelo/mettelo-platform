import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type PagePayload={values:Record<string,string>};
function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
async function savePage(api:APIRequestContext,pageKey:string,payload:PagePayload){const response=await api.patch('/api/admin/website/pages',{data:{page:pageKey,payload}});expect(response.status()).toBe(200);return response.json()}
async function publishPage(api:APIRequestContext,pageKey:string){const response=await api.post('/api/admin/website/pages',{data:{page:pageKey,action:'publish'}});expect(response.status()).toBe(200);return response.json()}
function clone(payload:PagePayload):PagePayload{return{values:{...payload.values}}}

test.describe('Admin Website public pages CMS',()=>{
 test('expanded CMS keeps drafts private, previews them, publishes live, and restores revisions to draft only',async({page})=>{
  await signIn(page,'/admin/website/pages');const api=page.context().request;const pageKey='opportunities';
  const response=await api.get(`/api/admin/website/pages?page=${pageKey}`);expect(response.status()).toBe(200);const current=await response.json();const originalDraft=clone(current.draft.payload as PagePayload);const originalPublished=clone(current.published.payload as PagePayload);
  const changed=clone(originalPublished);const marker=`${originalPublished.values.hero_title} CMS E2E`;changed.values.hero_title=marker;
  try{
   const saved=await savePage(api,pageKey,changed);expect(saved.ok).toBe(true);
   await page.goto('/opportunities',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1})).not.toContainText('CMS E2E');

   await page.goto('/admin/website/pages',{waitUntil:'networkidle'});await page.locator('.cmsLibrary nav button').filter({hasText:'Opportunities'}).click();await expect(page.getByText('Saved draft changes',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Preview draft'}).click();const preview=page.locator('.cmsPreviewDialog');await expect(preview.getByText('DRAFT PREVIEW · NOT LIVE')).toBeVisible();await expect(preview.getByText(marker,{exact:true})).toBeVisible();await preview.getByRole('button',{name:'Continue editing'}).click();

   await page.getByRole('button',{name:'Publish changes'}).click();const confirm=page.locator('.cmsPublishDialog');await expect(confirm.getByText('CONFIRM PUBLICATION')).toBeVisible();await confirm.getByRole('button',{name:'Publish Opportunities'}).click();await expect(page.getByRole('status')).toContainText('Published successfully');
   await page.goto('/opportunities',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1})).toContainText(marker);

   const firstHistoryResponse=await api.get(`/api/admin/website/pages/history?page=${pageKey}&page_number=1&page_size=10`);expect(firstHistoryResponse.status()).toBe(200);const firstHistory=await firstHistoryResponse.json();const changedRevision=firstHistory.items?.[0];expect(changedRevision?.revision_number).toBeGreaterThan(0);

   await savePage(api,pageKey,originalPublished);await publishPage(api,pageKey);
   await page.goto('/opportunities',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1})).not.toContainText('CMS E2E');

   const restore=await api.post('/api/admin/website/pages/history',{data:{page:pageKey,revision_id:changedRevision.id,action:'restore_draft'}});expect(restore.status()).toBe(200);const restored=await api.get(`/api/admin/website/pages?page=${pageKey}`);const restoredBody=await restored.json();expect(restoredBody.draft.payload.values.hero_title).toContain('CMS E2E');expect(restoredBody.published.payload.values.hero_title).not.toContain('CMS E2E');
   await page.goto('/opportunities',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1}),'public page stays unchanged after restore_draft').not.toContainText('CMS E2E');
  }finally{
   await savePage(api,pageKey,originalPublished);await publishPage(api,pageKey);if(JSON.stringify(originalDraft)!==JSON.stringify(originalPublished))await savePage(api,pageKey,originalDraft);
  }
 });

 test('Privacy and Terms are governed legal pages with draft isolation and deliberate publication',async({page})=>{
  await signIn(page,'/admin/website/pages');const api=page.context().request;
  await page.getByPlaceholder('Search public pages').fill('Privacy');await expect(page.getByRole('button',{name:/Privacy Policy/})).toBeVisible();await page.getByRole('button',{name:/Privacy Policy/}).click();await expect(page.getByText('LEGAL · PUBLIC PAGE')).toBeVisible();await expect(page.getByText('/privacy',{exact:true})).toBeVisible();
  await page.getByPlaceholder('Search public pages').fill('Terms');await expect(page.getByRole('button',{name:/Terms of Use/})).toBeVisible();

  const pageKey='privacy';const response=await api.get(`/api/admin/website/pages?page=${pageKey}`);expect(response.status()).toBe(200);const current=await response.json();const originalDraft=clone(current.draft.payload as PagePayload);const originalPublished=clone(current.published.payload as PagePayload);const changed=clone(originalPublished);changed.values.section_1_title=`${originalPublished.values.section_1_title} LEGAL E2E`;
  try{
   await savePage(api,pageKey,changed);await page.goto('/privacy',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:2}).first()).not.toContainText('LEGAL E2E');
   await publishPage(api,pageKey);await page.goto('/privacy',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:2}).first()).toContainText('LEGAL E2E');
  }finally{
   await savePage(api,pageKey,originalPublished);await publishPage(api,pageKey);if(JSON.stringify(originalDraft)!==JSON.stringify(originalPublished))await savePage(api,pageKey,originalDraft);
  }
 });

 test('Page library, publishing controls and protected Contact form remain responsive',async({page})=>{
  await signIn(page,'/admin/website/pages');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/admin/website/pages',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:'Public pages'})).toBeVisible();await expect(page.getByPlaceholder('Search public pages')).toBeVisible();await expect(page.getByRole('button',{name:/Projects/}).first()).toBeVisible();await expect(page.getByRole('button',{name:'Preview draft'})).toBeVisible();await expect(page.getByRole('button',{name:'Save draft'})).toBeVisible();await expect(page.getByRole('button',{name:'Publish changes'})).toBeVisible();await noOverflow(page,`Website Pages overflowed at ${width}px`)}
  await page.goto('/contact',{waitUntil:'networkidle'});await expect(page.locator('input[name="name"]')).toBeVisible();await expect(page.locator('#contact-email')).toBeVisible();await expect(page.locator('select[name="topic"]')).toBeVisible();await expect(page.locator('textarea[name="message"]')).toBeVisible();await expect(page.locator('input[name="consent"]')).toBeVisible();
 });
});
