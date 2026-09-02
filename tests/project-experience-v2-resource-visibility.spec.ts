import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 resource visibility',()=>{
  test('discovery detail is deny-by-default for Lab resources',()=>{
    const loader=read('lib/project-detail-content.ts');
    expect(loader).toContain("sensitivity,publish_policy");
    expect(loader).toContain("row.sensitivity==='public'&&row.publish_policy==='permitted'");
    expect(loader).toContain('.filter(publicDataSource)');
    expect(loader).not.toContain('accessStatus:row.access_status');
    expect(loader).not.toContain('qualityStatus:row.quality_status');
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

  test('publish policy is explicitly deny-by-default',()=>{
    const migration=read('supabase/migrations/20260816073500_phase4_project_delivery_workspace.sql');
    expect(migration).toContain("publish_policy text not null default 'not_permitted'");
    expect(migration).toContain("'permitted'::text,'approval_required'::text,'not_permitted'::text");
  });
});
