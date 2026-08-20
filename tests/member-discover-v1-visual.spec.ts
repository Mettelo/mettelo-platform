import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const widths=[375,390,414,768,1024,1440] as const;
const projectId='00000000-0000-4000-8000-00000000d151';
const roleId='00000000-0000-4000-8000-00000000d152';
const title='E2E Member Discover Project';
const artifactDir='artifacts/member-discover-v1';
let memberId='';

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
function localDb(){const url=process.env.E2E_SUPABASE_URL?.trim();const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated E2E Supabase credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Member Discover fixture refuses non-local Supabase hosts.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Fdiscover',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/discover',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client)}
async function columns(page:Page,selector:string){return page.locator(selector).first().evaluate(element=>getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length)}
async function resetMemberState(){
  const db=localDb();
  for(const query of [
    db.from('project_applications').delete().eq('project_id',projectId).eq('user_id',memberId),
    db.from('project_members').delete().eq('project_id',projectId).eq('user_id',memberId),
    db.from('saved_projects').delete().eq('project_id',projectId).eq('user_id',memberId)
  ]){const {error}=await query;if(error)throw error;}
}

test.beforeAll(async()=>{
  const db=localDb();const account=credentials();const {data:list,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError;const user=list.users.find(item=>item.email?.toLowerCase()===account.email.toLowerCase());if(!user)throw new Error('E2E member identity not found.');memberId=user.id;
  const {error:profileError}=await db.from('profiles').update({profile_readiness:100}).eq('id',memberId);if(profileError)throw profileError;
  const {error:projectError}=await db.from('projects').upsert({id:projectId,slug:'e2e-member-discover-project',title,summary:'Use a deterministic member-only project to verify Discover, project detail and the internal application journey.',problem_statement:'Validate that signed-in members never need to leave My Mettelo to decide whether and how to apply.',status:'recruiting',visibility:'public',project_type:'open',applications_open:true,location:'Remote',location_type:'remote',duration_weeks:6,weekly_commitment:'5–8 hrs/week',application_deadline:'2099-08-24T23:59:59.000Z'},{onConflict:'id'});if(projectError)throw projectError;
  const {error:roleError}=await db.from('project_roles').upsert({id:roleId,project_id:projectId,title:'Data Analyst',description:'Analyse the project dataset and translate validated patterns into decision-ready findings.',skills:['Data Analysis','Visualisation'],openings:2},{onConflict:'id'});if(roleError)throw roleError;
});

test.beforeEach(async()=>{await resetMemberState()});

test('Discover and member project detail preserve the approved responsive internal journey',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await mkdir(artifactDir,{recursive:true});await signIn(page);
  for(const width of widths){
    await page.setViewportSize({width,height:900});await page.goto('/member/discover',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{level:1,name:'Discover projects'})).toBeVisible();await expect(page.getByText('EXPLORE · PROJECTS',{exact:true})).toBeVisible();await expect(page.getByPlaceholder('Search projects, skills or topics')).toBeVisible();
    const card=page.locator('.mdProjectCard').filter({hasText:title});await expect(card).toBeVisible();await expect(card.getByText('Data Analyst',{exact:true})).toBeVisible();await expect(card.getByText('Data Analysis',{exact:true})).toBeVisible();const view=card.getByRole('link',{name:'View project'});await expect(view).toHaveAttribute('href',`/member/discover/${projectId}`);expect(await columns(page,'.mdProjectGrid'),`${width}px Discover grid`).toBe(width>=1025?2:1);
    if(width<=480){const mobile=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await expect(mobile).toBeVisible();await expect(mobile.locator('a[href="/member/discover"]')).toHaveAttribute('aria-current','page');await expect(page.locator('.mdDesktopFilters')).toBeHidden();const filterButton=page.getByRole('button',{name:/Filters ·/});await expect(filterButton).toBeVisible();if(width===390){await filterButton.click();const filterDialog=page.getByRole('dialog',{name:'Filter projects'});await expect(filterDialog).toBeVisible();await expect(page.getByRole('button',{name:'Close'})).toBeFocused();await page.keyboard.press('Escape');await expect(filterDialog).toBeHidden()}}else{await expect(page.getByRole('complementary',{name:'My Mettelo navigation'})).toBeVisible();await expect(page.locator('.mdDesktopFilters')).toBeVisible()}
    await noOverflow(page,`${width}px Discover`);await page.screenshot({path:`${artifactDir}/${width}-discover.png`,fullPage:true,animations:'disabled'});
    await page.goto(`/member/discover/${projectId}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:title})).toBeVisible();await expect(page.getByText('MEMBER PROJECT DETAIL',{exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Project breadcrumb'})).toContainText(`My Mettelo/Discover/${title}`);await expect(page.getByText('Data Analyst',{exact:true}).first()).toBeVisible();await expect(page.getByRole('link',{name:'Apply to this project'})).toHaveAttribute('href',new RegExp(`/member/discover/${projectId}/apply`));await expect(page.getByRole('link',{name:'View public project page ↗'})).toHaveAttribute('href',`/projects/${projectId}`);expect(await columns(page,'.mpdLayout'),`${width}px detail layout`).toBe(width>=1025?2:1);await noOverflow(page,`${width}px detail`);
  }
});

test('public Apply preserves project intent and converges into the internal member flow',async({page})=>{
  test.setTimeout(120_000);await page.goto(`/projects/${projectId}#apply`,{waitUntil:'networkidle'});const signInLink=page.getByRole('link',{name:/Sign in to apply/});await expect(signInLink).toBeVisible();await signInLink.click();await page.waitForURL(url=>url.pathname==='/signin'&&url.searchParams.get('next')===`/member/discover/${projectId}/apply`,{timeout:20_000});const account=credentials();const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname===`/member/discover/${projectId}/apply`,{timeout:20_000});await expect(page.getByRole('heading',{level:1,name:`Apply to ${title}`})).toBeVisible();
});

test('internal application keeps responses between steps and Save does not create an application',async({page})=>{
  test.setTimeout(180_000);await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto(`/member/discover/${projectId}`,{waitUntil:'networkidle'});
  const save=page.getByRole('button',{name:/Save project|Saved/});await expect(save).toBeVisible();await save.click();await expect(save).toHaveText(/Saved/);await page.goto('/member/saved',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:title})).toBeVisible();
  await page.goto(`/member/discover/${projectId}/apply?role=${roleId}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:`Apply to ${title}`})).toBeVisible();for(const label of ['Role & fit','Availability','Your response','Review'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Continue →'}).click();const availability=page.getByPlaceholder('Share anything the project team should know about your timing or availability.');await availability.fill('Available evenings and Saturday mornings.');await page.getByRole('button',{name:'Continue →'}).click();const response=page.getByPlaceholder('Describe the part of this project you could own, support or deliver.');await response.fill('I can own the analysis workflow, validate patterns, document assumptions and turn findings into a clear decision-ready summary.');await page.getByRole('button',{name:'Continue →'}).click();await expect(page.getByText('Available evenings and Saturday mornings.')).toBeVisible();await expect(page.getByText(/I can own the analysis workflow/)).toBeVisible();await page.getByRole('button',{name:'← Back'}).click();await expect(response).toHaveValue(/I can own the analysis workflow/);await noOverflow(page,'390px application');
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'Your response'})).toBeVisible();await noOverflow(page,'390px application at 200% text zoom');
});
