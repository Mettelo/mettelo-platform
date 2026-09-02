import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
function read(relative:string){return fs.readFileSync(path.join(root,relative),'utf8')}

test.describe('Project Experience V2 Lab canonical contract',()=>{
  test('Lab canonical data requires accepted membership before service-role projection',()=>{
    const loader=read('lib/project-lab-canonical-data.ts');
    expect(loader).toContain("createServerSupabaseClient");
    expect(loader).toContain(".in('membership_status',['active','completed'])");
    expect(loader).toContain('if(!membership)return null');
    expect(loader.indexOf('if(!membership)return null')).toBeLessThan(loader.indexOf('const db=serviceDb()'));
    expect(loader).toContain("internal_storage_url");
  });

  test('private working-copy links require both accepted membership and green storage governance',()=>{
    const loader=read('lib/project-lab-canonical-data.ts');
    expect(loader).toContain('governance_status,internal_storage_policy,internal_storage_url');
    expect(loader).toContain("governanceStatus==='green'&&row.internal_storage_policy==='permitted'");
    expect(loader).toContain('internalStorageUrl:storagePermitted?text(row.internal_storage_url):null');
  });

  test('canonical Lab definitions exclude all run-scoped execution rows',()=>{
    const loader=read('lib/project-lab-canonical-data.ts');
    expect(loader).toContain("db.from('project_data_sources')");
    expect(loader).toContain("db.from('project_deliverables')");
    expect(loader).toContain("db.from('project_milestones')");
    expect(loader.match(/\.is\('project_run_id',null\)/g)?.length||0).toBeGreaterThanOrEqual(3);
    expect(loader).not.toContain("db.from('project_tasks')");
    expect(loader).not.toContain("db.from('project_discussions')");
  });

  test('Mettelo Lab surfaces the canonical Project Brief without replacing existing execution workspace',()=>{
    const panel=read('components/MetteloLabPanel.tsx');
    const route=read('app/member/projects/[id]/page.tsx');
    const brief=read('components/project-experience/ProjectLabCanonicalBrief.tsx');

    expect(panel).toContain("ProjectLabCanonicalBrief");
    expect(panel).toContain('<ProjectLabCanonicalBrief projectId={props.projectId}/>');
    expect(route).toContain('DataNativeWorkspace');
    expect(route).toContain('TaskStatusControl');
    expect(route).toContain('ProjectCollaborationPanel');
    expect(brief).toContain('CANONICAL PROJECT BRIEF');
    expect(brief).toContain('Live tasks, workstreams and delivery status remain separate execution records');
    expect(brief).toContain('Open approved working copy');
    expect(brief).toContain('Run-specific deliverable status is tracked separately in the workspace.');
    expect(brief).toContain('Live run milestones are intentionally not substituted here.');
    expect(brief).toContain('Participation or a listed skill does not automatically become Mettelo Proof.');
  });
});
