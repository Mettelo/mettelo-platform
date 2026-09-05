import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}
async function expectVisibleNativeLabelledSelect(control:ReturnType<import('@playwright/test').Page['locator']>){await expect(control).toBeVisible();expect(await control.evaluate(element=>Boolean((element as HTMLSelectElement).labels?.length))).toBe(true)}

async function firstRealOption(select:ReturnType<import('@playwright/test').Page['locator']>){return select.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:(node as HTMLOptionElement).value,text:node.textContent||''})).find(item=>item.value&&item.value!=='all')||null)}

test.describe('Public Projects approved discovery filters',()=>{
  test('public catalogue uses the shared governed engine, complete loader and public-only boundary',()=>{
    const page=read('app/projects/page.tsx');const engine=read('lib/project-catalogue-filtering.ts');const loader=read('lib/public-project-catalogue-loader.ts');const controls=read('components/PublicProjectFilters.tsx');
    expect(page).toContain("from '@/lib/project-catalogue-filtering'");expect(page).toContain("from '@/lib/public-project-catalogue-loader'");expect(page).toContain('filterAndSortProjectCatalogue(catalogueItems,filters)');expect(page).toContain('const PUBLIC_PAGE_SIZE=12');expect(page).toContain("query.set('skill',filters.capability)");expect(page).toContain("query.set('working',filters.workingModel)");expect(page).toContain("query.set('sort',filters.sort)");expect(page).toContain('projectParticipationFacet(project.participation_mode,project.team_size_threshold)');expect(page).toContain('participationSummary(p)');expect(page).not.toContain('project_members');expect(page).not.toContain('saved_projects');expect(page).not.toContain('applicationReadiness');
    expect(loader).toContain(".eq('visibility','public')");expect(loader).toContain('const BATCH_SIZE=200');expect(loader).toContain('.range(from,to)');expect(loader).toContain('if(batch.length<BATCH_SIZE)break');expect(loader).toContain('participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold');expect(loader).not.toContain('.limit(500)');expect(engine).toContain('catalogueDurationOptions');expect(engine).toContain("experience:string;");expect(engine).toContain("format:string;");expect(engine).toContain("availability:string;");expect(engine).toContain("{slug:'flexible',label:'Flexible'}");expect(engine).toContain('projectParticipationFacet');expect(controls).toContain("mettelo:catalogue-analytics");expect(controls).toContain('More filters');expect(controls).toContain('Filters · {activeCount}');expect(controls).toContain('Project participation');expect(controls).toContain('Any participation');expect(controls).toContain('AbortController');expect(controls).not.toContain('window.location.assign');
  });

  test('public catalogue preserves canonical to legacy fallback without fixed catalogue ceilings',()=>{
    const loader=read('lib/public-project-catalogue-loader.ts');const publicClient=read('lib/supabase/public.ts');
    expect(loader).toContain('const PROJECT_FIELDS=');expect(loader).toContain('const PRIMARY_SELECT=');expect(loader).toContain('const CORE_SELECT=');expect(loader).toContain('const LEGACY_MINIMAL_SELECT=');expect(loader).toContain('team_size_threshold');expect(loader).toContain('return all(db,LEGACY_MINIMAL_SELECT)');expect(loader).toContain("console.warn('public Projects canonical query failed; retrying legacy public projection'");expect(loader).toContain("console.warn('public Projects enriched query failed; retrying core facets'");expect(publicClient).toContain('new Set([429,500,502,503,504])');expect(publicClient).toContain('const PUBLIC_READ_MAX_ATTEMPTS=3');expect(publicClient).toContain("const retryable=method==='GET'||method==='HEAD'");expect(publicClient).toContain('if(!retryable)return fetch(input,init)');
  });

  test('catalogue readiness and facet visibility preserve governed RLS',()=>{
    const migration=read('supabase/migrations/20260902101500_project_catalogue_filters_v2_phase1.sql');const visibility=read('supabase/migrations/20260902103000_project_catalogue_filters_v2_visibility_rls.sql');const architect=read('app/api/architect-projects/route.ts');const admin=read('app/api/admin/project-governance/route.ts');
    expect(migration).toContain('create or replace view public.project_catalogue_readiness with (security_invoker=true)');expect(migration).toContain('coalesce(c.capability_count,0)>=3');expect(visibility).toContain('exists(select 1 from public.projects p where p.id=project_domains.project_id)');expect(visibility).toContain('exists(select 1 from public.projects p where p.id=project_capabilities.project_id)');expect(architect).toContain('requireProjectCatalogueReady');expect(admin).toContain('requireProjectCatalogueReady');
  });

  test('canonical participation includes flexible while legacy threshold remains fallback',()=>{
    const engine=read('lib/project-catalogue-filtering.ts');const page=read('app/projects/page.tsx');const detail=read('app/projects/[id]/page.tsx');const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');
    expect(engine).toContain("normalized==='solo'");expect(engine).toContain("normalized==='team'");expect(engine).toContain("normalized==='flexible'");expect(engine).toContain('return projectFormatFacet(teamSize)');
    expect(page).toContain("participation_mode?:'solo'|'team'|'flexible'|null");expect(page).toContain('min_team_size?:number|null');expect(page).toContain('target_team_size?:number|null');expect(page).toContain('max_team_size?:number|null');
    expect(detail).toContain('participation_mode,min_team_size,target_team_size,max_team_size,team_size_threshold');expect(detail).toContain("project.participation_mode||(legacyMinimum===1?'solo'");expect(publicDetail).toContain('<dt>Participation</dt>');expect(publicDetail).toContain('<dt>Capacity</dt>');
  });

  test('desktop matches approved quick-filter hierarchy and filter drawer',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});
    await expect(page.getByLabel('Career or role',{exact:true})).toBeVisible();await expect(page.getByLabel('Experience level',{exact:true})).toBeVisible();await expect(page.getByLabel('Project participation',{exact:true})).toBeVisible();
    const format=page.getByLabel('Project participation',{exact:true});await expect(format.locator('option')).toContainText(['Participation']);
    const sort=page.locator('.pfSort select');await expectVisibleNativeLabelledSelect(sort);await expect(sort.locator('option')).toHaveText(['Recommended','Newest','Closing soon','Shortest project','Lowest weekly commitment']);
    const trigger=page.getByRole('button',{name:/More filters/});await expect(trigger).toBeVisible();await trigger.click();const dialog=page.getByRole('dialog',{name:'Filter projects'});await expect(dialog).toBeVisible();const close=page.getByRole('button',{name:'Close filters'});await expect(close).toBeFocused();
    for(const name of ['role','experience','path','format','commitment','duration','working','domain','tool','type','availability'])await expectVisibleNativeLabelledSelect(dialog.locator(`select[name="${name}"]`));
    await expect(dialog.locator('select[name="format"] option')).toContainText(['Any participation']);await expect(dialog.locator('#path-filter')).toBeVisible();const capability=dialog.getByRole('combobox',{name:'Skills you want to build'});await expect(capability).toBeVisible();await capability.fill('data');await expect(capability).toHaveAttribute('aria-expanded','true');if(await dialog.getByRole('option').count())await capability.press('Enter');await page.keyboard.press('Escape');if(await dialog.isVisible())await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
    await trigger.click();await expect(dialog).toBeVisible();await close.click();await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  });

  test('rapid quick filters stay interactive and preserve their combined URL state',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});
    const navigationCount=await page.evaluate(()=>performance.getEntriesByType('navigation').length);
    const role=page.getByLabel('Career or role',{exact:true});const experience=page.getByLabel('Experience level',{exact:true});const format=page.getByLabel('Project participation',{exact:true});
    const roleOption=await firstRealOption(role);const experienceOption=await firstRealOption(experience);const formatOption=await firstRealOption(format);test.skip(!roleOption||!experienceOption||!formatOption,'Fixture does not expose all three quick-filter dimensions.');
    await role.selectOption(roleOption!.value);await experience.selectOption(experienceOption!.value);await format.selectOption(formatOption!.value);
    await expect(role).toHaveValue(roleOption!.value);await expect(experience).toHaveValue(experienceOption!.value);await expect(format).toHaveValue(formatOption!.value);
    await expect(page).toHaveURL(new RegExp(`role=${encodeURIComponent(roleOption!.value)}`));await expect(page).toHaveURL(new RegExp(`experience=${encodeURIComponent(experienceOption!.value)}`));await expect(page).toHaveURL(new RegExp(`format=${encodeURIComponent(formatOption!.value)}`));
    expect(await page.evaluate(()=>performance.getEntriesByType('navigation').length)).toBe(navigationCount);
  });

  test('drawer previews combined result count and underlying catalogue before Show',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});await page.getByRole('button',{name:/More filters/}).click();const dialog=page.getByRole('dialog',{name:'Filter projects'});const domain=dialog.locator('select[name="domain"]');const option=await firstRealOption(domain);test.skip(!option,'No public canonical industry facets are available in this fixture.');
    await domain.selectOption(option!.value);const show=dialog.getByRole('button',{name:/Show \d+ projects?/});await expect(show).toBeVisible();await expect.poll(async()=>show.textContent()).toMatch(/Show \d+ projects?/);await expect(dialog).toBeVisible();
    const number=Number(((await show.textContent())||'').match(/\d+/)?.[0]||0);await expect(page.locator('.projectResultsSummary strong')).toContainText(String(number));
  });

  test('clear one chip is immediate and retains other filter state',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});const experience=page.getByLabel('Experience level',{exact:true});const format=page.getByLabel('Project participation',{exact:true});const e=await firstRealOption(experience),f=await firstRealOption(format);test.skip(!e||!f,'Fixture lacks quick-filter values.');await experience.selectOption(e!.value);await format.selectOption(f!.value);const chip=page.getByRole('button',{name:/Remove Experience:/});await expect(chip).toBeVisible();await chip.click();await expect(experience).toHaveValue('all');await expect(format).toHaveValue(f!.value);await expect(page).not.toHaveURL(/experience=/);await expect(page).toHaveURL(new RegExp(`format=${encodeURIComponent(f!.value)}`));
  });

  test('mobile uses approved Filters count, sort control and bottom-sheet behaviour',async({page})=>{
    await page.setViewportSize({width:390,height:844});await page.goto('/projects#projects',{waitUntil:'networkidle'});await expect(page.getByLabel('Career or role',{exact:true})).toBeHidden();const trigger=page.getByRole('button',{name:'Filters · 0'});await expect(trigger).toBeVisible();await expect(page.getByLabel('Sort projects')).toBeVisible();await trigger.click();const dialog=page.getByRole('dialog',{name:'Filter projects'});await expect(dialog).toBeVisible();const box=await dialog.boundingBox();expect(box).not.toBeNull();if(box)expect(box.width).toBeLessThanOrEqual(391);await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  });

  test('analytics emits aggregate filter-open event without raw search or identity',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});await page.evaluate(()=>{const target=window as typeof window&{__catalogueAnalytics?:unknown[]};target.__catalogueAnalytics=[];window.addEventListener('mettelo:catalogue-analytics',event=>target.__catalogueAnalytics?.push((event as CustomEvent).detail))});await page.getByRole('button',{name:/More filters/}).click();const detail=await page.evaluate(()=>(window as typeof window&{__catalogueAnalytics?:Record<string,unknown>[]}).__catalogueAnalytics?.[0]||null);expect(detail).toMatchObject({event:'filter_opened',surface:'public'});expect(detail).not.toHaveProperty('query');expect(detail).not.toHaveProperty('value');expect(detail).not.toHaveProperty('user_id');expect(detail).not.toHaveProperty('email');
  });

  test('valid public filter state is URL-driven, removable and survives refresh',async({page})=>{
    await page.setViewportSize({width:1440,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});await page.getByRole('button',{name:/More filters/}).click();const dialog=page.getByRole('dialog',{name:'Filter projects'});const domain=dialog.locator('select[name="domain"]');const option=await firstRealOption(domain);test.skip(!option,'No public domain facets are available in this fixture.');await domain.selectOption(option!.value);await dialog.getByRole('button',{name:/Show \d+ projects?/}).click();await expect(page).toHaveURL(new RegExp(`domain=${encodeURIComponent(option!.value)}`));const remove=page.getByRole('button',{name:/Remove Industry:/});await expect(remove).toBeVisible();await page.reload({waitUntil:'networkidle'});await expect(page.getByRole('button',{name:/More filters/})).toBeVisible();await expect(remove).toBeVisible();await page.getByRole('button',{name:/More filters/}).click();await expect(page.getByRole('dialog',{name:'Filter projects'}).locator('select[name="domain"]')).toHaveValue(option!.value);await page.keyboard.press('Escape');await remove.click();await expect(page).not.toHaveURL(/domain=/);
  });

  test('filter UI reflows at supported widths and 200 percent text without page overflow',async({page})=>{
    for(const width of [320,375,390,414,768,1024,1440]){await page.setViewportSize({width,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});if(width<=860)await expect(page.getByRole('button',{name:/Filters ·/})).toBeVisible();else await expect(page.getByRole('button',{name:/More filters/})).toBeVisible();const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(size.scrollWidth,`Public project filters overflowed at ${width}px`).toBeLessThanOrEqual(size.clientWidth)}
    await page.setViewportSize({width:390,height:900});await page.goto('/projects#projects',{waitUntil:'networkidle'});await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});const zoomed=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));expect(zoomed.scrollWidth,'Public filter controls overflowed at 200% text').toBeLessThanOrEqual(zoomed.clientWidth);
  });
});
