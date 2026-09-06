import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const canonical=read('lib/project-lab-canonical-data.ts');
const brief=read('components/project-experience/ProjectLabCanonicalBrief.tsx');
const team=read('lib/project-team-overview.ts');
const panel=read('components/MetteloLabPanel.tsx');
const page=read('app/member/projects/[id]/page.tsx');
const gate=read('app/member/projects/[id]/layout.tsx');

const cases:[string,boolean][]=[
 ['Lab canonical projection requires active or completed membership',canonical.includes(".in('membership_status',['active','completed'])")],
 ['canonical project brief reads project-level resources only',canonical.includes(".is('project_run_id',null)")&&canonical.includes("project_data_sources")],
 ['canonical project brief reads project-level deliverables only',canonical.includes("project_deliverables")&&canonical.includes(".is('project_run_id',null)")],
 ['canonical timeline remains separate from live run milestones',canonical.includes("project_milestones")&&canonical.includes(".is('project_run_id',null)")&&brief.includes('Live run milestones are intentionally not substituted here.')],
 ['private working copy requires green governance and explicit storage permission',canonical.includes("governanceStatus==='green'")&&canonical.includes("row.internal_storage_policy==='permitted'")],
 ['Lab renders the canonical project brief rather than recreating it in the workspace page',panel.includes('<ProjectLabCanonicalBrief projectId={props.projectId}/>')&&!page.includes('CANONICAL PROJECT BRIEF')],
 ['team overview consumes canonical Phase 10 responsibility assignments',team.includes("from('project_member_responsibilities')")&&team.includes(".eq('assignment_status','active')")],
 ['team roster displays canonical responsibilities',panel.includes('Responsibilities · {responsibilityLabel}')],
 ['team roster preserves username, Project Lead role and participation state',panel.includes('@{member.username}')&&panel.includes("role==='project_lead'")&&panel.includes('Status · {humanise(member.status)}')],
 ['workspace access denies non-active members and non-active delivery runs',gate.includes("['active','completed'].includes(membership.membership_status)")&&gate.includes("['active','review','completed'].includes(runStatus)")],
 ['live milestones and tasks remain run scoped',page.includes("milestoneQuery=milestoneQuery.eq('project_run_id',runId)")&&page.includes("taskQuery=taskQuery.eq('project_run_id',runId)")],
 ['existing Lab navigation remains composed through the workspace shell',gate.includes('MetteloLabNavigation')&&gate.includes('placement="rail-primary"')&&gate.includes('placement="mobile"')],
 ['workspace keeps an accessible skip target and labelled Lab region',gate.includes('Skip to Mettelo Lab content')&&panel.includes('aria-labelledby="mettelo-lab-title"')],
 ['canonical brief exposes problem, context, use case, objectives, questions, scope and success criteria',brief.includes('Problem Statement')&&brief.includes('Business Context')&&brief.includes('Primary Use Case')&&brief.includes('Primary Objective')&&brief.includes('Key questions')&&brief.includes('In scope')&&brief.includes('Success criteria')]
];

for(const [label,ok] of cases){
 test(label,()=>expect(ok).toBeTruthy());
}
