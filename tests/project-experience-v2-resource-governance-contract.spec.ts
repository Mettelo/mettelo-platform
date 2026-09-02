import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 resource governance contract',()=>{
  test('resource governance mutations are Admin-only',()=>{
    const route=read('app/api/architect-project-resources/route.ts');
    expect(route).toContain("if(!ctx.isAdmin)return NextResponse.json({error:'Admin access is required for resource governance.'},{status:403})");
    expect(route).toContain("if(!isAdmin)return NextResponse.json({error:'Admin access is required to approve project resources.'},{status:403})");
    expect(route).toContain(".is('project_run_id',null)");
  });

  test('green and public-source approval require explicit evidence-compatible conditions',()=>{
    const route=read('app/api/architect-project-resources/route.ts');
    expect(route).toContain("decision==='green'&&(!source.external_url||!source.licence_name||(!source.licence_url&&!evidenceUrl))");
    expect(route).toContain("publicUseApproved&&(decision!=='green'||source.sensitivity!=='public')");
    expect(route).toContain("publish_policy:publicUseApproved?'permitted':'not_permitted'");
  });

  test('governance decision is atomic across source state, review evidence and project audit',()=>{
    const route=read('app/api/architect-project-resources/route.ts');
    const migration=read('supabase/migrations/20260902122200_project_resource_governance_atomic_review.sql');
    expect(route).toContain("db.rpc('apply_project_resource_governance_review'");
    expect(route).not.toContain("db.from('project_data_sources').update(");
    expect(route).not.toContain("db.from('project_data_source_governance_reviews').insert");
    expect(migration).toContain('update public.project_data_sources');
    expect(migration).toContain('insert into public.project_data_source_governance_reviews');
    expect(migration).toContain('insert into public.project_governance_events');
    expect(migration).toContain("'atomic_review',true");
    expect(migration).toContain('GREEN_REQUIRES_LICENCE_EVIDENCE');
    expect(migration).toContain('from public,anon,authenticated');
  });

  test('public project projection never selects private storage fields',()=>{
    const publicLoader=read('lib/project-detail-content.ts');
    const labLoader=read('lib/project-lab-canonical-data.ts');
    expect(publicLoader).not.toContain('internal_storage_url');
    expect(publicLoader).not.toContain('internal_storage_policy');
    expect(publicLoader).not.toContain('governance_verified_by');
    expect(labLoader).toContain("governanceStatus==='green'&&row.internal_storage_policy==='permitted'");
  });
});
