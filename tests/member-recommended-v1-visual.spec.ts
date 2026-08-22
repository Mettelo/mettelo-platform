import {createClient} from '@supabase/supabase-js';
import {expect,test,type Locator,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const widths=[375,390,414,768,1024,1440] as const;
const artifactDir='artifacts/member-recommended-v1';
const projectIds=['00000000-0000-4000-8000-00000000e201','00000000-0000-4000-8000-00000000e202','00000000-0000-4000-8000-00000000e203','00000000-0000-4000-8000-00000000e204'] as const;
const roleIds=['00000000-0000-4000-8000-00000000e211','00000000-0000-4000-8000-00000000e212','00000000-0000-4000-8000-00000000e213','00000000-0000-4000-8000-00000000e214'] as const;
const eventIds=['00000000-0000-4000-8000-00000000e221','00000000-0000-4000-8000-00000000e222'] as const;
const spotlightId='00000000-0000-4000-8000-00000000e231';
const projectTitles=['A Data Analysis Mobility Challenge','B Data Analysis Service Review','C Data Analysis Evidence Project','D Long Data Analysis Project Title That Must Wrap Safely Across Narrow Member Recommendation Cards Without Horizontal Overflow'];

type Credentials={email:string;password:string};
function credentials():Credentials{const email=process.env.E2E_MEMBER_EMAIL?.trim();const password=process.env.E2E_MEMBER_PASSWORD;if(!email||!password)throw new Error('Missing E2E member credentials.');return{email,password}}
function localDb(){const url=process.env.E2E_SUPABASE_URL?.trim();const key=process.env.E2E_SUPABASE_SERVICE_ROLE_KEY?.trim();if(!url||!key)throw new Error('Missing isolated E2E Supabase credentials.');if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw new Error('Recommended fixture refuses non-local Supabase hosts.');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
async function signIn(page:Page){const account=credentials();await page.goto('/signin?next=%2Fmember%2Frecommended',{waitUntil:'networkidle'});const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname==='/member/recommended',{timeout:20_000})}
async function noOverflow(page:Page,label:string){const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,body:document.body.scrollWidth}));expect(size.scroll,`${label}: document overflow`).toBeLessThanOrEqual(size.client);expect(size.body,`${label}: body overflow`).toBeLessThanOrEqual(size.client)}
async function topAligned(cards:Locator){const first=await cards.nth(0).boundingBox();const second=await cards.nth(1).boundingBox();if(!first||!second)throw new Error('Recommendation cards were not measurable.');return Math.abs(first.y-second.y)<3}

let memberId='';
test.beforeAll(async()=>{
  const db=localDb();const account=credentials();const {data:list,error:listError}=await db.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError;const user=list.users.find(item=>item.email?.toLowerCase()===account.email.toLowerCase());if(!user)throw new Error('E2E member identity not found.');memberId=user.id;
  const {error:profileError}=await db.from('profiles').update({profile_readiness:100,skills:['Data Analysis','Research'],preferred_roles:[]}).eq('id',memberId);if(profileError)throw profileError;
  for(let index=0;index<projectIds.length;index++){
    const {error:projectError}=await db.from('projects').upsert({id:projectIds[index],slug:`e2e-recommended-project-${index+1}`,title:projectTitles[index],summary:'A deterministic member project using Data Analysis to test truthful relevance, internal routing and responsive recommendation cards.',status:'recruiting',visibility:'public',project_type:'open',applications_open:true,location:'Remote',location_type:'remote',duration_weeks:6,weekly_commitment:'4–6 hours/week',application_deadline:'2099-08-24T23:59:59.000Z'},{onConflict:'id'});if(projectError)throw projectError;
    const {error:roleError}=await db.from('project_roles').upsert({id:roleIds[index],project_id:projectIds[index],title:'Data Analyst',description:'Use Data Analysis to turn evidence into a practical recommendation.',skills:['Data Analysis'],openings:2},{onConflict:'id'});if(roleError)throw roleError;
  }
  await db.from('project_applications').delete().in('project_id',[...projectIds]).eq('user_id',memberId);await db.from('project_members').delete().in('project_id',[...projectIds]).eq('user_id',memberId);await db.from('saved_projects').delete().in('project_id',[...projectIds]).eq('user_id',memberId);
  const eventRows=[
    {id:eventIds[0],slug:'e2e-data-analysis-roundtable',title:'Data Analysis Member Roundtable',event_type:'workshop',summary:'A practical Data Analysis discussion for members working on real project evidence.',description:'Data Analysis methods and decision-ready communication.',starts_at:'2026-09-01T17:30:00.000Z',ends_at:'2026-09-01T18:30:00.000Z',timezone:'Europe/London',delivery_mode:'online',location_label:'Online',registration_required:false,status:'published',published_at:'2026-08-19T12:00:00.000Z',speaker_names:[]},
    {id:eventIds[1],slug:'e2e-data-analysis-lab',title:'Data Analysis Practice Lab',event_type:'workshop',summary:'A future Data Analysis practice session for members.',description:'Work through a realistic Data Analysis example.',starts_at:'2099-09-01T17:30:00.000Z',ends_at:'2099-09-01T18:30:00.000Z',timezone:'Europe/London',delivery_mode:'online',location_label:'Online',registration_required:false,status:'published',published_at:'2026-08-19T12:00:00.000Z',speaker_names:[]}
  ];
  const {error:eventError}=await db.from('events').upsert(eventRows,{onConflict:'id'});if(eventError)throw eventError;
  const {error:spotlightError}=await db.from('spotlights').upsert({id:spotlightId,user_id:memberId,title:'How Data Analysis became a practical project decision',category:'project_story',summary:'A published member story about turning Data Analysis evidence into action.',status:'published',published_at:'2026-08-19T12:00:00.000Z',is_excluded:false,consent_status:'granted'},{onConflict:'id'});if(spotlightError)throw spotlightError;
});

test('Recommended matches the approved simple responsive relevance hierarchy',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await mkdir(artifactDir,{recursive:true});await signIn(page);
  for(const width of widths){
    await page.setViewportSize({width,height:900});await page.goto('/member/recommended',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{level:1,name:'Recommended for you'})).toBeVisible();await expect(page.getByText('PERSONALISED · RELEVANCE',{exact:true})).toBeVisible();const context=page.getByRole('region',{name:'Recommendation context'});await expect(context).toBeVisible();await expect(context.locator('strong')).toHaveText(/matching profile is ready|matching requirement/i);await expect(context.getByRole('link',{name:'Update profile'})).toHaveAttribute('href','/member/profile');await expect(page.getByRole('link',{name:'Browse Discover'})).toHaveAttribute('href','/member/discover');
    const top=page.getByRole('region',{name:'Most relevant right now'});await expect(top).toBeVisible();await expect(top.getByText('Why this is recommended',{exact:true}).first()).toBeVisible();const topCards=top.locator('article');await expect(topCards).toHaveCount(3);expect(await topAligned(topCards),`${width}px Top Picks alignment`).toBe(width>=1025);
    const projects=page.getByRole('region',{name:'Projects for you'});await expect(projects).toBeVisible();const projectCards=projects.locator('article');const remainingProjectCount=await projectCards.count();expect(remainingProjectCount,`${width}px remaining project cards`).toBeGreaterThanOrEqual(1);expect(remainingProjectCount,`${width}px remaining project cards`).toBeLessThanOrEqual(projectIds.length);if(remainingProjectCount>1)expect(await topAligned(projectCards),`${width}px project card alignment`).toBe(width>=1025);
    await expect(projects.getByRole('button',{name:/Save project|Saved/}).first()).toBeVisible();for(const projectId of projectIds){const projectLink=page.locator(`a[href="/member/discover/${projectId}"]`);await expect(projectLink).toHaveCount(1);await expect(projectLink).toHaveAccessibleName('View project')}
    const eventLink=page.locator('a[href="/events/e2e-data-analysis-lab"]');await expect(eventLink).toHaveCount(1);await expect(eventLink).toBeVisible();await expect(eventLink).toHaveAccessibleName('View event');
    const spotlightLink=page.locator(`a[href="/spotlight/${spotlightId}"]`);await expect(spotlightLink).toHaveCount(1);await expect(spotlightLink).toBeVisible();await expect(spotlightLink).toHaveAccessibleName('View Spotlight');
    await expect(page.getByText(/match points|% match|likely to be selected/i)).toHaveCount(0);await expect(page.getByText(/job application|recruiter action|salary\/offer/i)).toHaveCount(0);
    if(width<=480){const mobile=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await expect(mobile).toBeVisible();await expect(mobile.locator('summary')).toHaveAttribute('aria-current','page')}else{const rail=page.getByRole('complementary',{name:'My Mettelo navigation'});await expect(rail.getByRole('link',{name:/Recommended/})).toHaveAttribute('aria-current','page')}
    await noOverflow(page,`${width}px Recommended`);await page.screenshot({path:`${artifactDir}/${width}-recommended.png`,fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});await page.goto('/member/recommended',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'Recommended for you'})).toBeVisible();await noOverflow(page,'390px Recommended at 200% text zoom');
});

test('Recommended Save is independent of application lifecycle',async({page})=>{
  test.setTimeout(120_000);await signIn(page);await page.goto('/member/recommended',{waitUntil:'networkidle'});const card=page.getByRole('region',{name:'Projects for you'}).locator('article').filter({hasText:projectTitles[2]});const save=card.locator('button.mdSaveButton');await expect(save).toBeVisible();const saveResponse=page.waitForResponse(response=>response.url().endsWith('/api/projects/saved')&&response.request().method()==='POST');await save.click();const response=await saveResponse;expect(response.status()).toBe(200);await expect(save).toHaveAttribute('aria-pressed','true');await expect(save).toContainText('Saved');
  const db=localDb();const [{count:applicationCount,error:applicationError},{count:savedCount,error:savedError}]=await Promise.all([db.from('project_applications').select('id',{count:'exact',head:true}).eq('project_id',projectIds[2]).eq('user_id',memberId),db.from('saved_projects').select('project_id',{count:'exact',head:true}).eq('project_id',projectIds[2]).eq('user_id',memberId)]);if(applicationError)throw applicationError;if(savedError)throw savedError;expect(applicationCount||0).toBe(0);expect(savedCount||0).toBe(1);
});
