import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 canonical draft editing contract',()=>{
 test('editing is restricted to the creating Architect or Admin while governance is editable',()=>{
  const route=read('app/api/architect-projects/[id]/route.ts');
  expect(route).toContain("roles.includes('creating_architect')");
  expect(route).toContain("if(!isAdmin&&!creator)");
  expect(route).toContain("['draft','changes_requested'].includes(project.governance_status)");
  expect(route).toContain('Only draft or changes-requested proposals can be edited');
 });

 test('canonical child records update in place and keep execution rows out of the draft editor',()=>{
  const route=read('app/api/architect-projects/[id]/route.ts');
  expect(route).toContain(".eq('id',input.id).eq('project_id',project.id).is('project_run_id',null)");
  expect(route).toContain("project_run_id:null");
  expect(route.match(/\.is\('project_run_id',null\)/g)?.length||0).toBeGreaterThanOrEqual(8);
  expect(route).toContain("db.from('project_roles').update({role_status:'closed'})");
  expect(route).not.toContain("db.from('project_roles').delete()");
  expect(route).not.toContain('slug:slugify');
 });

 test('resource governance history cannot be erased or silently downgraded',()=>{
  const route=read('app/api/architect-projects/[id]/route.ts');
  expect(route).toContain("db.from('project_data_source_governance_reviews').select('data_source_id').in('data_source_id',existingIds)");
  expect(route).toContain("existing.governance_status==='green'");
  expect(route).toContain('is GREEN and cannot be changed by a Project Architect');
  expect(route).toContain('has governance history and cannot be removed');
  expect(route).toContain("if(!changedResourceIds.has(input.id))continue");
  expect(route).toContain("governance_status:'unreviewed'");
  expect(route).toContain("publish_policy:'not_permitted'");
  expect(route).toContain("quality_status:'unreviewed'");
  expect(route).not.toContain('retention_policy:input');
  expect(route).not.toContain('internal_storage_policy:input');
  expect(route).not.toContain('internal_storage_url:input');
 });

 test('the edit UI keeps all ten authoring stages and requires a new data-rights declaration',()=>{
  const editor=read('components/ArchitectProjectEditForm.tsx');
  const page=read('app/member/architect-projects/[id]/edit/page.tsx');
  const shortcuts=read('components/ArchitectDraftEditShortcuts.tsx');
  for(const label of ['Project basics','Problem & context','Data & resources','Deliverables & success','Skills & Proof','Roles & team','Timeline','Application settings','Lab preview','Review & save'])expect(editor).toContain(label);
  expect(editor).toContain("item.governance_status==='green'");
  expect(editor).toContain('Re-confirm legitimate access and usage rights');
  expect(editor).toContain('disabled={busy||!rightsConfirmed}');
  expect(editor).toContain('No direct publish bypass');
  expect(page).toContain('ArchitectProjectEditForm');
  expect(shortcuts).toContain('/edit`}>Edit canonical draft');
 });
});
