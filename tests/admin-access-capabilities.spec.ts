import {expect,test,type Browser,type BrowserContext,type Page} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';

type Credentials={email:string;password:string};
type Account={id:string;email:string;name?:string;username?:string;member_id?:string;is_admin:boolean;access_mode:string;capabilities:string[]};
type AccessResponse={users:Account[];current_user_id:string;total:number};

function adminCredentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD.');return{email,password}}
function memberCredentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E_MEMBER_EMAIL or E2E_MEMBER_PASSWORD.');return{email,password}}
function architectCredentials():Credentials{const email=process.env.E2E_ARCHITECT_EMAIL?.trim();const password=process.env.E2E_ARCHITECT_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ARCHITECT_EMAIL or E2E_ARCHITECT_PASSWORD.');return{email,password}}
function supabaseConfig(){const url=process.env.E2E_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.E2E_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)throw new Error('Missing local Supabase URL or anon key.');return{url,key}}
async function userClient(account:Credentials){const {url,key}=supabaseConfig();const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.signInWithPassword(account);if(error||!data.user)throw error||new Error('Unable to create E2E Supabase session.');return{client,user:data.user}}
async function signIn(page:Page,account:Credentials,next='/admin'){await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(dimensions.scrollWidth,label).toBeLessThanOrEqual(dimensions.clientWidth)}
async function auditCount(page:Page,action:string){const response=await page.request.get(`/api/admin/audit?action=${encodeURIComponent(action)}&page=1&page_size=25`);expect(response.status()).toBe(200);const body=await response.json();return Number(body.total||0)}
async function findAccount(page:Page,query:string){const response=await page.request.get(`/api/admin/access?q=${encodeURIComponent(query)}&access=all&page=1&page_size=25`);expect(response.status()).toBe(200);const body=await response.json() as AccessResponse;return{body,account:body.users.find(user=>user.email.toLowerCase()===query.toLowerCase()||user.username?.toLowerCase()===query.replace(/^@/,'').toLowerCase()||user.member_id?.toLowerCase()===query.toLowerCase())||null}}
async function revokeIfAdmin(page:Page,email:string){const latest=await findAccount(page,email);if(latest.account?.is_admin){const revoke=await page.request.patch('/api/admin/access',{data:{user_id:latest.account.id,action:'revoke'}});expect(revoke.status()).toBe(200)}const verified=await findAccount(page,email);expect(verified.account,'E2E member account must still exist after Admin cleanup').not.toBeNull();expect(verified.account!.is_admin,'E2E member Admin access must be fully revoked between tests').toBe(false);expect(verified.account!.access_mode).toBe('member');expect(verified.account!.capabilities).toEqual([])}
async function closeContext(context:BrowserContext|null){if(context)await context.close()}
async function signInFresh(browser:Browser,account:Credentials,next:string){const context=await browser.newContext();const page=await context.newPage();await signIn(page,account,next);return{context,page}}

test.describe('Admin capability access management',()=>{
 test('Phase 1 identity is constrained, race-safe and resolvable by Admin',async({page})=>{
  const member=await userClient(memberCredentials());const architect=await userClient(architectCredentials());const admin=await userClient(adminCredentials());
  const memberClaim=await member.client.rpc('claim_member_username',{p_username:'phase1_member'});expect(memberClaim.error).toBeNull();expect(memberClaim.data?.[0]).toMatchObject({success:true,claimed_username:'phase1_member'});expect(String(memberClaim.data?.[0]?.claimed_member_id||'')).toMatch(/^MTL-\d{6,}$/);
  const duplicate=await architect.client.rpc('claim_member_username',{p_username:'PHASE1_MEMBER'});expect(duplicate.error).toBeNull();expect(duplicate.data?.[0]).toMatchObject({success:false,code:'UNAVAILABLE'});
  const reserved=await admin.client.rpc('claim_member_username',{p_username:'admin'});expect(reserved.error).toBeNull();expect(reserved.data?.[0]).toMatchObject({success:false,code:'RESERVED'});
  const directUsername=await member.client.from('profiles').update({username:'bypass_identity'}).eq('id',member.user.id);expect(directUsername.error,'Owner RLS must not bypass canonical username claim').not.toBeNull();
  const directMemberId=await member.client.from('profiles').update({member_id:'MTL-999999'}).eq('id',member.user.id);expect(directMemberId.error,'Member ID must be immutable').not.toBeNull();
  await signIn(page,adminCredentials(),'/admin/access');const lookup=await findAccount(page,'@phase1_member');expect(lookup.account).not.toBeNull();expect(lookup.account?.username).toBe('phase1_member');expect(lookup.account?.member_id).toMatch(/^MTL-\d{6,}$/);
  await page.goto('/admin/access',{waitUntil:'networkidle'});await page.getByLabel('Member identity').fill('@phase1_member');await page.getByRole('button',{name:'Find member'}).click();await expect(page.getByText('@phase1_member',{exact:true})).toBeVisible();await expect(page.getByText(/^MTL-\d{6,}$/).first()).toBeVisible();
 });

 test('a member can receive narrow Admin access, remains blocked from unrelated routes and ungranted publish, then is revoked safely',async({page,browser})=>{
  test.setTimeout(90_000);
  const admin=adminCredentials();const member=memberCredentials();await signIn(page,admin,'/admin/access');
  await revokeIfAdmin(page,member.email);
  const found=await findAccount(page,member.email);expect(found.account,'E2E member account must exist').not.toBeNull();const target=found.account!;const currentUserId=found.body.current_user_id;expect(target.id).not.toBe(currentUserId);
  let targetContext:BrowserContext|null=null;
  try{
   const invalid=await page.request.patch('/api/admin/access',{data:{user_id:target.id,action:'grant',mode:'custom',capabilities:['website.content.edit','unknown.capability']}});expect(invalid.status()).toBe(400);
   const grant=await page.request.patch('/api/admin/access',{data:{user_id:target.id,action:'grant',mode:'custom',capabilities:['website.content.edit']}});expect(grant.status()).toBe(200);const granted=(await grant.json()).user as Account;expect(granted.is_admin).toBe(true);expect(granted.access_mode).toBe('custom');expect(granted.capabilities).toEqual(['website.content.edit']);expect(await auditCount(page,'admin.access.granted')).toBeGreaterThan(0);
   const targetSession=await signInFresh(browser,member,'/admin/website/media');targetContext=targetSession.context;expect(new URL(targetSession.page.url()).pathname).toBe('/admin/website/media');
   const mediaRead=await targetSession.page.request.get('/api/admin/website/media?page=1&page_size=25&status=active');expect(mediaRead.status()).toBe(200);
   const unrelatedApi=await targetSession.page.request.get('/api/admin/intake');expect(unrelatedApi.status()).toBe(403);const unrelatedBody=await unrelatedApi.json();expect(String(unrelatedBody.error||'')).toContain('capability');
   await targetSession.page.goto('/admin/intake',{waitUntil:'networkidle'});const blockedPage=new URL(targetSession.page.url());expect(blockedPage.pathname).toBe('/admin');expect(blockedPage.searchParams.get('reason')).toBe('capability');
   const stillAllowed=await targetSession.page.request.get('/api/admin/website/media?page=1&page_size=25&status=active');expect(stillAllowed.status()).toBe(200);
   const forbiddenPublish=await targetSession.page.request.post('/api/admin/website/seo',{data:{scope:'home',action:'publish'}});expect(forbiddenPublish.status()).toBe(403);const forbiddenBody=await forbiddenPublish.json();expect(String(forbiddenBody.error||'')).toContain('publishing capability');
   await closeContext(targetContext);targetContext=null;
   const update=await page.request.patch('/api/admin/access',{data:{user_id:target.id,action:'update_capabilities',mode:'custom',capabilities:['website.content.edit','website.content.publish']}});expect(update.status()).toBe(200);const updated=(await update.json()).user as Account;expect(updated.capabilities.sort()).toEqual(['website.content.edit','website.content.publish'].sort());expect(await auditCount(page,'admin.capabilities.updated')).toBeGreaterThan(0);
   const selfRevoke=await page.request.patch('/api/admin/access',{data:{user_id:currentUserId,action:'revoke'}});expect(selfRevoke.status()).toBe(409);
   const selfLockout=await page.request.patch('/api/admin/access',{data:{user_id:currentUserId,action:'update_capabilities',mode:'custom',capabilities:['website.content.edit']}});expect(selfLockout.status()).toBe(409);const selfLockoutBody=await selfLockout.json();expect(String(selfLockoutBody.error||'')).toContain('own Admin access management capability');
  }finally{
   await closeContext(targetContext);await revokeIfAdmin(page,member.email);expect(await auditCount(page,'admin.access.revoked')).toBeGreaterThan(0)
  }
 });

 test('Admin Access workspace is searchable, paginated and responsive',async({page})=>{
  await signIn(page,adminCredentials(),'/admin/access');
  for(const width of [390,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto('/admin/access',{waitUntil:'networkidle'});
   await expect(page.getByRole('heading',{level:1,name:'Admin access'})).toBeVisible();await expect(page.getByLabel('Search accounts')).toBeVisible();await expect(page.getByLabel('Member identity')).toBeVisible();await expect(page.getByRole('combobox',{name:'Access',exact:true})).toBeVisible();await expect(page.getByLabel('Sort')).toBeVisible();const rows=page.getByRole('combobox',{name:'Rows',exact:true});await expect(rows).toBeVisible();const options=rows.locator('option');await expect(options).toHaveCount(3);await expect(options.nth(0)).toHaveAttribute('value','25');await expect(options.nth(1)).toHaveAttribute('value','50');await expect(options.nth(2)).toHaveAttribute('value','100');await expect(page.getByText('Lockout protection')).toBeVisible();await noOverflow(page,`Admin Access overflowed at ${width}px`);
  }
 });
});
