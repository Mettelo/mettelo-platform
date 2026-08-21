import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type MediaAsset={id:string;title:string;alt_text:string;decorative:boolean;public_url:string;mime_type:string;size_bytes:number;status:'active'|'archived'};

const ONE_PIXEL_PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z4VIAAAAASUVORK5CYII=','base64');
function credentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD. Run npm run check:e2e-config first.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
async function auditCount(api:APIRequestContext,action:string){const response=await api.get(`/api/admin/audit?action=${encodeURIComponent(action)}&page=1&page_size=25`);expect(response.status()).toBe(200);const body=await response.json();return Number(body.total||0)}

test.describe('Admin Website Media Library',()=>{
 test('Admin uploads a safe public image, updates metadata and archives without deleting its URL',async({page})=>{
  await signIn(page,'/admin/website/media');const api=page.context().request;
  const unsafe=await api.post('/api/admin/website/media',{multipart:{file:{name:'unsafe.html',mimeType:'text/html',buffer:Buffer.from('<script>alert(1)</script>')},title:'Unsafe asset',alt_text:'Unsafe asset',decorative:'false'}});expect(unsafe.status()).toBe(400);

  const marker=`Media E2E ${Date.now()}`;
  const upload=await api.post('/api/admin/website/media',{multipart:{file:{name:'pixel.png',mimeType:'image/png',buffer:ONE_PIXEL_PNG},title:marker,alt_text:'One pixel release-test image',decorative:'false'}});
  expect(upload.status()).toBe(201);const uploadBody=await upload.json();const asset=uploadBody.item as MediaAsset;expect(asset.title).toBe(marker);expect(asset.mime_type).toBe('image/png');expect(asset.status).toBe('active');expect(asset.public_url).toContain('/storage/v1/object/public/website-media/');

  const publicImage=await api.get(asset.public_url);expect(publicImage.status()).toBe(200);expect(publicImage.headers()['content-type']||'').toContain('image/png');
  const search=await api.get(`/api/admin/website/media?q=${encodeURIComponent(marker)}&status=active&page=1&page_size=25`);expect(search.status()).toBe(200);const searchBody=await search.json();expect(searchBody.items.some((item:MediaAsset)=>item.id===asset.id)).toBe(true);
  expect(await auditCount(api,'website.media.uploaded')).toBeGreaterThan(0);

  await page.goto('/admin/website/media',{waitUntil:'networkidle'});
  await page.getByLabel('Search title').fill(marker);
  await expect(page.getByText(marker,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Manage'}).click();
  await expect(page.getByRole('button',{name:'Copy public URL'})).toBeVisible();

  const updatedTitle=`${marker} updated`;const update=await api.patch('/api/admin/website/media',{data:{id:asset.id,title:updatedTitle,alt_text:'Updated accessible description',decorative:false,status:'active'}});expect(update.status()).toBe(200);const updateBody=await update.json();expect(updateBody.item.title).toBe(updatedTitle);expect(updateBody.item.alt_text).toBe('Updated accessible description');

  const archive=await api.patch('/api/admin/website/media',{data:{id:asset.id,title:updatedTitle,alt_text:'Updated accessible description',decorative:false,status:'archived'}});expect(archive.status()).toBe(200);const archiveBody=await archive.json();expect(archiveBody.item.status).toBe('archived');expect(await auditCount(api,'website.media.archived')).toBeGreaterThan(0);
  const archived=await api.get(`/api/admin/website/media?q=${encodeURIComponent(marker)}&status=archived&page=1&page_size=25`);expect(archived.status()).toBe(200);const archivedBody=await archived.json();expect(archivedBody.items.some((item:MediaAsset)=>item.id===asset.id)).toBe(true);
  const stillPublic=await api.get(asset.public_url);expect(stillPublic.status()).toBe(200);
 });

 test('Media workspace is discoverable, paginated and responsive',async({page})=>{
  await signIn(page,'/admin/website');await expect(page.locator('a[href="/admin/website/media"].adminFoundationCard')).toBeVisible();
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto('/admin/website/media',{waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{level:1,name:'Media Library'})).toBeVisible();
   await expect(page.getByLabel('Image file')).toBeVisible();
   await expect(page.getByLabel('Search title')).toBeVisible();
   await expect(page.getByLabel('Status')).toBeVisible();
   const rows=page.getByLabel('Rows');await expect(rows).toBeVisible();await expect(rows.locator('option')).toHaveCount(3);await expect(rows.locator('option').nth(0)).toHaveAttribute('value','25');await expect(rows.locator('option').nth(1)).toHaveAttribute('value','50');await expect(rows.locator('option').nth(2)).toHaveAttribute('value','100');
   await expect(page.getByRole('button',{name:'Upload image'})).toBeVisible();await noOverflow(page,`Website Media overflowed at ${width}px`);
  }
 });
});
