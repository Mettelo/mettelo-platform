import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

async function expectVisibleNativeLabelledSelect(control:ReturnType<import('@playwright/test').Page['locator']>){
  await expect(control).toBeVisible();
  expect(await control.evaluate(element=>Boolean((element as HTMLSelectElement).labels?.length))).toBe(true);
}

test.describe('Public Projects Filters V2',()=>{
  test('public catalogue uses the shared governed engine and public-only data boundary',()=>{
    const page=read('app/projects/page.tsx');
    const engine=read('lib/project-catalogue-filtering.ts');
    const controls=read('components/PublicProjectFilters.tsx');
    expect(page).toContain("from '@/lib/project-catalogue-filtering'");
    expect(page).toContain(".eq('visibility','public')");
    expect(page).toContain('filterAndSortProjectCatalogue(catalogueItems,filters)');
    expect(page).toContain('const PUBLIC_PAGE_SIZE=12');
    expect(page).toContain("query.set('skill',filters.capability)");
    expect(page).toContain("query.set('working',filters.workingModel)");
    expect(page).toContain("query.set('sort',filters.sort)");
    expect(page).not.toContain('project_members');
    expect(page).not.toContain('saved_projects');
    expect(page).not.toContain('applicationReadiness');
    expect(engine).toContain("duration:string;");
    expect(engine).toContain('catalogueDurationOptions');
    expect(controls).toContain("mettelo:catalogue-analytics");
    expect(controls).toContain('publicFilterChip');
  });

  test('public catalogue degrades to canonical project cards instead of a false outage when optional embeds fail',()=>{
    const page=read('app/projects/page.tsx');
    const publicClient=read('lib/supabase/public.ts');
    expect(page).toContain("const scalarResult=await supabase.from('projects').select('id,slug,title,summary,status,project_type,partner_name,location,location_type,difficulty_level,duration_weeks,weekly_commitment,application_deadline,applications_open,github_url,created_at')");
    expect(page).toContain('if(scalarResult.error)loadError=true;else projects=');
    expect(page).toContain('Facet relationships are useful enrichment, not catalogue availability authority.');
    expect(publicClient).toContain('new Set([429,500,502,503,504])');
    expect(publicClient).toContain('const PUBLIC_READ_MAX_ATTEMPTS=3');
    expect(publicClient).toContain("const retryable=method==='GET'||method==='HEAD'");
    expect(publicClient).toContain('if(!retryable)return fetch(input,init)');
    expect(publicClient).not.toContain("retryable=method==='POST'");
  });

  test('catalogue readiness and facet visibility preserve the governed RLS boundary',()=>{
    const migration=read('supabase/migrations/20260902101500_project_catalogue_filters_v2_phase1.sql');
    const visibility=read('supabase/migrations/20260902103000_project_catalogue_filters_v2_visibility_rls.sql');
    const architect=read('app/api/architect-projects/route.ts');
    const admin=read('app/api/admin/project-governance/route.ts');
    expect(migration).toContain('create or replace view public.project_catalogue_readiness with (security_invoker=true)');
    expect(migration).toContain('coalesce(c.capability_count,0)>=3');
    expect(visibility).toContain('exists(select 1 from public.projects p where p.id=project_domains.project_id)');
    expect(visibility).toContain('exists(select 1 from public.projects p where p.id=project_capabilities.project_id)');
    expect(architect).toContain('requireProjectCatalogueReady');
    expect(architect).toContain('Complete catalogue readiness before review');
    expect(admin).toContain('requireProjectCatalogueReady');
    expect(admin).toContain('Missing catalogue metadata');
  });

  test('public filter surface is visible, accessible and exposes the approved facets and four sorts',async({page})=>{
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    const trigger=page.getByRole('button',{name:/Filters ·/});
    await expect(trigger).toBeVisible();
    const sort=page.locator('.publicSortControl select[name="sort"]');
    await expectVisibleNativeLabelledSelect(sort);
    await expect(sort.locator('option')).toHaveText(['Recently added','Closing soon','Shortest duration','Longest duration']);
    await trigger.click();
    const dialog=page.getByRole('dialog',{name:'Filter projects'});
    await expect(dialog).toBeVisible();
    for(const name of ['role','domain','tool','type','working','commitment','duration','stage','path']){
      await expectVisibleNativeLabelledSelect(dialog.locator(`select[name="${name}"]`));
    }
    const combo=dialog.getByRole('combobox',{name:'Skill / capability'});
    await expect(combo).toBeVisible();
    await expect(combo).toHaveAttribute('aria-autocomplete','list');
    await expect(page.getByLabel('Close project filters',{exact:true})).toBeFocused();
    await combo.focus();
    await page.keyboard.press('ArrowDown');
    await expect(combo).toHaveAttribute('aria-expanded','true');
    const capabilityOptions=dialog.locator('#public-capability-options [role="option"]');
    if(await capabilityOptions.count())await expect(combo).toHaveAttribute('aria-activedescendant',/public-capability-option-/);
    await page.keyboard.press('Escape');
    await expect(combo).toHaveAttribute('aria-expanded','false');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator('.projectsQuickFilters')).toHaveCount(0);
    await expect(page.locator('#level-filter')).toHaveCount(0);
  });

  test('public analytics boundary emits aggregate interaction data without raw search or identity',async({page})=>{
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    await page.evaluate(()=>{
      const target=window as typeof window&{__catalogueAnalytics?:unknown[]};
      target.__catalogueAnalytics=[];
      window.addEventListener('mettelo:catalogue-analytics',event=>target.__catalogueAnalytics?.push((event as CustomEvent).detail));
    });
    await page.getByRole('button',{name:/Filters ·/}).click();
    const detail=await page.evaluate(()=>(window as typeof window&{__catalogueAnalytics?:Record<string,unknown>[]}).__catalogueAnalytics?.[0]||null);
    expect(detail).toMatchObject({event:'filter_opened',surface:'public'});
    expect(detail).not.toHaveProperty('query');
    expect(detail).not.toHaveProperty('value');
    expect(detail).not.toHaveProperty('user_id');
    expect(detail).not.toHaveProperty('email');
  });

  test('valid public filter state is URL-driven, removable and survives refresh',async({page})=>{
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:/Filters ·/}).click();
    const dialog=page.getByRole('dialog',{name:'Filter projects'});
    const domain=dialog.locator('select[name="domain"]');
    const options=await domain.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:(node as HTMLOptionElement).value,text:node.textContent||''})).filter(item=>item.value&&item.value!=='all'));
    test.skip(options.length===0,'No public domain facets are available in this fixture.');
    await domain.selectOption(options[0].value);
    await page.getByRole('button',{name:/Show \d+ projects?/}).click();
    await expect(page).toHaveURL(new RegExp(`domain=${encodeURIComponent(options[0].value)}`));
    await expect(page.getByRole('link',{name:/Remove Domain:/})).toBeVisible();
    await page.reload({waitUntil:'networkidle'});
    await expect(page.getByRole('button',{name:/Filters · [1-9]/})).toBeVisible();
    await expect(page.getByRole('link',{name:/Remove Domain:/})).toBeVisible();
    await page.getByRole('button',{name:/Filters ·/}).click();
    await expect(page.getByRole('dialog',{name:'Filter projects'}).locator('select[name="domain"]')).toHaveValue(options[0].value);
    await page.keyboard.press('Escape');
    await page.getByRole('link',{name:/Remove Domain:/}).click();
    await expect(page).not.toHaveURL(/domain=/);
    await expect(page.getByRole('button',{name:'Filters · 0'})).toBeVisible();
  });

  test('public filter UI reflows at supported phone/tablet widths and 200 percent text',async({page})=>{
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      await page.goto('/projects#projects',{waitUntil:'networkidle'});
      if(width===390){await page.getByRole('button',{name:/Filters ·/}).click();await expect(page.getByRole('dialog',{name:'Filter projects'})).toBeVisible();}
      const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
      expect(size.scrollWidth,`Public project filters overflowed at ${width}px`).toBeLessThanOrEqual(size.clientWidth);
    }
    await page.setViewportSize({width:390,height:900});
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
    const zoomed=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
    expect(zoomed.scrollWidth,'Public filter controls overflowed at 200% text').toBeLessThanOrEqual(zoomed.clientWidth);
  });
});
