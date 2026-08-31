import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const page=fs.readFileSync('app/careers/page.tsx','utf8');
const discovery=fs.readFileSync('app/careers/CareersDiscovery.tsx','utf8');

test('careers discovery keeps role data server-owned and public role routes intact',()=>{
  expect(page).toContain(".eq('status','published')");
  expect(page).toContain(".or(`closes_at.is.null,closes_at.gt.${new Date().toISOString()}`)");
  expect(page).toContain('<CareersDiscovery roles={roles}/>');
  expect(discovery).toContain('href={`/careers/${role.slug}`}');
});

test('careers discovery supports scalable search filters sorting and nine-role pagination',()=>{
  expect(discovery).toContain('const PAGE_SIZE=9');
  expect(discovery).toContain('Search role, team, skill or keyword');
  expect(discovery).toContain('All teams');
  expect(discovery).toContain('All types');
  expect(discovery).toContain('Any model');
  expect(discovery).toContain('Any location');
  expect(discovery).toContain('Closing soon');
  expect(discovery).toContain('careersPagination');
});

test('career filters preserve shareable URL state and provide removable active filters',()=>{
  expect(discovery).toContain("params.set('q',query)");
  expect(discovery).toContain("params.set('team',team)");
  expect(discovery).toContain("params.set('page',String(page))");
  expect(discovery).toContain('window.history.replaceState');
  expect(discovery).toContain('careersActiveFilters');
  expect(discovery).toContain('Clear all');
});

test('career discovery has responsive mobile filtering and candidate journey clarity',()=>{
  expect(discovery).toContain('careersMobileFilterButton');
  expect(discovery).toContain('aria-controls="career-filters"');
  expect(page).toContain('5 steps</b> candidate journey');
  expect(page).toContain('<strong>Onboarding</strong>');
  expect(page).toContain('@media(max-width:760px)');
  expect(page).toContain('.careersFilters.isOpen{display:grid}');
});
