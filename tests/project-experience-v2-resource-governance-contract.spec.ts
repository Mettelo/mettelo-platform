import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 resource governance contract',()=>{
  test('resource governance mutations are Admin-only',()=>{
    const route=read('app/api/architect-project-resources/route.ts');
    expect(route.match(/if\(!ctx\.isAdmin\)/g)?.length||0).toBeGreaterThanOrEqual(1);
    expect(route).toContain("if(!isAdmin)return NextResponse.json({error:'Admin access is required to approve project resources.'},{status:403})");
    expect(route).toContain("project_run_id',null");
  });

  test('green and public-source approval require explicit evidence-compatible conditions',()=>{
    const route=read('app/api/architect-project-resources/route.ts');
    expect(route).toContain("decision==='green'&&(!source.external_url||!source.licence_name)");
    expect(route).toContain("publicUseApproved&&(decision!=='green'||source.sensitivity!=='public')");
    expect(route).toContain("publish_policy:publicUseApproved?'permitted':'not_permitted'");
    expect(route).toContain("qualityStatus(decision)");
    expect(route).toContain("decision==='green'?'approved':decision==='verification_required'?'unreviewed':'issues_found'");
  });

  test('governance decisions leave an auditable source review and project event',()=>{
    const route=read('app/api/architect-project-resources/route.ts');
    expect(route).toContain("db.from('project_data_source_governance_reviews').insert");
    expect(route).toContain("eventType:'resource_governance_reviewed'");
    expect(route).toContain('reviewer_user_id:user.id');
    expect(route).toContain('governance_verified_by:user.id');
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
