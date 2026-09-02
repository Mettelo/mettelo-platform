import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 canonical draft editing contract',()=>{
 test('editing is restricted to the creating Architect or Admin while governance is editable',()=>{
  const readRoute=read('app/api/architect-projects/[id]/route.ts');
  const revision=read('app/api/architect-projects/[id]/revision/route.ts');
  expect(readRoute).toContain("roles.includes('creating_architect')");
  expect(readRoute).toContain("['draft','changes_requested'].includes(project.governance_status)");
  expect(revision).toContain("assignmentRoles.includes('creating_architect')");
  expect(revision).toContain("if(!isAdmin&&!assignmentRoles.includes('creating_architect'))");
  expect(revision).toContain("['draft','changes_requested'].includes(project.governance_status)");
 });

 test('there is one transactional save path and no route-level child mutation loop',()=>{
  const route=read('app/api/architect-projects/[id]/route.ts');
  const revision=read('app/api/architect-projects/[id]/revision/route.ts');
  const atomic=read('supabase/migrations/20260902122000_project_experience_draft_atomic_update.sql');
  const audit=read('supabase/migrations/20260902122100_project_experience_draft_atomic_audit.sql');
  expect(route).toContain("import {PATCH as saveAtomicRevision} from './revision/route'");
  expect(route).toContain('return saveAtomicRevision(request,context)');
  expect(route).not.toContain("db.from('project_data_sources').update(");
  expect(route).not.toContain("db.from('project_deliverables').update(");
  expect(revision).toContain("db.rpc('apply_project_experience_draft_revision'");
  expect(atomic).toContain('create or replace function public.apply_project_experience_draft_update');
  expect(audit).toContain('create or replace function public.apply_project_experience_draft_revision');
  expect(audit).toContain('perform public.apply_project_experience_draft_update');
  expect(audit).toContain("'project_definition_updated'");
  expect(audit).toContain("'atomic_revision',true");
 });

 test('atomic persistence keeps canonical definitions separate from run execution',()=>{
  const atomic=read('supabase/migrations/20260902122000_project_experience_draft_atomic_update.sql');
  expect(atomic).toContain('project_run_id is null');
  expect(atomic).toContain('project_run_id,null');
  expect(atomic).not.toContain("delete from public.project_tasks");
  expect(atomic).not.toContain("delete from public.project_runs");
  expect(atomic).not.toContain("delete from public.project_members");
  expect(atomic).toContain("update public.project_roles r set role_status='closed'");
  expect(atomic).not.toContain('delete from public.project_roles');
 });

 test('resource governance history cannot be erased or silently downgraded',()=>{
  const atomic=read('supabase/migrations/20260902122000_project_experience_draft_atomic_update.sql');
  const revision=read('app/api/architect-projects/[id]/revision/route.ts');
  expect(atomic).toContain('REVIEWED_RESOURCE_REMOVAL_BLOCKED');
  expect(atomic).toContain("current_resource.governance_status='green'");
  expect(atomic).toContain('GREEN_RESOURCE_EDIT_BLOCKED');
  expect(atomic).toContain("governance_status=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then 'unreviewed'");
  expect(atomic).toContain("publish_policy=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then 'not_permitted'");
  expect(atomic).toContain("quality_status=case when resource_reviewed or current_resource.governance_status<>'unreviewed' then 'unreviewed'");
  expect(revision).not.toContain('retention_policy:clean');
  expect(revision).not.toContain('internal_storage_policy:clean');
  expect(revision).not.toContain('internal_storage_url:httpsUrl');
 });

 test('atomic functions are unavailable to browser roles',()=>{
  const atomic=read('supabase/migrations/20260902122000_project_experience_draft_atomic_update.sql');
  const audit=read('supabase/migrations/20260902122100_project_experience_draft_atomic_audit.sql');
  expect(atomic).toContain('from public,anon,authenticated');
  expect(atomic).toContain('to service_role,postgres');
  expect(audit).toContain('from public,anon,authenticated');
  expect(audit).toContain('to service_role,postgres');
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
  expect(shortcuts).toContain('/edit`}>');
 });
});
