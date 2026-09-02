import {createClient} from '@supabase/supabase-js';
import {expect,test,type Page} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const widths=[320,375,390,414,768,1024,1440] as const;
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
  const {error:profileError}=await db.from('profiles').update({full_name:'E2E Member',headline:'Data analyst',professional_area:'Data Analysis / BI',location:'London, UK',experience_level:'mid',skills:['SQL','Data Analysis','Visualisation'],preferred_roles:['Data Analyst / BI'],project_availability:'available_now',weekly_capacity:'4–6 hours/week'}).eq('id',memberId);if(profileError)throw profileError;
  const [{data:domain,error:domainError},{data:roleFamily,error:roleFamilyError},{data:capabilities,error:capabilityError},{data:tool,error:toolError},{data:method,error:methodError}]=await Promise.all([
    db.from('domains').select('id').eq('slug','cross-industry-open-data').eq('is_active',true).single(),
    db.from('project_role_catalogue').select('id').eq('slug','data-analyst').eq('active',true).single(),
    db.from('capabilities').select('id,slug').in('slug',['data-analysis','data-quality','stakeholder-communication']).eq('is_active',true),
    db.from('tools').select('id').eq('slug','python').eq('is_active',true).single(),
    db.from('methods').select('id').eq('slug','data-quality').eq('is_active',true).single()
  ]);
  if(domainError)throw domainError;if(roleFamilyError)throw roleFamilyError;if(capabilityError)throw capabilityError;if(toolError)throw toolError;if(methodError)throw methodError;if(!domain||!roleFamily||!tool||!method||(capabilities||[]).length!==3)throw new Error('E2E Member Discover requires the Phase 1 canonical catalogue taxonomy.');
  const {error:clearDomainError}=await db.from('profile_domain_preferences').delete().eq('user_id',memberId);if(clearDomainError)throw clearDomainError;
  const {error:domainPrefError}=await db.from('profile_domain_preferences').insert({user_id:memberId,domain_id:domain.id});if(domainPrefError)throw domainPrefError;
  const {error:projectError}=await db.from('projects').upsert({id:projectId,slug:'e2e-member-discover-project',title,summary:'Use a deterministic member-only project to verify Discover, project detail and the internal application journey.',problem_statement:'Validate that signed-in members never need to leave My Mettelo to decide whether and how to apply.',status:'draft',visibility:'private',project_type:'open',applications_open:false,location:'Remote',location_type:'remote',catalogue_working_model_source:'explicit',duration_weeks:6,weekly_commitment:'5–8 hrs/week',application_deadline:null,team_size_threshold:2},{onConflict:'id'});if(projectError)throw projectError;
  const {error:roleError}=await db.from('project_roles').upsert({id:roleId,project_id:projectId,title:'Data Analyst',description:'Analyse the project dataset and translate validated patterns into decision-ready findings.',skills:['Data Analysis','Visualisation'],openings:2},{onConflict:'id'});if(roleError)throw roleError;
  for(const operation of [
    db.from('project_role_families').upsert({project_id:projectId,role_catalogue_id:roleFamily.id,source:'e2e_member_discover'},{onConflict:'project_id,role_catalogue_id'}),
    db.from('project_capabilities').upsert((capabilities||[]).map(item=>({project_id:projectId,capability_id:item.id,importance:'core',evidence_expected:true})),{onConflict:'project_id,capability_id'}),
    db.from('project_domains').upsert({project_id:projectId,domain_id:domain.id,is_primary:true},{onConflict:'project_id,domain_id'}),
    db.from('project_tools').upsert({project_id:projectId,tool_id:tool.id},{onConflict:'project_id,tool_id'}),
    db.from('project_methods').upsert({project_id:projectId,method_id:method.id},{onConflict:'project_id,method_id'})
  ]){const {error}=await operation;if(error)throw error;}
  const {data:readiness,error:readinessError}=await db.from('project_catalogue_readiness').select('catalogue_ready,missing_requirements').eq('project_id',projectId).single();if(readinessError)throw readinessError;if(!readiness.catalogue_ready)throw new Error(`Member Discover fixture is catalogue-incomplete: ${(readiness.missing_requirements||[]).join(', ')}`);
  const {error:intakeError}=await db.from('projects').update({status:'recruiting',visibility:'public',applications_open:true}).eq('id',projectId);if(intakeError)throw intakeError;
});

test.beforeEach(async()=>{await resetMemberState()});

test('Discover and member project detail preserve the approved responsive internal journey',async({page})=>{
  test.setTimeout(300_000);await page.emulateMedia({reducedMotion:'reduce'});await mkdir(artifactDir,{recursive:true});await signIn(page);
  for(const width of widths){
    await page.setViewportSize({width,height:900});await page.goto('/member/discover',{waitUntil:'networkidle'});
    await expect(page.getByRole('heading',{level:1,name:'Discover projects'})).toBeVisible();await expect(page.getByText('DIRECTION & DISCOVERY · PROJECTS',{exact:true})).toBeVisible();await expect(page.getByPlaceholder('Search projects, skills or topics')).toBeVisible();
    const filterButton=page.getByRole('button',{name:/Filters ·/});await expect(filterButton).toBeVisible();await expect(page.locator('.mdFilterSummaryV2')).toBeVisible();
    const card=page.locator('.mdProjectCard').filter({hasText:title});await expect(card).toBeVisible();await expect(card.getByText('Data Analyst',{exact:true})).toBeVisible();await expect(card.getByText('Data Analysis',{exact:true})).toBeVisible();const view=card.getByRole('link',{name:'View project'});await expect(view).toHaveAttribute('href',`/member/discover/${projectId}`);expect(await columns(page,'.mdProjectGrid'),`${width}px Discover grid`).toBe(width>980?2:1);
    if(width<=480){const mobile=page.getByRole('navigation',{name:'My Mettelo mobile navigation'});await expect(mobile).toBeVisible();await expect(mobile.locator('a[href="/member/discover"]')).toHaveAttribute('aria-current','page');if(width===390){await filterButton.click();const filterDialog=page.getByRole('dialog',{name:'Filter projects'});await expect(filterDialog).toBeVisible();await expect(page.getByRole('button',{name:'Close project filters'})).toBeFocused();await page.keyboard.press('Escape');await expect(filterDialog).toBeHidden();await expect(filterButton).toBeFocused()}}else{await expect(page.getByRole('complementary',{name:'My Mettelo navigation'})).toBeVisible()}
    await noOverflow(page,`${width}px Discover`);await page.screenshot({path:`${artifactDir}/${width}-discover.png`,fullPage:true,animations:'disabled'});
    await page.goto(`/member/discover/${projectId}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:title})).toBeVisible();await expect(page.getByText('MEMBER PROJECT DETAIL',{exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Project breadcrumb'})).toContainText(`My Mettelo/Discover/${title}`);await expect(page.getByText('Data Analyst',{exact:true}).first()).toBeVisible();await expect(page.getByRole('link',{name:'Apply for a role'})).toHaveAttribute('href','#roles');await expect(page.getByRole('link',{name:'Apply as Data Analyst'})).toHaveAttribute('href',`/member/discover/${projectId}/apply?role=${roleId}`);expect(await columns(page,'.pdv2Layout'),`${width}px detail layout`).toBe(width>=1025?2:1);await noOverflow(page,`${width}px detail`);
  }
});

test('Discover Filters V2 exposes governed facets and keyboard capability selection',async({page})=>{
  test.setTimeout(120_000);await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto('/member/discover',{waitUntil:'networkidle'});
  const trigger=page.locator('button.mdFilterTriggerV2');await expect(trigger).toBeVisible();await expect(trigger).toHaveAccessibleName('Filters · 0');await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Filter projects'});await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Role')).toContainText('Data Analyst');
  await expect(dialog.getByLabel('Domain')).toContainText('Cross-industry / Open Data');
  await expect(dialog.getByLabel('Tool / technology')).toContainText('Python');
  await expect(dialog.getByLabel('Commitment')).toContainText('5–8 hours');
  await expect(dialog.getByLabel('Working model')).toContainText('Remote');
  await expect(dialog.getByLabel('Project type')).toContainText('Open Project');
  await expect(dialog.getByLabel('Project stage')).toContainText('Recruiting');
  const sort=dialog.getByLabel('Sort projects');for(const label of ['Recently added','Closing soon','Shortest duration','Longest duration'])await expect(sort).toContainText(label);

  const capability=dialog.getByRole('combobox',{name:'Skill / capability'});await capability.fill('data anal');await expect(capability).toHaveAttribute('aria-expanded','true');await expect(dialog.getByRole('option',{name:'Data Analysis'})).toBeVisible();await capability.press('Enter');await expect(capability).toHaveValue('Data Analysis');
  await dialog.getByRole('button',{name:/Show \d+ projects?/}).click();await expect(trigger).toHaveAccessibleName('Filters · 1');
  const chip=page.getByRole('button',{name:'Remove Skill: Data Analysis filter'});await expect(chip).toBeVisible();await chip.click();await expect(trigger).toHaveAccessibleName('Filters · 0');

  await trigger.click();await capability.fill('data');await capability.press('Escape');await expect(capability).toHaveAttribute('aria-expanded','false');await expect(dialog).toBeVisible();await capability.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await noOverflow(page,'390px Discover Filters V2 at 200% text zoom');
});

test('Discover pagination shows 9 projects per page and refinements reset to page 1',async({page})=>{
  test.setTimeout(120_000);await signIn(page);await page.setViewportSize({width:1024,height:900});await page.goto('/member/discover',{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    const grid=document.querySelector<HTMLElement>('.mdProjectGrid');if(!grid)throw new Error('Discover project grid missing');const template=grid.querySelector<HTMLElement>('.mdProjectCard');if(!template)throw new Error('Discover project card missing');
    const required=Math.max(0,12-grid.querySelectorAll('.mdProjectCard').length);for(let index=0;index<required;index++){const clone=template.cloneNode(true) as HTMLElement;const heading=clone.querySelector('h2');if(heading)heading.textContent=`Synthetic pagination project ${index+1}`;grid.appendChild(clone)}
  });
  const pagination=page.getByRole('navigation',{name:'Discover project pages'});await expect(pagination).toBeVisible();await expect(pagination).toContainText('Showing 1–9 of 12');await expect(page.locator('.mdProjectCard:visible')).toHaveCount(9);
  await pagination.getByRole('button',{name:'Next page'}).click();await expect(pagination).toContainText('Page 2 of 2');await expect(page.locator('.mdProjectCard:visible')).toHaveCount(3);
  await page.getByPlaceholder('Search projects, skills or topics').fill(title);await expect(page.locator('.mdProjectCard').filter({hasText:title})).toBeVisible();await expect(page.getByRole('navigation',{name:'Discover project pages'})).toHaveCount(0);
});

test('member Discover links stay internal while signed-in public Projects routes remain public',async({page})=>{
  test.setTimeout(120_000);await signIn(page);
  await page.goto('/member/applications',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:'Applications'})).toBeVisible();
  const internalDiscover=page.locator('a[href="/member/discover"]').filter({hasText:'Discover projects'}).first();await expect(internalDiscover).toBeVisible();await internalDiscover.click();await page.waitForURL(url=>url.pathname==='/member/discover',{timeout:20_000});await expect(page.getByRole('heading',{level:1,name:'Discover projects'})).toBeVisible();
  await page.goto('/member/applications',{waitUntil:'networkidle'});const publicCatalogue=page.locator('a[href="/projects"]').filter({hasText:'Discover projects'}).first();await expect(publicCatalogue).toBeVisible();await publicCatalogue.click();await page.waitForURL(url=>url.pathname==='/projects',{timeout:20_000});
  await page.goto('/projects',{waitUntil:'networkidle'});expect(new URL(page.url()).pathname).toBe('/projects');
  await page.goto(`/projects/${projectId}`,{waitUntil:'networkidle'});expect(new URL(page.url()).pathname).toBe(`/projects/${projectId}`);await expect(page.getByRole('heading',{level:1,name:title})).toBeVisible();
});

test('signed-out project catalogue and detail remain public, then Apply preserves intent into the member flow',async({page})=>{
  test.setTimeout(120_000);await page.goto('/projects',{waitUntil:'networkidle'});expect(new URL(page.url()).pathname).toBe('/projects');
  await page.goto(`/projects/${projectId}#apply`,{waitUntil:'networkidle'});expect(new URL(page.url()).pathname).toBe(`/projects/${projectId}`);const signInLink=page.getByRole('link',{name:'Apply for a role'}).first();await expect(signInLink).toBeVisible();await signInLink.click();await page.waitForURL(url=>url.pathname==='/signin'&&url.searchParams.get('next')===`/member/discover/${projectId}`,{timeout:20_000});const account=credentials();const main=page.locator('#main-content');await main.locator('input[type="email"]').fill(account.email);await main.locator('input[type="password"]').fill(account.password);await main.getByRole('button',{name:'Sign in →'}).click();await page.waitForURL(url=>url.pathname===`/member/discover/${projectId}`,{timeout:20_000});await expect(page.getByText('MEMBER PROJECT DETAIL',{exact:true})).toBeVisible();const applyAs=page.getByRole('link',{name:'Apply as Data Analyst'});await expect(applyAs).toBeVisible();await applyAs.click();await page.waitForURL(url=>url.pathname===`/member/discover/${projectId}/apply`&&url.searchParams.get('role')===roleId,{timeout:20_000});await expect(page.getByRole('heading',{level:1,name:`Apply to ${title}`})).toBeVisible();
});

test('internal application keeps responses between steps and Save does not create an application',async({page})=>{
  test.setTimeout(180_000);await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto(`/member/discover/${projectId}`,{waitUntil:'networkidle'});
  const save=page.getByRole('button',{name:/Save project|Saved/});await expect(save).toBeVisible();await save.click();await expect(save).toHaveText(/Saved/);await page.goto('/member/saved',{waitUntil:'networkidle'});await expect(page.getByRole('heading',{name:title})).toBeVisible();
  await page.goto(`/member/discover/${projectId}/apply?role=${roleId}`,{waitUntil:'networkidle'});await expect(page.getByRole('heading',{level:1,name:`Apply to ${title}`})).toBeVisible();for(const label of ['Role & fit','Availability','How you could contribute','Review'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Continue →'}).click();const availability=page.getByPlaceholder('Share anything the project team should know about your timing or availability.');await availability.fill('Available evenings and Saturday mornings.');await page.getByRole('button',{name:'Continue →'}).click();const response=page.getByPlaceholder('Describe the work you could take ownership of, support or help deliver.');await response.fill('I can own the analysis workflow, validate patterns, document assumptions and turn findings into a clear decision-ready summary.');await page.getByRole('button',{name:'Continue →'}).click();await expect(page.getByText('Available evenings and Saturday mornings.')).toBeVisible();await expect(page.getByText(/I can own the analysis workflow/)).toBeVisible();await page.getByRole('button',{name:'← Back'}).click();await expect(response).toHaveValue(/I can own the analysis workflow/);await noOverflow(page,'390px application');
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});await expect(page.getByRole('heading',{name:'How you could contribute'})).toBeVisible();await noOverflow(page,'390px application at 200% text zoom');
});

test('profile editing remains available below readiness and saving the final requirement immediately unlocks application',async({page})=>{
  test.setTimeout(180_000);const db=localDb();const {error}=await db.from('profiles').update({weekly_capacity:null}).eq('id',memberId);if(error)throw error;
  await signIn(page);await page.setViewportSize({width:390,height:844});await page.goto(`/member/discover/${projectId}`,{waitUntil:'networkidle'});
  await expect(page.getByRole('link',{name:/Complete profile/})).toBeVisible();
  await page.goto('/member/profile',{waitUntil:'networkidle'});const edit=page.getByRole('button',{name:'Edit profile →'});if(await edit.count())await edit.click();
  const capacity=page.locator('#profile-capacity');await expect(capacity).toBeVisible();await capacity.selectOption('4–6 hours/week');
  const saveResponse=page.waitForResponse(response=>response.url().endsWith('/api/profile')&&response.request().method()==='PATCH');await page.getByRole('button',{name:'Save profile →'}).click();const response=await saveResponse;expect(response.status()).toBe(200);const payload=await response.json();expect(payload.member_readiness.applicationReadiness.ready).toBe(true);expect(payload.member_readiness.applicationReadiness.missing).toHaveLength(0);
  const persisted=await db.from('profiles').select('weekly_capacity,profile_readiness').eq('id',memberId).single();if(persisted.error)throw persisted.error;expect(persisted.data.weekly_capacity).toBe('4–6 hours/week');expect(typeof persisted.data.profile_readiness).toBe('number');
  await page.goto(`/member/discover/${projectId}`,{waitUntil:'networkidle'});await expect(page.getByRole('link',{name:'Apply for a role'})).toBeVisible();await expect(page.getByRole('link',{name:'Apply as Data Analyst'})).toBeVisible();await noOverflow(page,'390px profile-save-unlock');
});