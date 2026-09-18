import {expect,test} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

test.describe('Workstream 10 visible product recovery contract',()=>{
  test('Member Discover isolates capacity failures instead of hiding the catalogue',()=>{
    const page=read('app/member/discover/page.tsx');
    for(const text of [
      'member Discover canonical capacity batch failed; isolating projects',
      'for(const projectId of batchIds)',
      'capacityKnown:Boolean(capacity)',
      "capacity?.recruitment_state||'capacity unknown'",
      'capacitySystemError',
      'No currently eligible projects'
    ])expect(page).toContain(text);
    expect(page).not.toContain('capacityLoadError=capacityLoadError||projects.some');
    expect(page).not.toContain('if(!capacity)return[]');
  });

  test('Admin Project Applications uses the application admission decision as the canonical lane',()=>{
    const page=read('app/admin/project-operations/applications/page.tsx');
    expect(page).toContain("row.admission_decision==='auto_qualified'?'auto':row.admission_decision==='review_required'?'review_required':effective");
    expect(page).toContain('items=mapped.map(item=>item.queue)');
    expect(page).toContain("item.canonicalLane==='auto'");
    expect(page).toContain("item.admission_lane==='review_required'");
    expect(page).toContain('Project applications');
    expect(page).toContain('Admin / Recruiting / Project Applications');
  });

  test('Admin navigation separates application admission from active project operations',()=>{
    const shell=read('components/AdminShell.tsx');
    expect(shell).toContain("label:'Project applications',href:'/admin/project-operations/applications'");
    expect(shell).toContain("label:'Active project operations',href:'/admin/project-operations/projects'");
    expect(shell).toContain("['Admin','Recruiting','Project Applications']");
    expect(shell).toContain("['Admin','Projects','Active Project Operations']");
  });

  test('Member Applications makes action states explicit and responsive',()=>{
    const tracker=read('components/MemberApplicationTracker.tsx');
    const page=read('app/member/applications/page.tsx');
    for(const text of [
      "const actionStates=new Set(['clarification_requested','action_required','needs_changes','offered'])",
      'role="tablist"',
      'role="tabpanel"',
      'Needs action',
      'Action required: review your project offer',
      'Action required: send the requested clarification',
      'href="#member-project-offers-title"',
      'href="#clarification-title"',
      '.mmaNeedsAction',
      '@media(max-width:480px)'
    ])expect(tracker).toContain(text);
    expect(page).toContain('what stage it is in, whether you need to act, and what happens next');
    expect(page).not.toContain('MemberPhase6AdmissionSummary');
  });

  test('Lab Grow Team uses the resolved member run instead of a stale page run',()=>{
    const lab=read('components/MetteloLabPanel.tsx');
    const grow=read('components/ProjectGrowTeamSection.tsx');
    expect(lab).toContain('const canonicalRunId=current?.id||props.projectRunId');
    expect(lab).toContain('projectRunId={canonicalRunId}');
    for(const state of ['AVAILABLE','FULL','JOINING CLOSED','RECRUITMENT CLOSED','NOT AUTHORIZED','COMPLETION FREEZE','CONFIGURATION ERROR'])expect(grow).toContain(state);
    expect(grow).toContain("db.from('project_runs')");
    expect(grow).toContain("db.rpc('phase9_project_run_capacity'");
  });
});
