import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 canonical planning contract',()=>{
  test('public project route renders the canonical advanced experience instead of a parallel legacy page',()=>{
    const route=read('app/projects/[id]/page.tsx');

    expect(route).toContain("import ProjectPublicDetailV2 from '@/components/project-experience/ProjectPublicDetailV2'");
    expect(route).toContain("import {getProjectExperiencePlanning} from '@/lib/project-experience-data'");
    expect(route).toContain("import {buildProjectExperienceModel} from '@/lib/project-experience-model'");
    expect(route).toContain('getProjectDetailContent(project.id)');
    expect(route).toContain('getProjectExperiencePlanning(project.id)');
    expect(route).toContain('buildProjectExperienceModel({');
    expect(route).toContain('return <ProjectPublicDetailV2');
    expect(route).not.toContain('const styles=`');
    expect(route).not.toContain('<ProjectDecisionSections');
  });

  test('member project route consumes the same canonical model without replacing eligibility and capacity authority',()=>{
    const route=read('app/member/discover/[id]/page.tsx');
    const member=read('components/project-experience/MemberProjectDetailV2.tsx');

    expect(route).toContain("import {getProjectExperiencePlanning} from '@/lib/project-experience-data'");
    expect(route).toContain("import {buildProjectExperienceModel} from '@/lib/project-experience-model'");
    expect(route).toContain("import MemberProjectDetailV2 from '@/components/project-experience/MemberProjectDetailV2'");
    expect(route).toContain('calculateMemberReadiness');
    expect(route).toContain('loadProjectRoleUsage');
    expect(route).toContain('resolveMemberProjectState');
    expect(route).toContain('getProjectDetailContent(id)');
    expect(route).toContain('getProjectExperiencePlanning(id)');
    expect(route).toContain('buildProjectExperienceModel({');
    expect(route).toContain('return <MemberProjectDetailV2');
    expect(member).toContain('ProjectMemberCanonicalSections');
    expect(member).toContain('/apply?role=');
    expect(member).toContain('SaveProjectButton');
  });

  test('project timeline is derived only from canonical project milestones, never live Lab execution state',()=>{
    const planning=read('lib/project-experience-data.ts');
    const model=read('lib/project-experience-model.ts');
    const publicDetail=read('components/project-experience/ProjectPublicDetailV2.tsx');
    const memberDetail=read('components/project-experience/ProjectMemberCanonicalSections.tsx');

    expect(planning).toContain("db.from('project_milestones')");
    expect(planning).toContain('week_start,week_end,expected_output');
    expect(planning).toContain(".is('project_run_id',null)");
    expect(planning).not.toContain("db.from('project_tasks')");
    expect(model).toContain('timeline:ProjectExperienceMilestone[]');
    expect(model).toContain('timeline:milestones');
    expect(publicDetail).toContain('07 · Project timeline');
    expect(publicDetail).toContain('This is the published project plan, not live Lab task status.');
    expect(publicDetail).toContain('Mettelo does not expose live Lab task state as a substitute for an approved project plan.');
    expect(memberDetail).toContain('Live execution state remains inside the authorised Lab workspace.');
  });

  test('Proof potential requires explicit evidence expectations on both public project presentations',()=>{
    const capabilityMigration=read('supabase/migrations/20260831143000_capability_paths_foundation.sql');
    const detail=read('lib/project-detail-content.ts');
    const model=read('lib/project-experience-model.ts');
    const advanced=read('components/project-experience/ProjectPublicDetailV2.tsx');
    const compatibility=read('components/ProjectDecisionSections.tsx');

    expect(capabilityMigration).toContain('evidence_expected boolean not null default false');
    expect(detail).toContain('evidence_expected');
    expect(model).toContain('detail.capabilities.filter(item=>item.evidenceExpected).map(item=>item.name)');
    expect(model).not.toContain('...technical.slice(0,3)');
    expect(model).not.toContain('...professional.slice(0,2)');
    expect(compatibility).toContain('detail.capabilities.filter(item=>item.evidenceExpected).map(item=>item.name)');
    expect(compatibility).not.toContain('...detail.pathContexts.map(item=>item.capabilityBuilt)');
    expect(compatibility).not.toContain('...technical.slice(0,2)');
    expect(advanced).toContain('These are evidence opportunities, not automatic awards.');
    expect(advanced).toContain('Mettelo Proof still requires completed contribution and verification.');
    expect(compatibility).toContain('These are explicitly configured evidence opportunities, not automatic awards.');
    expect(advanced).not.toContain("verification_status:'verified'");
    expect(compatibility).not.toContain("verification_status:'verified'");
  });

  test('explicit project success criteria take priority over execution acceptance fallback',()=>{
    const detail=read('lib/project-detail-content.ts');
    const model=read('lib/project-experience-model.ts');
    const compatibility=read('components/ProjectDecisionSections.tsx');

    expect(detail).toContain("db.from('project_success_criteria')");
    expect(model).toContain('const successCriteria=canonicalSuccess.length?canonicalSuccess:fallbackSuccess');
    expect(compatibility).toContain('const criteria=canonicalCriteria.length?canonicalCriteria:fallbackCriteria');
    expect(compatibility).toContain('Deliverable acceptance is used only as a compatibility fallback');
  });

  test('public resource attribution prefers governed provider records without private governance leakage',()=>{
    const providerMigration=read('supabase/migrations/20260902121000_project_resource_providers.sql');
    const detail=read('lib/project-detail-content.ts');
    const compatibility=read('components/ProjectDecisionSections.tsx');

    expect(providerMigration).toContain('create table if not exists public.project_resource_providers');
    expect(providerMigration).toContain('provider_id uuid references public.project_resource_providers');
    expect(detail).toContain('provider:project_resource_providers(name,website_url,logo_asset_path)');
    expect(detail).toContain('providerName:text(provider?.name)||text(row.provider_name)');
    expect(compatibility).toContain('<strong>Provider:</strong>');
    expect(compatibility).toContain('<strong>Licence:</strong>');
    expect(compatibility).not.toContain('internalStorage');
    expect(compatibility).not.toContain('governance_verified_by');
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
