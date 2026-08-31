import {expect,test,type Page} from '@playwright/test';

function credentials(){const email=process.env.E2E_ADMIN_EMAIL?.trim(),password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E Admin credentials.');return{email,password}}
async function signIn(page:Page,next:string){const account=credentials();await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth)}

const projectId='00000000-0000-4000-8000-00000000e2e1';
const secondProjectId='00000000-0000-4000-8000-00000000e2e2';

test.describe('Capability Paths Phase 2 Admin lifecycle',()=>{
 test('Admin authoring preserves canonical projects and enforces governed publication lifecycle',async({page})=>{
  await signIn(page,'/admin/capability-paths');
  await expect(page.getByRole('heading',{level:1,name:'Capability Paths'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Create Capability Path'})).toBeVisible();
  const api=page.context().request,stamp=Date.now();
  const create=async(name:string)=>{const response=await api.post('/api/admin/capability-paths',{data:{name,slug:`${name.toLowerCase().replaceAll(' ','-')}-${stamp}`,target_role:name,target_outcome:`Build toward advanced ${name} capability.`}});expect(response.status()).toBe(201);return (await response.json()).item as {id:string;slug:string}};
  const pathA=await create('E2E Data Analyst'),pathB=await create('E2E BI Analyst');
  const structure=async(id:string,stageName:string,position:number)=>{const response=await api.put('/api/admin/capability-paths',{data:{id,stages:[{slug:stageName.toLowerCase(),name:stageName,position:1}],placements:[{project_id:projectId,stage_slug:stageName.toLowerCase(),position,competency_focus:'Evidence-backed analysis',capability_built:'Translate project evidence into a professional decision',prerequisite_project_id:'',prerequisite_mode:'recommended',path_outcome:'Demonstrate practical analytical judgement',placement_type:'recommended'}]}});expect(response.status()).toBe(200)};
  await structure(pathA.id,'Foundation',1);await structure(pathB.id,'Advanced',7);

  const beforeProject=await api.get('/api/admin/projects');expect(beforeProject.status()).toBe(200);const projectPayload=await beforeProject.json();expect(projectPayload.items.filter((item:{id:string})=>item.id===projectId)).toHaveLength(1);
  const publishA=await api.patch('/api/admin/capability-paths',{data:{id:pathA.id,action:'publish'}});expect(publishA.status()).toBe(200);
  const publishB=await api.patch('/api/admin/capability-paths',{data:{id:pathB.id,action:'publish'}});expect(publishB.status()).toBe(200);
  const placements=await api.get(`/api/admin/capability-paths?project_id=${projectId}`);expect(placements.status()).toBe(200);const placementPayload=await placements.json();expect(placementPayload.items.filter((item:{path_id:string})=>[pathA.id,pathB.id].includes(item.path_id))).toHaveLength(2);

  const publishedStructureMutation=await api.put('/api/admin/capability-paths',{data:{id:pathA.id,stages:[{slug:'foundation',name:'Foundation',position:1}],placements:[]}});expect(publishedStructureMutation.status()).toBe(409);
  const publishedMetaMutation=await api.patch('/api/admin/capability-paths',{data:{id:pathA.id,action:'save',name:'Unsafe published edit'}});expect(publishedMetaMutation.status()).toBe(409);

  await page.goto(`/admin/capability-paths?path=${pathA.id}`,{waitUntil:'networkidle'});await expect(page.getByText('Published Path is protected')).toBeVisible();await expect(page.getByRole('button',{name:'Move to Draft to edit'})).toBeVisible();
  const editDraft=await api.patch('/api/admin/capability-paths',{data:{id:pathA.id,action:'edit-draft'}});expect(editDraft.status()).toBe(200);expect((await editDraft.json()).item.status).toBe('draft');

  const forwardPrerequisite=await api.put('/api/admin/capability-paths',{data:{id:pathA.id,stages:[{slug:'foundation',name:'Foundation',position:1}],placements:[{project_id:projectId,stage_slug:'foundation',position:1,competency_focus:'A',capability_built:'A',prerequisite_project_id:secondProjectId,prerequisite_mode:'recommended',placement_type:'recommended'},{project_id:secondProjectId,stage_slug:'foundation',position:2,competency_focus:'B',capability_built:'B',prerequisite_project_id:'',prerequisite_mode:'recommended',placement_type:'recommended'}]}});expect(forwardPrerequisite.status()).toBe(409);expect((await forwardPrerequisite.json()).error).toContain('prerequisite must appear earlier');

  const republish=await api.patch('/api/admin/capability-paths',{data:{id:pathA.id,action:'publish'}});expect(republish.status()).toBe(200);
  const archive=await api.patch('/api/admin/capability-paths',{data:{id:pathA.id,action:'archive'}});expect(archive.status()).toBe(200);const archived=(await archive.json()).item;expect(archived.status).toBe('archived');expect(archived.archived_at).toBeTruthy();expect(archived.archived_by).toBeTruthy();
  const restore=await api.patch('/api/admin/capability-paths',{data:{id:pathA.id,action:'restore'}});expect(restore.status()).toBe(200);const restored=(await restore.json()).item;expect(restored.status).toBe('draft');expect(restored.archived_at).toBe(archived.archived_at);expect(restored.archived_by).toBe(archived.archived_by);expect(restored.restored_at).toBeTruthy();expect(restored.restored_by).toBeTruthy();

  const afterProject=await api.get('/api/admin/projects');expect(afterProject.status()).toBe(200);const afterPayload=await afterProject.json();expect(afterPayload.items.filter((item:{id:string})=>item.id===projectId)).toHaveLength(1);
  const paged=await api.get('/api/admin/capability-paths?page=1&page_size=1&sort=updated');expect(paged.status()).toBe(200);const pagedPayload=await paged.json();expect(pagedPayload.items.length).toBeLessThanOrEqual(1);expect(typeof pagedPayload.total).toBe('number');

  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/admin/capability-paths',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:'Capability Paths'})).toBeVisible();await noOverflow(page,`Capability Paths Admin overflowed at ${width}px`)}
  await page.setViewportSize({width:390,height:900});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await noOverflow(page,'Capability Paths Admin overflowed at 200% text size');
 });

 test('Create Path dialog supports keyboard dismissal',async({page})=>{await signIn(page,'/admin/capability-paths');await page.getByRole('button',{name:'Create Capability Path'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeHidden()});
});
