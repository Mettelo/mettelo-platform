import fs from 'node:fs';
import {expect,test} from '@playwright/test';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260907093000_project_experience_phase_14_weekly_pulse.sql');
const api=read('app/api/project-pulse/route.ts');
const reminder=read('app/api/cron/project-pulse-reminders/route.ts');
const ui=read('components/project-experience/ProjectWeeklyPulse.tsx');
const lab=read('components/MetteloLabPanel.tsx');
const adminHealth=read('components/AdminProjectPulseHealth.tsx');
const adminPage=read('app/admin/project-governance/page.tsx');
const vercel=read('vercel.json');
const packageJson=read('package.json');
const healthReturn=migration.match(/returns table \(([\s\S]*?)\)\nlanguage plpgsql/i)?.[1]||'';

const cases:[string,boolean][]=[
 ['Phase 14 creates one canonical weekly pulse table',migration.includes('create table if not exists public.project_weekly_pulses')&&migration.includes('project_weekly_pulses_one_per_week unique (project_run_id, user_id, period_start)')],
 ['Pulse response values match the approved contract',migration.includes("progress in ('on_track','some_risk','blocked')")&&migration.includes("workload in ('manageable','heavy','unsustainable')")&&migration.includes("team_state in ('working_well','some_friction','significant_concern')")&&migration.includes("support_need in ('no','maybe','yes')")],
 ['Pulse periods are weekly Monday boundaries',migration.includes('project_weekly_pulses_monday_period')&&api.includes('function mondayUtc')],
 ['Raw pulse RLS is own-user only',migration.includes('members read own weekly pulse')&&migration.includes('user_id = (select auth.uid())')],
 ['Only active exact project/run members can submit or update',migration.includes("pm.project_id = project_weekly_pulses.project_id")&&migration.includes("pm.project_run_id = project_weekly_pulses.project_run_id")&&migration.includes("pm.membership_status = 'active'")],
 ['Project/run integrity is enforced in the database',migration.includes('mettelo_validate_project_pulse_run')&&migration.includes('Project pulse run does not belong to project')],
 ['Lead/Admin health is aggregate-only and excludes notes and identities',migration.includes('project_weekly_pulse_health')&&migration.includes('public.mettelo_is_run_lead(target_run)')&&Boolean(healthReturn)&&!healthReturn.includes('note')&&!healthReturn.includes('user_id')],
 ['No opaque project health score is created',!migration.includes('health_score')&&!api.includes('health_score')&&!ui.includes('health_score')&&!adminHealth.includes('health_score')],
 ['Reminder communication has a dedicated preference event',migration.includes("'project_pulse_reminder'")&&migration.includes("'email_and_in_app'")&&migration.includes('active = true')],
 ['Reminder is authorized, weekly-bounded and skips completed pulses',reminder.includes('process.env.CRON_SECRET')&&reminder.includes('if(day<4)')&&reminder.includes('submittedIds.has(member.user_id)')&&reminder.includes("eventKey:'project_pulse_reminder'")&&reminder.includes('dedupeKey:`project-pulse:${run.id}:${periodStart}:${member.user_id}`')],
 ['Reminder is scheduled through the existing Vercel cron system',vercel.includes('/api/cron/project-pulse-reminders')&&vercel.includes('30 10 * * *')],
 ['API derives the week server-side and does not trust a client period',api.includes('const periodStart=mondayUtc()')&&!api.includes('body.period_start')],
 ['API restricts submissions to active members on active runs',api.includes("ctx.membership.membership_status!=='active'")&&api.includes("ctx.run.status!=='active'")],
 ['Current-week responses are updatable rather than duplicated',api.includes("onConflict:'project_run_id,user_id,period_start'")],
 ['Lab UI uses the exact approved response language',ui.includes("'On track'")&&ui.includes("'Some risk'")&&ui.includes("'Blocked'")&&ui.includes("'Manageable'")&&ui.includes("'Unsustainable'")&&ui.includes("'Working well'")&&ui.includes("'Significant concern'")],
 ['UI explains privacy and avoids personal scoring',ui.includes('Your individual response is private.')&&ui.includes('not your note or a personal score')],
 ['Project Lead health uses explainable operational counts',ui.includes('Explainable weekly signals')&&ui.includes('Blocked')&&ui.includes('Support maybe / yes')],
 ['Weekly pulse is surfaced inside the canonical Mettelo Lab',lab.includes("import ProjectWeeklyPulse")&&lab.includes('<ProjectWeeklyPulse projectId={props.projectId} projectRunId={props.projectRunId}/>')],
 ['Admin health is surfaced in canonical Project Governance',adminPage.includes("import AdminProjectPulseHealth")&&adminPage.includes('<AdminProjectPulseHealth/>')&&adminHealth.includes('Team health signals')],
 ['Admin health surface remains aggregate-only',adminHealth.includes("auth.rpc('project_weekly_pulse_health'")&&adminHealth.includes('Individual responses, member identities and private notes are not shown here.')&&!adminHealth.includes("from('project_weekly_pulses')")],
 ['Pulse UI has accessible grouping and responsive styling contract',ui.includes('<fieldset')&&ui.includes('<legend>')&&ui.includes('role="status"')&&read('components/project-experience/ProjectWeeklyPulse.module.css').includes('@media(max-width:760px)')&&read('components/AdminProjectPulseHealth.module.css').includes('@media(max-width:640px)')],
 ['Phase 14 static contract is part of the blocking regression suite',packageJson.includes('tests/project-experience-phase14-weekly-pulse.spec.ts')]
];

for(const [label,ok] of cases){test(label,()=>expect(ok).toBeTruthy())}
