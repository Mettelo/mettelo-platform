# Project Experience Phase 14 — Weekly Project Pulse & Team Health

**Status:** DIRECTOR REVIEW IN PROGRESS / NOT APPROVED

## Dependency

Phase 14 is intentionally stacked on Project Experience Phase 13 / PR #222 and began from Phase 13 exact head:

`e286921f71f578ba267f69e6b7ee6e74caf1c1cf`

Phase 13 remains a separate draft dependency. Phase 14 must not be merged ahead of the approved dependency chain.

## Authoritative Phase 14 contract

Phase 14 introduces a **Weekly Project Pulse & Team Health** capability whose purpose is to identify struggling projects early without turning Mettelo into a surveillance system or creating pseudo-scientific health scores.

Each eligible active member can submit one current-week pulse for the exact canonical member/project/run, using only these approved response sets:

- Progress: **On track / Some risk / Blocked**
- Workload: **Manageable / Heavy / Unsustainable**
- Team state where collaboration applies: **Working well / Some friction / Significant concern**
- Support need: **No / Maybe / Yes**
- Optional private note

The Pulse is tied to the exact `project_members.id`, project, project run, authenticated user and UTC weekly period. The current-week row is updatable so a member can reflect a material change without generating duplicate submissions.

## Privacy and product principles

- Individual raw responses are private by default.
- Members can read and write only their own raw Pulse.
- Project Leads and Admins receive explainable operational aggregate counts and reasons, not member-level notes or an opaque score.
- Optional notes are excluded from aggregate health output, URLs, analytics and server logging.
- No sentiment inference, productivity monitoring, behavioural surveillance, message-count scoring, task-count scoring, meeting-attendance scoring or hidden ranking is introduced.
- Weekly reminders are bounded and use the existing notification preference engine.
- Solo and Flexible-Solo periods do not require a fake team-state answer.

## Canonical architecture preserved

Phase 14 extends rather than replaces:

- `projects`
- `project_runs`
- `project_members`
- Supabase Auth identity
- Phase 9 Team / Solo / Flexible participation authority
- existing project/run Lead authority helpers
- Mettelo Lab
- Admin Project Governance
- canonical notification catalogue/preferences/in-app/email delivery
- existing cron authorization pattern
- existing Phase 13 collaboration and Events systems
- existing Proof/completion architecture

No duplicate Chat, meeting, task, notification, lifecycle, member, participation or project system is introduced.

## Repository migrations

1. `supabase/migrations/20260907093000_project_experience_phase_14_weekly_pulse.sql`
2. `supabase/migrations/20260907101000_project_experience_phase_14_full_acceptance_hardening.sql`

No hosted-only Phase 14 DDL is the source of truth.

### Canonical Pulse schema

`project_weekly_pulses` includes:

- `id`
- `project_member_id` FK → `project_members(id)`
- `project_id` FK → `projects(id)`
- `project_run_id` FK → `project_runs(id)`
- `user_id` FK → `auth.users(id)`
- `period_start`
- structured progress/workload/team/support states
- optional private note
- generated `blocked`
- generated `support_requested`
- submitted/updated timestamps

Database integrity validates that `project_member_id`, `project_id`, `project_run_id` and `user_id` all describe the same canonical membership. RLS additionally requires the exact membership row to be active for writes.

Unique constraints protect both one Pulse per canonical membership/period and one Pulse per user/run/period.

Indexes cover project/run/period, canonical member/period, user/period, blocker attention and support-request attention.

## Director-review defects found and fixed

### 1. Non-canonical membership timestamp references

The first full acceptance hardening referenced nonexistent `project_members.started_at` / `ended_at` columns.

The canonical membership model uses:

- `joined_at`
- `activated_at`
- `left_at`
- `completed_at`

The migration now uses `coalesce(activated_at, joined_at)` for period entry and `coalesce(left_at, completed_at)` for period departure. A blocking static regression forbids the stale timestamp names.

### 2. Missing canonical member FK

The initial Pulse schema linked user/project/run but did not link the exact canonical `project_members` row. This was insufficient for the required member → project → run → period integrity contract.

Fixed by adding `project_member_id`, exact-member FK/uniqueness, trigger validation, RLS validation and API wiring through the authenticated membership row returned by the canonical project-members service.

### 3. Team-applicability helper disclosure

`project_pulse_team_applicable()` originally exposed its boolean result to any authenticated caller for an arbitrary run.

It is now purpose-limited to:

- service role;
- authorized Admin;
- exact Project Lead;
- exact active run member.

The E2E suite now explicitly checks that an unrelated authenticated user cannot call it.

### 4. Stale member E2E copy

The Phase 14 E2E still expected the retired heading “How is the project feeling this week?”. It now asserts the accepted supportive copy “How is the project going this week?”.

## API

`app/api/project-pulse/route.ts`

- server derives the current Monday UTC period; clients cannot choose an arbitrary period;
- canonical membership lookup returns the exact `project_members.id`;
- GET returns only the authenticated member's own current-week raw Pulse;
- Project Lead/Admin health is resolved through the aggregate RPC;
- POST requires exact active member/project/run membership and an active run;
- structured values are validated server-side;
- current-week submission uses conflict-safe upsert;
- each write includes the exact canonical `project_member_id`;
- responses use `Cache-Control: private, no-store`.

No service-role write is used to bypass Pulse RLS. The server service client is used only to resolve canonical membership/run context and scheduled notification recipients; the member Pulse write itself executes with the authenticated user's Supabase session and is subject to RLS.

## Solo / Flexible / Team adaptation

`project_pulse_team_applicable()` reuses Phase 9 participation authority plus period-valid canonical membership:

- Solo → no team question;
- Flexible with one applicable member → no team question;
- Flexible with more than one applicable member → team question applies;
- Team → team question applies.

Historical periods use membership timing rather than current membership status, so late joiners and departed members do not rewrite past expected counts.

## Explainable health model

`project_weekly_pulse_health(project, run, period)` is limited to Project Lead/Admin authority and returns aggregate counts plus:

- `no_current_concern`
- `watch`
- `needs_attention`
- structured reasons such as blocked, unsustainable workload, support requested, team concern, softer risk and missing check-ins.

It does not return raw note content, member identity or a numerical health score.

## Mettelo Lab

`components/project-experience/ProjectWeeklyPulse.tsx`

`components/project-experience/ProjectWeeklyPulse.module.css`

The canonical Mettelo Lab surfaces the current Pulse. The UI:

- asks the approved direct questions;
- explains privacy;
- adapts Solo/Flexible-Solo without a nonsensical team question;
- supports current-period update behavior;
- uses fieldset/legend radio groups;
- exposes loading, closed, saving and success/error states;
- announces submission status through an ARIA live region;
- uses visible text rather than color-only health states;
- collapses option and health grids to one column on narrow screens.

## Admin Project Governance

`components/AdminProjectPulseHealth.tsx`

`components/AdminProjectPulseHealth.module.css`

`app/admin/project-governance/page.tsx`

The existing Admin governance page consumes the same aggregate RPC and displays project/run/current period, health state, reasons, submitted/expected, missing, blocker, workload, team concern and support counts. It does not query raw Pulse rows.

## Bounded reminders and preferences

`app/api/cron/project-pulse-reminders/route.ts`

`vercel.json`

- existing `CRON_SECRET` pattern;
- active runs and active exact-run members only;
- eligibility begins Thursday;
- exact current-period submission is rechecked immediately before delivery;
- canonical `notifyUser()` uses `eventKey: 'project_pulse_reminder'`;
- stable run/week/user dedupe key;
- notification preferences control in-app and email independently;
- no note or sensitive answer is placed in notification/email content.

## Authenticated RLS / authority coverage

`tests/project-experience-phase14-weekly-pulse-e2e.spec.ts`

The isolated-Supabase E2E covers:

- active member submit/update;
- exact `project_member_id` persistence;
- own-row RLS;
- raw-row isolation from Project Lead;
- aggregate Lead health;
- outsider attempt to spoof another member's `project_member_id`;
- outsider denial for team-applicability helper;
- outsider denial for health RPC;
- Admin aggregate health;
- no note/user/member identity/health score in aggregate output;
- Admin Project Governance health surface.

## Blocking regression contract

`tests/project-experience-phase14-weekly-pulse.spec.ts`

Blocking regression protects schema/value constraints, canonical member FK, member/project/run consistency, weekly UTC frequency, own-row privacy, active exact-member authority, helper authorization, Solo/Flexible adaptation, explainable health, no score architecture, canonical membership timestamps, attention indexes, notification preference registration, bounded/deduped reminders, server-derived period, active-run submission boundary, RLS-safe upsert, private no-store response handling, accepted UI copy, Mettelo Lab/Admin integration and accessibility structure.

## Related product surfaces reviewed

- Public project catalogue/detail: no Pulse data is exposed; no Phase 14 public UI change required.
- Member Discover: remains recruitment/discovery; no Pulse entry belongs there.
- Mettelo Lab: canonical member Pulse entry is integrated here.
- Admin Project Governance: canonical operational aggregate view integrated here.
- Phase 13 Chat/Meetings/Tasks: retained as collaboration systems and deliberately not used as productivity/engagement scoring inputs.
- Proof/completion: no Pulse answer is promoted into Proof and completed runs stop normal Pulse submission/reminders.

## Mandatory sign-off still outstanding

Phase 14 remains **NOT APPROVED** until the latest exact head has all required evidence green, including:

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

Any commit after green evidence invalidates the previous exact-head sign-off evidence.
