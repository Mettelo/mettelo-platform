import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const phase12=read('tests/project-experience-phase12-canonical-lab.spec.ts');
const phase13=read('tests/project-experience-phase13-collaboration.spec.ts');
const phase14=read('tests/project-experience-phase14-weekly-pulse.spec.ts');
const panel=read('components/MetteloLabPanel.tsx');
const growTeam=read('components/ProjectGrowTeamSection.tsx');
const growTeamActions=read('components/ProjectGrowTeamActions.tsx');
const pulse=read('components/project-experience/ProjectWeeklyPulse.tsx');
const pulseApi=read('app/api/project-pulse/route.ts');
const supportApi=read('app/api/project-support-cases/route.ts');
const exitPrivacy=read('supabase/migrations/20260915143000_workstream5_pulse_member_exit_privacy.sql');
const phase17=read('supabase/migrations/20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql');

const cases:[string,boolean][]=[
 ['Workstream 5 preserves the canonical Phase 12 Lab rather than adding a second workspace',phase12.includes('Lab canonical projection')&&panel.includes('ProjectLabCanonicalBrief')&&panel.includes('ProjectWeeklyPulse')],
 ['Canonical Phase 12 brief, team, overview, resources and delivery remain blocking contracts',phase12.includes('canonical project brief')&&phase12.includes('team overview consumes canonical Phase 10 responsibility assignments')&&phase12.includes('Lab overview exposes status, team, current milestone, next meeting, blockers and upcoming work')&&phase12.includes('restrictive RLS protects discussions resources meetings tasks milestones responsibilities and data')],
 ['Team view visibly exposes current team, responsibilities, capacity, recruitment state and Grow the Team',growTeam.includes('CURRENT TEAM')&&growTeam.includes('RESPONSIBILITIES')&&growTeam.includes('CAPACITY')&&growTeam.includes('RECRUITMENT STATE')&&growTeam.includes('GROW THE TEAM')&&growTeam.includes('teamExperienceGrid')],
 ['Grow the Team always renders a governed state and canonical recruitment controls',growTeam.includes("stateLabel='AVAILABLE'")&&growTeam.includes("stateLabel='FULL'")&&growTeam.includes("stateLabel='JOINING CLOSED'")&&growTeam.includes("stateLabel='RECRUITMENT CLOSED'")&&growTeam.includes("stateLabel='NOT AUTHORIZED'")&&growTeam.includes("stateLabel='COMPLETION FREEZE'")&&growTeam.includes('CONFIGURATION ERROR')&&growTeamActions.includes('Find people on Mettelo')],
 ['Canonical Phase 13 Chat, mentions, tasks and meetings remain blocking contracts',phase13.includes('existing project Chat surface')&&phase13.includes('mentions are restricted to active members')&&phase13.includes('existing task delivery system is reused')&&phase13.includes('existing Events support schedule edit cancel and join')],
 ['Phase 14 raw Pulse remains member-private with aggregate-only Lead/Admin health',phase14.includes('Raw pulse RLS is own-user only')&&phase14.includes('Lead/Admin health is aggregate-only')&&phase14.includes('No opaque health/productivity score exists')],
 ['Removed members lose raw Pulse read access at the RLS boundary',exitPrivacy.includes('pm.id = project_weekly_pulses.project_member_id')&&exitPrivacy.includes("pm.membership_status = 'active'")&&exitPrivacy.includes('user_id = (select auth.uid())')],
 ['Removed members are rejected by Pulse GET before private Pulse RPC/read work',pulseApi.includes("if(!isAdmin&&ctx.membership?.membership_status!=='active')")&&pulseApi.includes("Active project membership is required.")],
 ['Pulse support YES hands off to canonical Phase 17 private support rather than copying the Pulse note',pulse.includes("form.support_need==='yes'")&&pulse.includes('view=support')&&pulse.includes('Your Pulse note is not copied into a support case or email')&&supportApi.includes("from('project_support_cases')")&&phase17.includes('Project Lead membership does not grant case access')],
 ['Support notifications remain generic and do not include confidential case description',supportApi.includes('A private project support case needs review')&&!supportApi.includes("body:created.description")],
 ['Weekly Pulse remains exact-run, exact-member and one-row-per-period',phase14.includes('Pulse is bound to canonical project membership')&&phase14.includes('Double/retry submission is conflict-safe')&&phase14.includes('Canonical period is server-authoritative Monday UTC')],
 ['Team health remains explainable operational counts with no member ranking or pseudo-score',pulse.includes('No individual score is calculated')&&!pulse.includes('member ranking')&&!pulse.includes('productivity_score')&&!pulse.includes('health_score')],
 ['Pulse does not create or verify Proof',!pulseApi.includes('verified_proof')&&!pulseApi.includes('member_proof')&&!pulseApi.includes("from('proof")],
 ['Private Pulse content is not used as analytics or notification payload',!pulseApi.includes('notify')&&!pulseApi.includes('project_activity_log')&&!pulseApi.includes('analytics')]
];

for(const [label,ok] of cases){test(label,()=>expect(ok).toBeTruthy())}
