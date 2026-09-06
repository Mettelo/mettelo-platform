import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const canonical=read('lib/project-lab-canonical-data.ts');
const brief=read('components/project-experience/ProjectLabCanonicalBrief.tsx');
const team=read('lib/project-team-overview.ts');
const panel=read('components/MetteloLabPanel.tsx');
const page=read('app/member/projects/[id]/page.tsx');
const gate=read('app/member/projects/[id]/layout.tsx');
const delivery=read('app/api/project-delivery/route.ts');
const labRls=read('supabase/migrations/20260906030000_project_experience_phase_12_lab_access_rls.sql');
const taskIntegrity=read('supabase/migrations/20260906030100_project_experience_phase_12_task_relation_integrity.sql');
const labAnalytics=read('supabase/migrations/20260906030200_project_experience_phase_12_lab_analytics.sql');
const packageJson=read('package.json');

const cases:[string,boolean][]=[
 ['Lab canonical projection requires active or completed membership',canonical.includes(".in('membership_status',['active','completed'])")],
 ['canonical project brief reads project-level resources only',canonical.includes(".is('project_run_id',null)")&&canonical.includes("project_data_sources")],
 ['canonical project brief reads project-level deliverables only',canonical.includes("project_deliverables")&&canonical.includes(".is('project_run_id',null)")],
 ['canonical timeline remains separate from live run milestones',canonical.includes("project_milestones")&&canonical.includes(".is('project_run_id',null)")&&brief.includes('Live run milestones are intentionally not substituted here.')],
 ['private working copy requires green governance and explicit storage permission',canonical.includes("governanceStatus==='green'")&&canonical.includes("row.internal_storage_policy==='permitted'")],
 ['Lab renders the canonical project brief rather than recreating it in the workspace page',panel.includes('<ProjectLabCanonicalBrief projectId={props.projectId}/>')&&!page.includes('CANONICAL PROJECT BRIEF')],
 ['team overview consumes canonical Phase 10 responsibility assignments',team.includes("from('project_member_responsibilities')")&&team.includes(".eq('assignment_status','active')")],
 ['team roster displays canonical responsibilities',panel.includes('Responsibilities · {responsibilityLabel}')],
 ['active Lab roster excludes pre-start waiting members while preserving completed-run history',panel.includes("member.status==='active'||(props.runStatus==='completed'&&member.status==='completed')")&&panel.includes('active members')],
 ['team roster preserves username, Project Lead role and participation state',panel.includes('@{member.username}')&&panel.includes("role==='project_lead'")&&panel.includes('Status · {humanise(member.status)}')],
 ['Lab overview exposes status, team, current milestone, next meeting, blockers and upcoming work',panel.includes('Project status')&&panel.includes('Current milestone')&&panel.includes('Next meeting')&&panel.includes('Blockers')&&panel.includes('Upcoming work')&&panel.includes("from('project_milestones')")&&panel.includes("from('project_tasks')")],
 ['workspace access denies non-active members and non-active delivery runs',gate.includes("['active','completed'].includes(membership.membership_status)")&&gate.includes("['active','review','completed'].includes(runStatus)")],
 ['database Lab access requires active or completed membership in the exact run',labRls.includes("pm.membership_status in ('active','completed')")&&labRls.includes('pm.project_run_id=p_run_id')&&labRls.includes("pr.status in ('active','review','completed')")],
 ['restrictive RLS protects discussions resources meetings tasks milestones responsibilities and data',labRls.includes('as restrictive')&&['project_discussions','project_resources','project_meetings','project_tasks','project_milestones','project_member_responsibilities','project_data_sources','project_data_source_versions','project_deliverables'].every(table=>labRls.includes(`public.${table}`))],
 ['task creation verifies milestone belongs to the same canonical project run',delivery.includes(".from('project_milestones').select('id').eq('id',milestoneId).eq('project_id',projectId).eq('project_run_id',runId)")&&delivery.includes('Task milestone must belong to this project team.')],
 ['database enforces task milestone and workstream run integrity',taskIntegrity.includes('TASK_MILESTONE_RUN_MISMATCH')&&taskIntegrity.includes('TASK_WORKSTREAM_RUN_MISMATCH')&&taskIntegrity.includes('project_task_phase12_relation_guard')],
 ['live milestones and tasks remain run scoped',page.includes("milestoneQuery=milestoneQuery.eq('project_run_id',runId)")&&page.includes("taskQuery=taskQuery.eq('project_run_id',runId)")],
 ['existing Lab navigation remains composed through the workspace shell',gate.includes('MetteloLabNavigation')&&gate.includes('placement="rail-primary"')&&gate.includes('placement="mobile"')],
 ['workspace keeps an accessible skip target and labelled Lab region',gate.includes('Skip to Mettelo Lab content')&&panel.includes('aria-labelledby="mettelo-lab-title"')],
 ['canonical brief exposes problem, context, use case, objectives, questions, scope and success criteria',brief.includes('Problem Statement')&&brief.includes('Business Context')&&brief.includes('Primary Use Case')&&brief.includes('Primary Objective')&&brief.includes('Key questions')&&brief.includes('In scope')&&brief.includes('Success criteria')],
 ['Lab open analytics reuses canonical activity log only after active-run authorization',labAnalytics.includes("phase12_has_lab_access(p_project_id,p_run_id)")&&labAnalytics.includes("insert into public.project_activity_log")&&labAnalytics.includes("'lab_opened'")&&gate.includes("supabase.rpc('phase12_record_lab_open'")],
 ['Lab analytics stores only aggregate surface metadata and no private content',labAnalytics.includes("jsonb_build_object('surface','mettelo_lab')")&&!labAnalytics.includes('resource_url')&&!labAnalytics.includes('chat')&&!labAnalytics.includes('task_description')&&!labAnalytics.includes('application')],
 ['Lab analytics is deduplicated rather than tracking every navigation click',labAnalytics.includes("now()-interval '5 minutes'")&&labAnalytics.includes("log.event_type='lab_opened'")],
 ['Phase 12 canonical Lab contract is part of the blocking regression suite',packageJson.includes('tests/project-experience-phase12-canonical-lab.spec.ts')],
 ['Phase 12 direct RLS E2E is part of authenticated smoke and staging gates',(packageJson.match(/tests\/project-experience-phase12-lab-access-e2e\.spec\.ts/g)||[]).length>=2]
];

for(const [label,ok] of cases){
 test(label,()=>expect(ok).toBeTruthy());
}
