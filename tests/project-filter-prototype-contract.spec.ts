import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('public project filters preserve the approved desktop and mobile prototype contract',async()=>{
  const source=await readFile('components/PublicProjectFilters.tsx','utf8');
  for(const text of [
    'Search projects, roles, skills, tools or industries',
    'Career / Role','Experience Level','Solo / Team','More filters',
    'REFINE CATALOGUE','Career fit','How you want to work','What you want to work on','Opportunity',
    'Capability Path','Skills you want to build','Weekly commitment','Project length','Working model','Industry','Tools & technologies','Project source','Availability',
    'Clear all','Show {resultCount}'
  ])expect(source).toContain(text);
  expect(source).toContain('@media(max-width:860px)');
  expect(source).toContain('@media(max-width:560px)');
  expect(source).toContain('inset:0 0 0 auto');
  expect(source).toContain('height:92dvh');
  expect(source).toContain('border-radius:22px 22px 0 0');
  expect(source).toContain("document.body.style.overflow='hidden'");
  expect(source).toContain("document.body.style.overflow=''");
});

test('every instructed filter is wired to catalogue-driven options',async()=>{
  const source=await readFile('components/PublicProjectFilters.tsx','utf8');
  for(const optionSource of ['roles.map','experiences.map','formats.map','paths.map','capabilities.filter','commitments.map','durations.map','workingModels.map','domains.map','tools.map','types.map','availabilities.map'])expect(source).toContain(optionSource);
});

test('public project filtering operates on the complete catalogue before pagination',async()=>{
  const loader=await readFile('lib/public-project-catalogue-loader.ts','utf8');
  const page=await readFile('app/projects/page.tsx','utf8');
  expect(loader).toContain('BATCH_SIZE=200');
  expect(loader).toContain('.range(from,to)');
  expect(loader).toContain(".order('created_at',{ascending:false}).order('id',{ascending:false})");
  expect(loader).not.toContain('.limit(500)');
  expect(page).toContain('loadPublicProjectCatalogue(supabase)');
  expect(page).toContain('filterAndSortProjectCatalogue(catalogueItems,filters)');
  expect(page).toContain('visibleItems=filtered.slice');
  expect(page).not.toContain('.limit(500)');
});
