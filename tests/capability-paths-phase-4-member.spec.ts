import {createClient} from '@supabase/supabase-js';
import {expect,test,type APIRequestContext,type Page} from '@playwright/test';

const projectId='00000000-0000-4000-8000-00000000e2e1';
type CreatedPath={id:string;slug:string};
function credentials(kind:'admin'|'member'){const email=process.env[kind==='admin'?'E2E_ADMIN_EMAIL':'E2E_MEMBER_EMAIL']?.trim(),password=process.env[kind==='admin'?'E2E_ADMIN_PASSWORD':'E2E_MEMBER_PASSWORD'];if(!email||!password)throw new Error(`Missing E2E ${kind} credentials.`);return{email,password}}
async function signIn(page:Page,kind:'admin'|'member',next:string){const account=credentials(kind);await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function createPath(api:APIRequestContext,name:string,stamp:number){const response=await api.post('/api/admin/capability-paths',{data:{name,slug:`${name.toLowerCase().replaceAll(' ','-')}-${stamp}`,target_role:name,target_outcome:`Build toward advanced ${name} capability.`}});expect(response.status()).toBe(201);return(await response.json()).item as CreatedPath}
async function structure(api:APIRequestContext,path:CreatedPath,stage:string,position:number){const response=await api.put('/api/admin/capability-paths',{data:{id:path.id,stages:[{slug:stage.toLowerCase(),name:stage,position:1}],placements:[{project_id:projectId,stage_slug:stage.toLowerCase(),position,competency_focus:'Evidence-backed analytical judgement',capability_built:'Turn governed project evidence into a professional decision',prerequisite_project_id:'',prerequisite_mode:'recommended',path_outcome:'Demonstrate practical delivery judgement',placement_type:'recommended'}]}});expect(response.status()).toBe(200)}
async function publish(api:APIRequestContext,path:CreatedPath){const response=await api.patch('/api/admin/capability-paths',{data:{id:path.id,action:'publish'}});expect(response.status()).toBe(200)}
function serviceDb(){const url=process.env.E2E_SUPABASE_URL?.trim(),key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated Supabase service credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Phase 4 test refuses non-local Supabase.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth,label).toBeLessThanOrEqual(size.clientWidth)}

test.describe('Capability Paths Phase 4 member lifecycle',()=>{
 test('follow, primary direction, canonical completion reuse and separate Proof remain truthful',async({page})=>{
  const service=serviceDb();const memberEmail=credentials('member').email;const {data:userList}=await service.auth.admin.listUsers({page:1,perPage:1000});const member=userList.users.find(user=>user.email?.toLowerCase()===memberEmail.toLowerCase());expect(member).toBeTruthy();const memberId=member!.id;
  const [{count:membershipBefore},{count:proofBefore},{count:applicationBefore}]=await Promise.all([
   service.from('project_members').select('id',{count:'exact',head:true}).eq('user_id',memberId).eq('project_id',projectId),
   service.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',memberId).eq('project_id',projectId),
   service.from('project_applications').select('id',{count:'exact',head:true}).eq('user_id',memberId).eq('project_id',projectId)
  ]);
  await signIn(page,'admin','/admin/capability-paths');const adminApi=page.context().request;const stamp=Date.now();const pathA=await createPath(adminApi,'E2E Member Data Analyst',stamp);const pathB=await createPath(adminApi,'E2E Member BI Analyst',stamp);await structure(adminApi,pathA,'Foundation',1);await structure(adminApi,pathB,'Applied',4);await publish(adminApi,pathA);await publish(adminApi,pathB);
  try{
   await page.context().clearCookies();await signIn(page,'member','/member/discover');const memberApi=page.context().request;
   const followA=await memberApi.post('/api/member/capability-paths',{data:{action:'follow',path_id:pathA.id}});expect(followA.status()).toBe(200);const followB=await memberApi.post('/api/member/capability-paths',{data:{action:'follow',path_id:pathB.id}});expect(followB.status()).toBe(200);const primaryA=await memberApi.post('/api/member/capability-paths',{data:{action:'set_primary',path_id:pathA.id}});expect(primaryA.status()).toBe(200);
   await page.goto('/member/discover',{waitUntil:'networkidle'});const cardA=page.locator('article.mcpCard').filter({hasText:'E2E Member Data Analyst'});const cardB=page.locator('article.mcpCard').filter({hasText:'E2E Member BI Analyst'});await expect(cardA).toContainText('PRIMARY PATH');await expect(cardA).toContainText('0/1');await expect(cardA).toContainText('Verified Proof');await expect(cardA).toContainText('1');await expect(cardB).toContainText('0/1');
   const {error:completeError}=await service.from('project_members').update({membership_status:'completed'}).eq('user_id',memberId).eq('project_id',projectId);if(completeError)throw completeError;
   await page.reload({waitUntil:'networkidle'});await expect(page.locator('article.mcpCard').filter({hasText:'E2E Member Data Analyst'})).toContainText('1/1');await expect(page.locator('article.mcpCard').filter({hasText:'E2E Member BI Analyst'})).toContainText('1/1');
   const primaryB=await memberApi.post('/api/member/capability-paths',{data:{action:'set_primary',path_id:pathB.id}});expect(primaryB.status()).toBe(200);await page.reload({waitUntil:'networkidle'});await expect(page.locator('article.mcpCard').filter({hasText:'E2E Member BI Analyst'})).toContainText('PRIMARY PATH');await expect(page.locator('article.mcpCard').filter({hasText:'E2E Member Data Analyst'})).toContainText('1/1');
   await page.goto(`/member/discover?path=${encodeURIComponent(pathB.slug)}&stage=Applied`,{waitUntil:'networkidle'});await expect(page.locator('#member-path-filter')).toHaveValue(pathB.slug);await expect(page.locator('#member-stage-filter')).toHaveValue('Applied');
   await page.goto('/member/recommended',{waitUntil:'networkidle'});await expect(page.getByText('PRIMARY CAPABILITY PATH',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Continue E2E Member BI Analyst'})).toBeVisible();
   const [{count:membershipAfter},{count:proofAfter},{count:applicationAfter}]=await Promise.all([
    service.from('project_members').select('id',{count:'exact',head:true}).eq('user_id',memberId).eq('project_id',projectId),
    service.from('contributions').select('id',{count:'exact',head:true}).eq('user_id',memberId).eq('project_id',projectId),
    service.from('project_applications').select('id',{count:'exact',head:true}).eq('user_id',memberId).eq('project_id',projectId)
   ]);expect(membershipAfter).toBe(membershipBefore);expect(proofAfter).toBe(proofBefore);expect(applicationAfter).toBe(applicationBefore);
   for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto('/member/discover',{waitUntil:'networkidle'});await noOverflow(page,`Phase 4 member Discover overflowed at ${width}px`)}await page.setViewportSize({width:768,height:900});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await noOverflow(page,'Phase 4 member Discover overflowed at 200% text');
  }finally{
   await service.from('project_members').update({membership_status:'active'}).eq('user_id',memberId).eq('project_id',projectId);
   await service.from('member_capability_paths').delete().eq('user_id',memberId).in('path_id',[pathA.id,pathB.id]);
   await service.from('capability_paths').delete().in('id',[pathA.id,pathB.id]);
  }
 });
});
