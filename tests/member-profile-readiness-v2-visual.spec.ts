import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';

const viewports=[
  {name:'phone-320',width:320,height:740},
  {name:'phone-360',width:360,height:800},
  {name:'phone-375',width:375,height:812},
  {name:'phone-390',width:390,height:844},
  {name:'phone-412',width:412,height:915},
  {name:'phone-430',width:430,height:932},
  {name:'tablet-768',width:768,height:1024},
  {name:'tablet-1024',width:1024,height:900},
  {name:'desktop-1280',width:1280,height:900},
  {name:'desktop-1440',width:1440,height:900},
  {name:'desktop-1920',width:1920,height:1080}
] as const;

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
function localDb(){const url=process.env.E2E_SUPABASE_URL?.trim();const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated E2E Supabase credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Profile readiness fixture refuses non-local Supabase hosts.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fprofile',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/profile',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(dimensions.scroll,label).toBeLessThanOrEqual(dimensions.client);expect(dimensions.body,label).toBeLessThanOrEqual(dimensions.client)}

let memberId='';
test.beforeAll(async()=>{const db=localDb();const account=credentials();const {data:list,error}=await db.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const user=list.users.find(item=>item.email?.toLowerCase()===account.email.toLowerCase());if(!user)throw new Error('E2E member identity not found.');memberId=user.id;const {error:updateError}=await db.from('profiles').upsert({id:memberId,full_name:'E2E Member',headline:'Data and AI professional',professional_area:'Data Analysis / BI',location:'London, UK',experience_level:'mid',skills:['SQL','Python','Power BI'],preferred_roles:['Data Analyst / BI'],project_availability:'available_now',weekly_capacity:'4–6 hours/week',bio:'I turn operational data into decision-ready analysis and documented outcomes.',linkedin_url:'https://linkedin.com/in/e2e-member',employment_status:'employed',primary_goal:'Lead an end-to-end analytics project',is_public:false},{onConflict:'id'});if(updateError)throw updateError;});

test('Profile readiness Phase 2 is clear, actionable and responsive',async({page})=>{test.setTimeout(240_000);await page.emulateMedia({reducedMotion:'reduce'});await signIn(page);for(const viewport of viewports){await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/member/profile',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:'E2E Member',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Know what is ready — and what to do next.'})).toBeVisible();for(const label of ['MATCHING','APPLICATIONS','PUBLIC PROFILE','VERIFIED PROOF'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();await expect(page.getByText('BEST NEXT ACTION',{exact:true})).toBeVisible();await expect(page.getByText('AVAILABLE NOW',{exact:true})).toBeVisible();const edit=page.getByRole('button',{name:'Edit profile →'}).first();await expect(edit).toBeVisible();const box=await edit.boundingBox();expect(box?.height||0,`${viewport.name}: Edit profile touch target`).toBeGreaterThanOrEqual(44);await noOverflow(page,`${viewport.name}: profile readiness overflow`);}}
);

test('Profile readiness keeps editing and save controls reachable',async({page})=>{await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto('/member/profile',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Edit profile →'}).first().click();await expect(page.getByText('EDIT PROFILE',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Save profile/i})).toBeVisible();await expect(page.getByRole('button',{name:'Cancel edit'})).toBeVisible();await noOverflow(page,'phone-390 edit profile');});

test('Profile readiness remains usable at 200 percent text sizing',async({page})=>{await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto('/member/profile',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'Know what is ready — and what to do next.'})).toBeVisible();await expect(page.getByRole('button',{name:'Edit profile →'}).first()).toBeVisible();await noOverflow(page,'phone-390 text zoom 200');});