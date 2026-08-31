import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const rolePage=fs.readFileSync('app/careers/[slug]/page.tsx','utf8');
const adminEditor=fs.readFileSync('components/AdminCareerRolesTable.tsx','utf8');
const roleApi=fs.readFileSync('app/api/admin/careers/roles/route.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260831113000_career_role_editor_v2.sql','utf8');

test('career role v2 keeps one reusable data-driven public template',()=>{
  expect(rolePage).toContain("const roleFields=");
  expect(rolePage).toContain('role_proposition');
  expect(rolePage).toContain('time_commitment');
  expect(rolePage).toContain('candidate_value');
  expect(rolePage).toContain('success_looks_like');
  expect(rolePage).toContain('application_stages');
  expect(rolePage).toContain('CareerApplicationForm');
  expect(rolePage).not.toContain('Volunteer Data Analyst');
});

test('role page protects responsive and readable composition',()=>{
  expect(rolePage).toContain('grid-template-columns:minmax(0,1fr) minmax(320px,360px)');
  expect(rolePage).toContain('max-width:68ch');
  expect(rolePage).toContain('@media(max-width:1000px)');
  expect(rolePage).toContain('@media(max-width:680px)');
  expect(rolePage).toContain('overflow-wrap:normal;word-break:normal');
});

test('Admin editor can author every candidate-facing v2 section',()=>{
  for(const field of ['role_proposition','time_commitment','candidate_value','good_fit','not_required','core_capabilities','useful_tools','working_model','success_looks_like','transparency','application_stages']){
    expect(adminEditor).toContain(`name=\"${field}\"`);
    expect(roleApi).toContain(field);
    expect(migration).toContain(field);
  }
});

test('publish validation requires volunteer transparency and core role value',()=>{
  expect(roleApi).toContain("missing.push('role proposition')");
  expect(roleApi).toContain("missing.push('what the candidate will gain')");
  expect(roleApi).toContain("missing.push('working model')");
  expect(roleApi).toContain("missing.push('what success looks like')");
  expect(roleApi).toContain("includes('volunteer')&&!present(candidate.transparency)");
});
