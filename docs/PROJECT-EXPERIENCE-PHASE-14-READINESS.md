# Project Experience Phase 14 — Weekly Project Pulse & Team Health

**Status:** IN PROGRESS / NOT APPROVED

## Dependency

Phase 14 is intentionally stacked on Project Experience Phase 13 / PR #222 and began from Phase 13 exact head:

`e286921f71f578ba267f69e6b7ee6e74caf1c1cf`

Phase 13 remains a separate draft dependency. Phase 14 must not be merged ahead of the approved dependency chain.

## Authoritative Phase 14 contract

Recovered from the approved Project Experience Master Implementation & Change Management Playbook.

Phase 14 introduces a **Weekly Project Pulse & Team Health** capability whose purpose is to identify struggling projects early without turning Mettelo into a surveillance system or creating pseudo-scientific health scores.

Each active member can submit one current-week pulse for the exact project/run, using only these approved response sets:

- Progress: **On track / Some risk / Blocked**
- Workload: **Manageable / Heavy / Unsustainable**
- Team state: **Working well / Some friction / Significant concern**
- Support need: **No / Maybe / Yes**
- Optional private note

The pulse is tied to member, project, project run and weekly period. The current-week row is updatable so a member can reflect a material change without generating duplicate submissions.

## Privacy and product principles

- Individual raw responses are private by default.
- Members can read and write only their own raw pulse.
- Project Leads and Admins receive explainable operational aggregate counts, not member-level notes or an opaque score.
- Optional notes are excluded from aggregate health output.
- No sentiment inference, productivity monitoring, behavioural surveillance or hidden scoring is introduced.
- Weekly reminders must be bounded and use the existing notification preference engine.

## Canonical architecture preserved

Phase 14 extends rather than replaces:

- `projects`
- `project_runs`
- `project_members`
- Supabase Auth identity
- existing project/run Lead authority helpers
- Mettelo Lab
- Admin Project Governance
- canonical notification catalogue/preferences/in-app/email delivery
- existing cron authorization pattern
- existing Phase 13 collaboration and Events systems
- existing Proof/completion architecture

No duplicate chat, meeting, task, notification, lifecycle, member or project system is introduced.

## Implementation in this PR

### Supabase / PostgreSQL

Migration:

`supabase/migrations/20260907093000_project_experience_phase_14_weekly_pulse.sql`

Adds:

- `project_weekly_pulses`
- FK relationships to project, run and auth user
- exact approved value constraints
- Monday weekly-period constraint
- unique `(project_run_id, user_id, period_start)` frequency rule
- project/run consistency trigger
- indexes for project/run/period and user/period access
- RLS enabled
- own-user SELECT policy
- active exact project/run member INSERT/UPDATE policies
- controlled `project_weekly_pulse_health(project, run, period)` RPC for Project Lead/Admin aggregate counts
- active `project_pulse_reminder` notification-preference catalogue event

The health RPC returns only operational counts such as submissions, blocked members, heavy/unsustainable workload signals, team friction/concern and support-request counts. It returns neither identities nor note content and creates no health score.

### API

`app/api/project-pulse/route.ts`

- server derives the current Monday period; clients cannot choose an arbitrary pulse period;
- GET returns the authenticated member's own current-week pulse;
- Project Lead/Admin health is resolved through the aggregate RPC;
- POST requires exact active project/run membership and an active run;
- responses are validated against the approved Phase 14 values;
- current-week submission uses conflict-safe upsert rather than duplicate rows.

### Mettelo Lab

`components/project-experience/ProjectWeeklyPulse.tsx`

`components/project-experience/ProjectWeeklyPulse.module.css`

The canonical Mettelo Lab now surfaces the pulse for project runs. The UI:

- uses the exact approved response language;
- explains the privacy boundary;
- supports update-in-week behaviour;
- uses fieldset/legend radio groups and a status region;
- has a single-column mobile layout;
- gives Project Leads explainable aggregate health counts without exposing raw teammate rows.

### Admin Project Governance

`components/AdminProjectPulseHealth.tsx`

`components/AdminProjectPulseHealth.module.css`

`app/admin/project-governance/page.tsx`

The existing Admin governance page now contains an explicit Phase 14 team-health surface for active project runs. It calls the same controlled aggregate RPC with the authenticated Admin session and shows only:

- submitted / active-member counts;
- missing check-ins;
- blocked count;
- heavy / unsustainable workload count;
- team friction / significant-concern count;
- support maybe / yes count.

The Admin surface does not query raw `project_weekly_pulses`, does not expose member identities or notes, and does not create a health score.

### Bounded reminders

`app/api/cron/project-pulse-reminders/route.ts`

`vercel.json`

- uses the existing `CRON_SECRET` authorization pattern;
- considers only active project runs and active exact-run members;
- starts reminder eligibility on Thursday;
- skips members who already submitted for the current week;
- uses canonical `notifyUser()` with `eventKey: 'project_pulse_reminder'`;
- uses a stable per-run/per-week/per-user dedupe key, making reminder delivery bounded to one notification event per weekly period even though the cron is scheduled daily;
- therefore independently honours the member's existing in-app/email notification preference settings.

### Authenticated RLS / authority coverage

`tests/project-experience-phase14-weekly-pulse-e2e.spec.ts`

The Phase 14 authenticated test is wired into both smoke and staging. It verifies against isolated Supabase that:

- an active member can submit and update one current-week pulse;
- the member can read their own raw pulse;
- another authenticated Project Lead cannot read that member's raw row;
- the Project Lead can read aggregate health;
- a non-member cannot submit and cannot call the health RPC;
- Admin can read aggregate health;
- Lead/Admin aggregate output contains no note, user identity or health score.

### Blocking regression contract

`tests/project-experience-phase14-weekly-pulse.spec.ts`

The Phase 14 static contract is included in `npm run test:regression` and protects:

- schema/value constraints;
- weekly frequency;
- own-row privacy;
- exact active membership authority;
- aggregate-only Project Lead/Admin health;
- no score architecture;
- preference-event registration;
- bounded reminder authorization, Thursday eligibility, submitted-member skip and weekly dedupe;
- Vercel reminder scheduling;
- server-derived period;
- active-run submission boundary;
- updatable current-week response;
- approved UI wording;
- privacy explanation;
- canonical Mettelo Lab integration;
- canonical Admin Project Governance integration;
- responsive/accessibility structure.

## Phase 14 success criteria status

1. Weekly pulse model exists — **IMPLEMENTED / EXACT-HEAD CI PENDING**
2. Exact approved response options — **IMPLEMENTED / EXACT-HEAD CI PENDING**
3. Member/project/run/period ownership — **IMPLEMENTED / EXACT-HEAD CI PENDING**
4. Frequency rule — **IMPLEMENTED / EXACT-HEAD CI PENDING**
5. Member can submit own pulse — **IMPLEMENTED / AUTHENTICATED E2E WIRED / EXACT-HEAD RESULT PENDING**
6. Member can update own current-week pulse — **IMPLEMENTED / AUTHENTICATED E2E WIRED / EXACT-HEAD RESULT PENDING**
7. Raw pulse is private by default — **IMPLEMENTED / RLS E2E WIRED / EXACT-HEAD RESULT PENDING**
8. Project Lead receives appropriate health view — **IMPLEMENTED AS AGGREGATES / E2E WIRED / EXACT-HEAD RESULT PENDING**
9. Admin receives appropriate health view — **IMPLEMENTED IN ADMIN PROJECT GOVERNANCE / E2E AUTHORITY WIRED / EXACT-HEAD RESULT PENDING**
10. No surveillance/pseudo-scientific score — **IMPLEMENTED / BLOCKING REGRESSION WIRED / EXACT-HEAD RESULT PENDING**
11. Reminder behaviour is bounded — **IMPLEMENTED / BLOCKING REGRESSION WIRED / EXACT-HEAD RESULT PENDING**
12. Communication preferences honoured — **IMPLEMENTED THROUGH CANONICAL `notifyUser()` / EXACT-HEAD RESULT PENDING**
13. Mobile/tablet/desktop quality — **RESPONSIVE IMPLEMENTATION PRESENT / VISUAL QA PENDING**
14. Accessibility passes — **SEMANTIC IMPLEMENTATION PRESENT / AUDIT PENDING**
15. Collaboration/team-health regression passes — **TESTS WIRED / EXACT-HEAD CI PENDING**

## Mandatory sign-off still outstanding

Phase 14 remains **NOT APPROVED** until the current exact head has all required evidence green, including:

- lint
- typecheck
- build
- blocking regression
- authenticated Phase 14 member/Project Lead/Admin/RLS E2E
- isolated Supabase migration reconstruction
- responsive visual QA
- accessibility audit
- existing Mettelo Lab regression
- existing Phase 13 collaboration regression
- Event Room contract
- protected Release Gate
- dependency-chain safety

No hosted-only database DDL has been used as the implementation source of truth.
