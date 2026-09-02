import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 canonical planning contract',()=>{
  test('project timeline is derived from canonical milestones, not live Lab tasks',()=>{
    const planning=read('lib/project-experience-data.ts');
    const model=read('lib/project-experience-model.ts');
    const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');

    expect(planning).toContain("db.from('project_milestones')");
    expect(planning).toContain('week_start,week_end,expected_output');
    expect(planning).not.toContain("db.from('project_tasks')");
    expect(model).toContain('timeline:ProjectExperienceMilestone[]');
    expect(model).toContain('timeline:milestones');
    expect(publicDetail).toContain('07 · Project timeline');
    expect(publicDetail).toContain('This is the published project plan, not live Lab task status.');
    expect(publicDetail).toContain('Mettelo does not expose live Lab task state as a substitute for an approved project plan.');
  });

  test('Proof potential comes from configured evidence expectations and never awards Proof',()=>{
    const capabilityMigration=read('supabase/migrations/20260831143000_capability_paths_foundation.sql');
    const detail=read('lib/project-detail-content.ts');
    const model=read('lib/project-experience-model.ts');
    const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');

    expect(capabilityMigration).toContain('evidence_expected boolean not null default false');
    expect(detail).toContain('evidence_expected');
    expect(model).toContain('detail.capabilities.filter(item=>item.evidenceExpected)');
    expect(publicDetail).toContain('These are evidence opportunities, not automatic awards.');
    expect(publicDetail).toContain('Mettelo Proof still requires completed contribution and verification.');
    expect(publicDetail).not.toContain("verification_status:'verified'");
  });

  test('application remains owned by the existing lifecycle and capacity service',()=>{
    const programme=read('docs/PROJECT_EXPERIENCE_V2_PROGRAMME.md');
    const resolution=read('docs/PROJECT_EXPERIENCE_V2_PHASE0_RESOLUTION.md');
    const application=read('app/api/project-applications/route.ts');

    expect(programme).toContain('Application Settings must **reuse the current eligibility/lifecycle engines**');
    expect(resolution).toContain('does **not** add speculative opening-date/invite-only/max-application behaviour');
    expect(application).toContain('projectAcceptsApplications(project)');
    expect(application).toContain('loadProjectRoleUsage');
    expect(application).toContain('Project Participation Terms');
  });
});
