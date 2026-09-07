import fs from 'node:fs';
import {expect,test} from '@playwright/test';
const read=(path:string)=>fs.readFileSync(path,'utf8');
const migration=read('supabase/migrations/20260907093000_project_experience_phase_14_weekly_pulse.sql');
const hardening=read('supabase/migrations/20260907101000_project_experience_phase_14_full_acceptance_hardening.sql');
const api=read('app/api/project-pulse/route.ts');const reminder=read('app/api/cron/project-pulse-reminders/route.ts');const ui=read('components/project-experience/ProjectWeeklyPulse.tsx');const lab=read('components/MetteloLabPanel.tsx');const adminHealth=read('components/AdminProjectPulseHealth.tsx');const adminPage=read('app/admin/project-governance/page.tsx');const vercel=read('vercel.json');const packageJson=read('package.json');
const healthReturn=hardening.match(/returns table \(([\s\S]*?)\)\nlanguage plpgsql/i)?.[1]||'';
const cases:[string,boolean][]=[
 ['Phase 14 creates one canonical weekly pulse table',migration.includes('create table if not exists public.project_weekly_pulses')&&migration.includes('project_weekly_pulses_one_per_week unique (project_run_id, user_id, period_start)')],
 ['Approved structured response states are constrained',migration.includes("progress in ('on_track','some_risk','blocked')")&&migration.includes("workload in ('manageable','heavy','unsustainable')")&&hardening.includes("team_state is null or team_state in ('working_well','some_friction','significant_concern')")&&migration.includes("support_need in ('no','maybe','yes')")],
 ['Canonical period is server-authoritative Monday UTC',migration.includes('project_weekly_pulses_monday_period')&&api.includes('function mondayUtc')&&api.includes("period_timezone:'UTC'")&&!api.includes('body.period_start')],
 ['Raw pulse RLS is own-user only',migration.includes('members read own weekly pulse')&&migration.includes('user_id = (select auth.uid())')],
 ['Only active exact project/run members can write',migration.includes("pm.project_id = project_weekly_pulses.project_id")&&migration.includes("pm.project_run_id = project_weekly_pulses.project_run_id")&&migration.includes("pm.membership_status = 'active'")],
 ['Project/run integrity is database-enforced',hardening.includes('Project pulse run does not belong to project')],
 ['Solo and Flexible-Solo omit team state through Phase 9 authority',hardening.includes("participation_mode = 'solo'")&&hardening.includes("participation_mode = 'flexible'")&&hardening.includes('member_count > 1')&&hardening.includes('new.team_state := null')&&ui.includes('Independent project check-in')],
 ['Lead/Admin health is aggregate-only',hardening.includes('project_weekly_pulse_health')&&hardening.includes('public.mettelo_is_run_lead(target_run)')&&Boolean(healthReturn)&&!healthReturn.includes('note')&&!healthReturn.includes('user_id')],
 ['Health has transparent human-readable states and reasons',hardening.includes("state:='needs_attention'")&&hardening.includes("'watch'")&&hardening.includes("'no_current_concern'")&&hardening.includes("'missing_checkins'")&&ui.includes('No individual score is calculated')],
 ['No opaque health/productivity score exists',![migration,hardening,api,ui,adminHealth].some(source=>source.includes('health_score')||source.includes('productivity_score')||source.includes('engagement_score'))],
 ['Blocked and support signals are canonical generated fields',hardening.includes('blocked boolean generated always as')&&hardening.includes('support_requested boolean generated always as')],
 ['Attention indexes cover blocker/support triage',hardening.includes('idx_project_weekly_pulses_blocked_attention')&&hardening.includes('idx_project_weekly_pulses_support_attention')],
 ['Expected submissions use canonical membership timestamps',hardening.includes('activated_at, pm.joined_at')&&hardening.includes("target_period + interval '7 days'")&&hardening.includes("left_at, pm.completed_at, 'infinity'::timestamptz")&&!hardening.includes('pm.started_at')&&!hardening.includes('pm.ended_at')],
 ['Reminder has dedicated preference event',migration.includes("'project_pulse_reminder'")&&migration.includes("'email_and_in_app'")],
 ['Reminder is authorized, bounded, deduped and rechecks submission before send',reminder.includes('process.env.CRON_SECRET')&&reminder.includes('if(day<4)')&&reminder.includes(".eq('period_start',periodStart).maybeSingle()")&&reminder.includes('if(existing)continue')&&reminder.includes("eventKey:'project_pulse_reminder'")&&reminder.includes('dedupeKey:`project-pulse:${run.id}:${periodStart}:${member.user_id}`')],
 ['Reminder reuses existing Vercel scheduler',vercel.includes('/api/cron/project-pulse-reminders')],
 ['Submission requires active membership and active run',api.includes("ctx.membership.membership_status!=='active'")&&api.includes("ctx.run.status!=='active'")],
 ['Double/retry submission is conflict-safe',api.includes("onConflict:'project_run_id,user_id,period_start'")],
 ['Private pulse responses are no-store and private note is not logged',api.includes("'Cache-Control':'private, no-store'")&&!api.includes('console.log(note)')&&!api.includes('console.error(note)')],
 ['Member UI asks direct approved questions',ui.includes('How is the project progressing?')&&ui.includes('How is your current project workload?')&&ui.includes('Do you need support?')&&ui.includes('Optional private note')],
 ['Success/error state is announced',ui.includes('role="status"')&&ui.includes('aria-live="polite"')&&ui.includes('Check-in submitted.')],
 ['Weekly pulse remains in canonical Mettelo Lab',lab.includes('ProjectWeeklyPulse')],
 ['Admin health remains canonical, aggregate and explainable',adminPage.includes('AdminProjectPulseHealth')&&adminHealth.includes('Project health triage')&&adminHealth.includes('NEEDS ATTENTION')&&adminHealth.includes("auth.rpc('project_weekly_pulse_health'")&&!adminHealth.includes("from('project_weekly_pulses')")],
 ['Responsive/accessibility structure remains protected',ui.includes('<fieldset')&&ui.includes('<legend>')&&read('components/project-experience/ProjectWeeklyPulse.module.css').includes('@media(max-width:760px)')],
 ['Phase 14 static contract is blocking',packageJson.includes('tests/project-experience-phase14-weekly-pulse.spec.ts')]
];
for(const [label,ok] of cases){test(label,()=>expect(ok).toBeTruthy())}
