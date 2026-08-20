import {expect,test,type Browser,type BrowserContext,type Page} from '@playwright/test';

type Credentials={email:string;password:string};
type Account={id:string;email:string;is_admin:boolean;access_mode:string;capabilities:string[]};
type AccessResponse={users:Account[];current_user_id:string;total:number};
function adminCredentials():Credentials{const email=process.env.E2E_ADMIN_EMAIL?.trim();const password=process.env.E2E_ADMIN_PASSWORD;if(!email||!password)throw new Error('Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD.');return{email,password}}
function memberCredentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E_MEMBER_EMAIL or E2E_MEMBER_PASSWORD.');return{email,password}}
async function signIn(page:Page,account:Credentials,next='/admin'){await page.goto(`/signin?next=${encodeURIComponent(next)}`,{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/signin'),{timeout:20_000})}
async function findAccount(page:Page,email:string){const response=await page.request.get(`/api/admin/access?q=${encodeURIComponent(email)}&access=all&page=1&page_size=25`);expect(response.status()).toBe(200);const body=await response.json() as AccessResponse;return body.users.find(user=>user.email.toLowerCase()===email.toLowerCase())||null}
async function signInFresh(browser:Browser,account:Credentials,next:string){const context=await browser.newContext();const page=await context.newPage();await signIn(page,account,next);return{context,page}}
async function close(context:BrowserContext|null){if(context)await context.close()}

test.describe('Custom Admin route firewall',()=>{
 test('narrow Website Admin can use mapped Website routes but not unrelated legacy Admin routes',async({page,browser})=>{
  const admin=adminCredentials();const member=memberCredentials();await signIn(page,admin,'/admin/access');const target=await findAccount(page,member.email);expect(target,'E2E member account must exist').not.toBeNull();let memberContext:BrowserContext|null=null;
  try{
   if(target!.is_admin){const revoke=await page.request.patch('/api/admin/access',{data:{user_id:target!.id,action:'revoke'}});expect(revoke.status()).toBe(200)}
   const grant=await page.request.patch('/api/admin/access',{data:{user_id:target!.id,action:'grant',mode:'custom',capabilities:['website.content.edit']}});expect(grant.status()).toBe(200);

   const session=await signInFresh(browser,member,'/admin/website/media');memberContext=session.context;
   expect(new URL(session.page.url()).pathname).toBe('/admin/website/media');
   const media=await session.page.request.get('/api/admin/website/media?page=1&page_size=25&status=active');expect(media.status()).toBe(200);
   const unrelatedApi=await session.page.request.get('/api/admin/intake');expect(unrelatedApi.status()).toBe(403);expect(String((await unrelatedApi.json()).error||'')).toContain('capability');

   await session.page.goto('/admin/intake',{waitUntil:'networkidle'});const redirected=new URL(session.page.url());expect(redirected.pathname).toBe('/admin');expect(redirected.searchParams.get('reason')).toBe('capability');
   const stillAllowed=await session.page.request.get('/api/admin/website/media?page=1&page_size=25&status=active');expect(stillAllowed.status()).toBe(200);
  }finally{
   await close(memberContext);const latest=await findAccount(page,member.email);if(latest?.is_admin){const revoke=await page.request.patch('/api/admin/access',{data:{user_id:latest.id,action:'revoke'}});expect(revoke.status()).toBe(200)}
  }
 });
});
