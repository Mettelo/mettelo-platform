import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 resource visibility',()=>{
  test('discovery detail is deny-by-default for Lab resources',()=>{
    const loader=read('lib/project-detail-content.ts');
    expect(loader).toContain('sensitivity,publish_policy');
    expect(loader).toContain("row.sensitivity==='public'&&row.publish_policy==='permitted'");
    expect(loader).toContain('.filter(publicDataSource)');
    expect(loader).not.toContain('accessStatus:row.access_status');
    expect(loader).not.toContain('qualityStatus:row.quality_status');
    expect(loader).not.toContain('internal_storage_url');
    expect(loader).not.toContain('governance_reviews');
  });

  test('public resource presentation does not expose internal access or quality states',()=>{
    const component=read('components/ProjectDecisionSections.tsx');
    expect(component).not.toContain('item.accessStatus');
    expect(component).not.toContain('item.qualityStatus');
    expect(component).toContain('classified as public and permitted for publication');
    expect(component).toContain('does not imply sponsorship, endorsement or partnership with Mettelo');
  });

  test('Lab database policy remains member-authorized rather than public',()=>{
    const migration=read('supabase/migrations/20260812150000_phase_3_data_native_workspace.sql');
    expect(migration).toContain('run members read data sources');
    expect(migration).toContain('public.mettelo_is_run_member(project_run_id)');
    expect(migration).not.toContain('project_data_sources for select to anon');
  });

  test('canonical template resources and deliverables reuse Lab entities instead of parallel stores',()=>{
    const migration=read('supabase/migrations/20260902120000_project_experience_v2_canonical_content.sql');
    expect(migration).toContain('alter table public.project_data_sources alter column project_run_id drop not null');
    expect(migration).toContain('alter table public.project_deliverables alter column project_run_id drop not null');
    expect(migration).toContain('project_run_id is null');
    expect(migration).toContain('project members read data sources');
    expect(migration).toContain('project members read deliverables');
    expect(migration).not.toContain('for select to anon');
  });

  test('canonical template mutation is restricted to Admin or assigned authoring Architects',()=>{
    const migration=read('supabase/migrations/20260902120500_project_experience_v2_canonical_content_rls_hardening.sql');
    expect(migration).toContain("paa.assignment_role in ('creating_architect','managing_architect')");
    expect(migration).toContain('project_run_id is null');
    expect(migration).toContain("coalesce((select auth.jwt()->'app_metadata'->>'role'),'')='admin'");
    expect(migration).not.toContain('for select to anon');
  });

  test('resource governance evidence is an admin-only linked audit record',()=>{
    const migration=read('supabase/migrations/20260902120000_project_experience_v2_canonical_content.sql');
    expect(migration).toContain('project_data_source_governance_reviews');
    expect(migration).toContain('admins read project data governance reviews');
    expect(migration).toContain('admins manage project data governance reviews');
  });

  test('publish policy is explicitly deny-by-default',()=>{
    const migration=read('supabase/migrations/20260816073500_phase4_project_delivery_workspace.sql');
    expect(migration).toContain("publish_policy text not null default 'not_permitted'");
    expect(migration).toContain("'permitted'::text,'approval_required'::text,'not_permitted'::text");
  });
});
