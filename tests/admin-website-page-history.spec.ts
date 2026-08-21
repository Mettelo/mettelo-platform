import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type PagePayload={values:Record<string,string>};
type Revision={id:number;revision_number:number;payload:PagePayload|null;source:'baseline'|'publish'|'restored_publish';restored_from_revision_id:number|null;valid:boolean};
type HistoryResponse={items:Revision[];page:number;page_size:number;total:number;pages:number};

function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
function clone(payload:PagePayload):PagePayload{return{values:{...payload.values}}}
async function pageState(api:APIRequestContext){const response=await api.get('/api/admin/website/pages?page=home');expect(response.status()).toBe(200);return response.json()}
async function save(api:APIRequestContext,payload:PagePayload){const response=await api.patch('/api/admin/website/pages',{data:{page:'home',payload}});expect(response.status()).toBe(200);return response.json()}
async function publish(api:APIRequestContext){const response=await api.post('/api/admin/website/pages',{data:{page:'home',action:'publish'}});expect(response.status()).toBe(200);return response.json()}
async function history(api:APIRequestContext,pageSize=25){const response=await api.get(`/api/admin/website/pages/history?page=home&page_number=1&page_size=${pageSize}`);expect(response.status()).toBe(200);return response.json() as Promise<HistoryResponse>}

// This test intentionally creates immutable revisions in the disposable isolated Supabase database.
// It restores the original published/draft page state before exiting, but historical test revisions remain as evidence inside that disposable run only.
test.describe('Admin Website immutable page history',()=>{
 test('restore creates a draft, public page remains current, then explicit publish creates a restored revision',async({page})=>{
  await signIn(page,'/admin/website/pages/history');
  const api=page.context().request;
  const initial=await pageState(api);
  const originalPublished=clone(initial.published.payload as PagePayload);
  const originalDraft=clone(initial.draft.payload as PagePayload);
  const versionA=clone(originalPublished);versionA.values.hero_title=`${originalPublished.values.hero_title} History A`;
  const versionB=clone(originalPublished);versionB.values.hero_title=`${originalPublished.values.hero_title} History B`;

  try{
   await save(api,versionA);const publishA=await publish(api);expect(publishA.revision?.number).toBeGreaterThan(0);
   await save(api,versionB);const publishB=await publish(api);expect(publishB.revision.number).toBeGreaterThan(publishA.revision.number);
   const afterTwo=await history(api,25);
   const revisionA=afterTwo.items.find(item=>item.valid&&item.payload?.values.hero_title===versionA.values.hero_title);
   const revisionB=afterTwo.items.find(item=>item.valid&&item.payload?.values.hero_title===versionB.values.hero_title);
   expect(revisionA,'first published marker should appear in immutable history').toBeTruthy();expect(revisionB,'second published marker should appear in immutable history').toBeTruthy();
   const restore=await api.post('/api/admin/website/pages/history',{data:{page:'home',revision_id:revisionA!.id,action:'restore_draft'}});expect(restore.status()).toBe(200);const restoreBody=await restore.json();expect(restoreBody.restored_revision.id).toBe(revisionA!.id);
   const restoredState=await pageState(api);expect(restoredState.draft.payload.values.hero_title).toBe(versionA.values.hero_title);expect(restoredState.draft.restored_from_revision_id).toBe(revisionA!.id);expect(restoredState.published.payload.values.hero_title).toBe(versionB.values.hero_title);
   await page.goto('/',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1})).toContainText(versionB.values.hero_title);expect(await page.getByRole('heading',{level:1}).textContent(),'public page remains on version B after restore_draft').not.toContain(versionA.values.hero_title);
   const republish=await publish(api);expect(republish.revision.number).toBeGreaterThan(publishB.revision.number);await page.goto('/',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1})).toContainText(versionA.values.hero_title);
   const afterRestorePublish=await history(api,25);const newest=afterRestorePublish.items[0];expect(newest.source).toBe('restored_publish');expect(newest.restored_from_revision_id).toBe(revisionA!.id);expect(newest.payload?.values.hero_title).toBe(versionA.values.hero_title);
   const audit=await api.get('/api/admin/audit?action=website.page.revision.restored_to_draft&page=1&page_size=25');expect(audit.status()).toBe(200);const auditPayload=await audit.json();expect(auditPayload.total).toBeGreaterThan(0);
  }finally{await save(api,originalPublished);await publish(api);if(JSON.stringify(originalDraft)!==JSON.stringify(originalPublished))await save(api,originalDraft)}
 });
 test('Revision history workspace is responsive and exposes bounded pagination controls',async({page})=>{
  await signIn(page,'/admin/website/pages/history');
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/admin/website/pages/history',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:'Revision history'})).toBeVisible();await expect(page.getByRole('combobox',{name:'Page',exact:true})).toBeVisible();const rows=page.getByRole('combobox',{name:'Rows',exact:true});await expect(rows).toBeVisible();const options=rows.locator('option');await expect(options).toHaveCount(3);await expect(options.nth(0)).toHaveAttribute('value','25');await expect(options.nth(1)).toHaveAttribute('value','50');await expect(options.nth(2)).toHaveAttribute('value','100');await expect(page.getByRole('link',{name:'Back to Pages'})).toBeVisible();await noOverflow(page,`Revision history overflowed at ${width}px`)}
 });
});
