import {expect,test} from '@playwright/test';
import fs from 'node:fs';

const rolePage=fs.readFileSync('app/careers/[slug]/page.tsx','utf8');
const adminEditor=fs.readFileSync('components/AdminCareerRolesTable.tsx','utf8');
const roleApi=fs.readFileSync('app/api/admin/careers/roles/route.ts','utf8');
const applyApi=fs.readFileSync('app/api/careers/apply/route.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260831113000_career_role_editor_v2.sql','utf8');

test('career role v2 keeps one reusable data-driven public template and existing application binding',()=>{
  expect(rolePage).toContain('const roleFields=');
  for(const field of ['role_proposition','time_commitment','candidate_value','success_looks_like','application_stages'])expect(rolePage).toContain(field);
  expect(rolePage).toContain('CareerApplicationForm roleId={role.id}');
  expect(applyApi).toContain("data.set('role_id',roleId)");
  expect(applyApi).toContain(".eq('id',roleId)");
  expect(rolePage).not.toContain('Volunteer Data Analyst');
});

test('role page protects responsive composition, dynamic sections and non-duplicated candidate value',()=>{
  expect(rolePage).toContain('grid-template-columns:minmax(0,1fr) minmax(320px,360px)');
  expect(rolePage).toContain('max-width:68ch');
  expect(rolePage).toContain('@media(max-width:1000px)');
  expect(rolePage).toContain('@media(max-width:680px)');
  expect(rolePage).toContain('overflow-wrap:normal;word-break:normal');
  expect(rolePage).toContain('const nextSection=');
  expect(rolePage).toContain('number={nextSection()}');
  expect(rolePage).not.toContain('careerV2Cards');
});

test('Admin editor can author every candidate-facing v2 section and preview drafts',()=>{
  for(const field of ['role_proposition','time_commitment','candidate_value','good_fit','not_required','core_capabilities','useful_tools','working_model','success_looks_like','transparency','application_stages']){
    expect(adminEditor).toContain(`name=\"${field}\"`);
    expect(roleApi).toContain(field);
    expect(migration).toContain(field);
  }
  expect(adminEditor).toContain('?preview=1');
  expect(rolePage).toContain('previewRequested');
  expect(rolePage).toContain('Admin preview');
});

test('role lifecycle protects closed pages, reopen deadlines and archived roles',()=>{
  expect(rolePage).toContain("['published','closed'].includes(role.status)");
  expect(rolePage).toContain("const accepting=role.status==='published'&&!deadlinePassed");
  expect(rolePage).toContain('Applications closed');
  expect(roleApi).toContain('deadlineHasPassed');
  expect(roleApi).toContain('Set a future application deadline');
  expect(roleApi).toContain("if(from==='archived')return to==='archived'||to==='draft'");
  expect(adminEditor).toContain('Restore to draft');
  expect(adminEditor).toContain('Reopen');
});

test('publish validation requires candidate value and volunteer transparency plus compensation',()=>{
  expect(roleApi).toContain("missing.push('role proposition')");
  expect(roleApi).toContain("missing.push('what the candidate will gain')");
  expect(roleApi).toContain("missing.push('working model')");
  expect(roleApi).toContain("missing.push('what success looks like')");
  expect(roleApi).toContain("missing.push('volunteer compensation disclosure')");
  expect(roleApi).toContain("missing.push('volunteer transparency')");
});
