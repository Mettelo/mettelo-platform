import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();

function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Public project discovery filters',()=>{
  test('governed imported taxonomy is backfilled into canonical filter tables',()=>{
    const migration=read('supabase/migrations/20260901164500_backfill_imported_project_taxonomy.sql');
    expect(migration).toContain('capability_path_import_project_origins');
    expect(migration).toContain('capability_path_import_rows');
    expect(migration).toContain('insert into public.project_domains');
    expect(migration).toContain('insert into public.project_tools');
    expect(migration).toContain('insert into public.project_methods');
    expect(migration.match(/on conflict/g)?.length||0).toBeGreaterThanOrEqual(3);
    expect(migration.toLowerCase()).not.toContain('similarity(');
    expect(migration.toLowerCase()).not.toContain('levenshtein');
  });

  test('public project cards derive application state from the shared lifecycle contract',()=>{
    const page=read('app/projects/page.tsx');
    const availability=read('lib/project-public-availability.ts');
    expect(page).toContain('applications_open:boolean|null');
    expect(page).toContain('applications_open,github_url');
    expect(page).toContain('projectAvailability(p).available');
    expect(page).toContain('sum+Math.max(0,Number(role.openings)||0)');
    expect(page).toContain("status==='pilot'?availabilityLabel.toUpperCase()");
    expect(page).toContain("deadline&&p.project_type==='partner'");
    expect(page).not.toContain("status==='pilot'?'PILOT — REGISTERING INTEREST'");
    expect(availability).toContain("project.status==='pilot'?'Pilot · Applications open'");
    expect(availability).toContain("project.status==='pilot'?'register_interest':'applications_closed'");
  });

  test('filter surface exposes governed useful controls without dead quick/level filters',async({page})=>{
    await page.goto('/projects#projects',{waitUntil:'networkidle'});
    const panel=page.locator('.projectFilterPanel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.projectsQuickFilters')).toBeHidden();
    await expect(page.locator('#level-filter')).toBeHidden();
    await expect(page.locator('#path-filter')).toBeVisible();
    await expect(page.locator('#type-filter')).toBeVisible();
    await expect(page.locator('#domain-filter')).toBeVisible();
    await expect(page.locator('#tool-filter')).toBeVisible();
    await expect(page.locator('#status-filter')).toBeVisible();
  });

  test('filter surface reflows without horizontal overflow',async({page})=>{
    for(const width of [320,390,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      await page.goto('/projects#projects',{waitUntil:'networkidle'});
      const size=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
      expect(size.scrollWidth,`Project filters overflowed at ${width}px`).toBeLessThanOrEqual(size.clientWidth);
    }
  });
});
