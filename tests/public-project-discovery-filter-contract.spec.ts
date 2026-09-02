import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Public Projects Filters V2',()=>{
  test('public catalogue uses the shared governed engine and public-only data boundary',()=>{
    const page=read('app/projects/page.tsx');
    const engine=read('lib/project-catalogue-filtering.ts');
    expect(page).toContain("from('@/lib/project-catalogue-filtering')");
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
  });

  test('catalogue readiness is a governed publish contract rather than a UI-only warning',()=>{
    const migration=read('supabase/migrations/20260902101500_project_catalogue_filters_v2_phase1.sql');
    const architect=read('app/api/architect-projects/route.ts');
    const admin=read('app/api/admin/project-governance/route.ts');
    expect(migration).toContain('create or replace view public.project_catalogue_readiness');
    expect(migration).toContain('coalesce(c.capability_count,0)>=3');
    expect(architect).toContain('requireProjectCatalogueReady');
    expect(architect).toContain('Complete catalogue readiness before review');
    expect(admin).toContain('requireProjectCatalogueReady');
    expect(admin).toContain('Missing catalogue metadata');
  });

  test('public filter surface is visible, accessible and exposes the approved facets and four sorts',async({page})=>{
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    const trigger=page.getByRole('button',{name:/Filters ·/});
    await expect(trigger).toBeVisible();
    const sort=page.getByLabel('Sort');
    await expect(sort).toBeVisible();
    await expect(sort.locator('option')).toHaveText(['Recently added','Closing soon','Shortest duration','Longest duration']);
    await trigger.click();
    const dialog=page.getByRole('dialog',{name:'Filter projects'});
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Role')).toBeVisible();
    await expect(page.getByLabel('Skill / capability')).toBeVisible();
    await expect(page.getByLabel('Domain')).toBeVisible();
    await expect(page.getByLabel('Tool / technology')).toBeVisible();
    await expect(page.getByLabel('Project type')).toBeVisible();
    await expect(page.getByLabel('Working model')).toBeVisible();
    await expect(page.getByLabel('Commitment')).toBeVisible();
    await expect(page.getByLabel('Duration')).toBeVisible();
    await expect(page.getByLabel('Project stage')).toBeVisible();
    await expect(page.getByLabel('Capability Path')).toBeVisible();
    await expect(page.getByLabel('Close project filters')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator('.projectsQuickFilters')).toHaveCount(0);
    await expect(page.locator('#level-filter')).toHaveCount(0);
  });

  test('valid public filter state is URL-driven and survives refresh',async({page})=>{
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:/Filters ·/}).click();
    const domain=page.getByLabel('Domain');
    const options=await domain.locator('option').evaluateAll(nodes=>nodes.map(node=>({value:(node as HTMLOptionElement).value,text:node.textContent||''})).filter(item=>item.value&&item.value!=='all'));
    test.skip(options.length===0,'No public domain facets are available in this fixture.');
    await domain.selectOption(options[0].value);
    await page.getByRole('button',{name:/Show \d+ projects?/}).click();
    await expect(page).toHaveURL(new RegExp(`domain=${encodeURIComponent(options[0].value)}`));
    await page.reload({waitUntil:'networkidle'});
    await expect(page.getByRole('button',{name:/Filters · [1-9]/})).toBeVisible();
    await page.getByRole('button',{name:/Filters ·/}).click();
    await expect(page.getByLabel('Domain')).toHaveValue(options[0].value);
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