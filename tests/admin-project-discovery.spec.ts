import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('Admin project discovery uses controlled taxonomy and existing canonical project fields',async()=>{
  const [api,editor]=await Promise.all([readFile('app/api/admin/project-discovery/route.ts','utf8'),readFile('components/AdminProjectDiscoveryMetadata.tsx','utf8')]);
  for(const field of ['difficulty_level','team_size_threshold','weekly_commitment','location_type'])expect(api).toContain(field);
  for(const table of ["from('domains')","from('tools')","from('methods')","from('project_domains')","from('project_tools')","from('project_methods')"])expect(api).toContain(table);
  expect(api).toContain("user?.app_metadata?.role==='admin'");
  expect(editor).toContain('Experience Level');
  expect(editor).toContain('Solo / Team');
  expect(editor).toContain('Weekly commitment');
  expect(editor).toContain('Working model');
  expect(editor).toContain('Industry');
  expect(editor).toContain('Tools & technologies');
  expect(editor).not.toContain('Create taxonomy');
});
