import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

function credentials(){const email=process.env.E2E_ADMIN_EMAIL?.trim(),password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E Admin credentials.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth)}

const projectId='00000000-0000-4000-8000-00000000e2e1';

type CreatedPath={id:string;slug:string;name:string};
async function createPath(api:APIRequestContext,name:string,stamp:string):Promise<CreatedPath>{const displayName=`${name} ${stamp}`;const response=await api.post('/api/admin/capability-paths',{data:{name:displayName,slug:`${name.toLowerCase().replaceAll(' ','-')}-${stamp}`,target_role:name,target_outcome:`Build toward advanced ${name} capability.`}});expect(response.status()).toBe(201);const item=(await response.json()).item as CreatedPath;return{...item,name:displayName}}
async function structure(api:APIRequestContext,path:CreatedPath,stage:string,position:number){const response=await api.put('/api/admin/capability-paths',{data:{id:path.id,stages:[{slug:stage.toLowerCase(),name:stage,position:1}],placements:[{project_id:projectId,stage_slug:stage.toLowerCase(),position,competency_focus:'Evidence-backed analysis',capability_built:'Translate project evidence into a professional decision',prerequisite_project_id:'',prerequisite_mode:'recommended',path_outcome:'Demonstrate practical analytical judgement',placement_type:'recommended'}]}});expect(response.status()).toBe(200)}
async function publish(api:APIRequestContext,path:CreatedPath){const response=await api.patch('/api/admin/capability-paths',{data:{id:path.id,action:'publish'}});expect(response.status()).toBe(200)}

test.describe('Capability Paths Phase 3 public journey',()=>{
 test('public users discover only published Paths and reused projects retain one canonical route',async({page},testInfo)=>{
  await signIn(page,'/admin/capability-paths');const api=page.context().request;const stamp=`${Date.now()}-${testInfo.retry}-${Math.random().toString(36).slice(2,8)}`;
  const pathA=await createPath(api,'E2E Public Data Analyst',stamp);const pathB=await createPath(api,'E2E Public BI Analyst',stamp);const draft=await createPath(api,'E2E Draft Path',stamp);
  await structure(api,pathA,'Foundation',1);await structure(api,pathB,'Advanced',7);await structure(api,draft,'Foundation',1);await publish(api,pathA);await publish(api,pathB);
  const archived=await createPath(api,'E2E Archived Path',stamp);await structure(api,archived,'Foundation',1);await publish(api,archived);const archiveResponse=await api.patch('/api/admin/capability-paths',{data:{id:archived.id,action:'archive'}});expect(archiveResponse.status()).toBe(200);
  await page.context().clearCookies();

  await page.goto('/projects',{waitUntil:'networkidle'});expect(new URL(page.url()).pathname).toBe('/projects');await expect(page.getByRole('heading',{name:'Follow a Capability Path.'})).toBeVisible({timeout:15_000});await expect(page.getByRole('link',{name:'View all Capability Paths →'})).toHaveAttribute('href','/projects/paths');
  await page.goto('/projects/paths',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:'Build capability through a sequence of real projects.'})).toBeVisible();await expect(page.getByText(pathA.name,{exact:true})).toBeVisible();await expect(page.getByText(draft.name,{exact:true})).toHaveCount(0);await expect(page.getByText(archived.name,{exact:true})).toHaveCount(0);

  await page.goto(`/projects/paths/${pathA.slug}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:pathA.name})).toBeVisible();const projectLinkA=page.locator(`a[href^="/projects/${projectId}"]`).first();await expect(projectLinkA).toBeVisible();expect(new URL(await projectLinkA.getAttribute('href')||'', 'http://example.test').pathname).toBe(`/projects/${projectId}`);
  await page.goto(`/projects/paths/${pathB.slug}`,{waitUntil:'networkidle'});const projectLinkB=page.locator(`a[href^="/projects/${projectId}"]`).first();await expect(projectLinkB).toBeVisible();expect(new URL(await projectLinkB.getAttribute('href')||'', 'http://example.test').pathname).toBe(`/projects/${projectId}`);

  await page.goto(`/projects/${projectId}?path=${encodeURIComponent(pathA.slug)}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:'Where this project fits.'})).toBeVisible();await expect(page.getByText(pathA.name,{exact:true})).toBeVisible();await expect(page.getByText(pathB.name,{exact:true})).toBeVisible();await expect(page.getByRole('link',{name:`← Back to ${pathA.name} Capability Path`})).toBeVisible();

  await page.goto(`/projects?path=${encodeURIComponent(pathB.slug)}#projects`,{waitUntil:'networkidle'});await expect(page.locator('#path-filter')).toHaveValue(pathB.slug);await expect(page.getByText('PATH PROJECT 07')).toBeVisible();

  const draftResponse=await page.goto(`/projects/paths/${draft.slug}`,{waitUntil:'networkidle'});expect(draftResponse?.status()).toBe(404);await expect(page.getByText(draft.name,{exact:true})).toHaveCount(0);
  const archivedResponse=await page.goto(`/projects/paths/${archived.slug}`,{waitUntil:'networkidle'});expect(archivedResponse?.status()).toBe(404);await expect(page.getByText(archived.name,{exact:true})).toHaveCount(0);
 });

 test('Capability Path public surfaces reflow without horizontal overflow',async({page})=>{
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:900});await page.goto('/projects/paths',{waitUntil:'networkidle'});await noOverflow(page,`Capability Path index overflowed at ${width}px`)}
  await page.setViewportSize({width:768,height:900});await page.goto('/projects/paths',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await noOverflow(page,'Capability Path index overflowed at 200% text');
 });
});
