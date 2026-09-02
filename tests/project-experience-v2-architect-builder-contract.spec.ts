import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 Project Architect builder contract',()=>{
  test('new project authoring exposes the ten canonical Project Experience steps',()=>{
    const form=read('components/ArchitectProjectForm.tsx');
    for(const label of ['Project basics','Problem & context','Data & resources','Deliverables & success','Skills & Proof','Roles & team','Timeline','Application settings','Lab preview','Review & publish readiness'])expect(form).toContain(label);
    expect(form).toContain('problem_primary_use_case');
    expect(form).toContain('problem_primary_objective');
    expect(form).toContain('problem_supporting_objectives');
    expect(form).toContain('problem_key_questions');
    expect(form).toContain('problem_in_scope');
    expect(form).toContain('problem_out_of_scope');
    expect(form).toContain('resources:resources.filter');
    expect(form).toContain('deliverables:deliverables.filter');
    expect(form).toContain('success_criteria:criteria.filter');
    expect(form).toContain('milestones:milestones.filter');
    expect(form).toContain('capabilities:Object.entries(capabilityChoices)');
    expect(form).toContain('roles:roles.filter');
  });

  test('builder selects governed providers and capabilities instead of creating registry records',()=>{
    const page=read('app/member/architect-projects/new/page.tsx');
    const form=read('components/ArchitectProjectForm.tsx');
    const api=read('app/api/architect-projects/route.ts');
    expect(page).toContain("from('project_resource_providers')");
    expect(page).toContain("from('capabilities')");
    expect(page).toContain(".eq('is_active',true)");
    expect(page).toContain('<ArchitectProjectForm providers={providers||[]} capabilities={capabilities||[]}');
    expect(form).toContain('type Props={providers:Provider[];capabilities:Capability[]}');
    expect(form).toContain('providers.map(provider=>');
    expect(form).toContain('capabilities.map(capability=>');
    expect(api).toContain("db.from('project_resource_providers').select('id').in('id',providerIds).eq('is_active',true)");
    expect(api).not.toContain("db.from('project_resource_providers').insert");
  });

  test('creation remains private and cannot bypass independent review or resource governance',()=>{
    const form=read('components/ArchitectProjectForm.tsx');
    const api=read('app/api/architect-projects/route.ts');
    expect(form).toContain('Create governed private draft');
    expect(form).toContain('No direct publish/open-recruitment switch is provided here.');
    expect(api).toContain("status:'draft',visibility:'private'");
    expect(api).toContain("governance_status:'draft'");
    expect(api).toContain("publish_policy:'not_permitted'");
    expect(api).toContain("governance_status:'unreviewed'");
    expect(api).toContain("if(action==='submit')");
    expect(api).toContain('You cannot review your own project.');
  });

  test('architect hub surfaces differentiated canonical readiness',()=>{
    const page=read('app/member/architect-projects/page.tsx');
    const overview=read('components/ArchitectProjectReadinessOverview.tsx');
    const readiness=read('supabase/migrations/20260902121500_project_experience_readiness_v2.sql');
    expect(page).toContain('ArchitectProjectReadinessOverview');
    expect(overview).toContain("from('project_experience_readiness')");
    for(const field of ['publication_ready','application_ready','resource_governance_ready','lab_ready']){
      expect(overview).toContain(field);
      expect(readiness).toContain(field);
    }
    expect(readiness).toContain("m.project_run_id is null");
  });
});
