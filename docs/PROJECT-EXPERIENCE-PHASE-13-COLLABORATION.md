# Project Experience Phase 13 — Chat, Meetings, Tasks & Collaboration

Status: **IN PROGRESS — NOT APPROVED**

## Objective

Extend existing collaboration capabilities rather than replace them.

Phase 13 must not create a second Chat system, meeting/event system, task system, decision store, notification store or email queue. Existing Lab collaboration infrastructure remains canonical.

## Authoritative Phase 13 contract

### Chat

Support meaningful categories:

- Update
- Question
- Blocker
- Decision

### Mentions

- support `@username` identity where appropriate;
- validate mentioned user belongs to the active team/run;
- create in-app notification;
- send email only according to the existing communication preference matrix;
- do not email every Chat message.

### Meetings

Reuse existing project meeting/event infrastructure and support:

- schedule;
- edit;
- cancel;
- join;
- purpose;
- time;
- platform;
- attendance where already governed.

### Tasks

Reuse existing delivery tasks and support enough functionality for project delivery:

- title;
- owner;
- status;
- due date;
- milestone;
- evidence;
- blocker.

Do not turn Mettelo into an unnecessary Jira clone.

### Decisions

Important project decisions must remain discoverable in the existing collaboration experience.

### Email

- do not email every Chat message;
- meeting scheduling/change may generate transactional communication;
- task assignment email must use the existing preference-aware notification architecture.

## Canonical systems inspected at Phase 13 start

### Chat

`ProjectMessagePanel` and `/api/project-collaboration` are already the canonical project Chat implementation. They provide:

- run-scoped `project_discussions`;
- Update / Question / Blocker / Decision data types;
- edit/delete/pin/classify actions;
- project-item links;
- mention suggestions backed by canonical team identity;
- `@username` display where present;
- polling and accessible status/feed behavior.

Phase 13 will extend these paths instead of introducing `lab_chat` or another message table/API.

### Meetings

`/api/project-collaboration` already writes canonical `project_meetings` and the Lab already uses existing event/meeting surfaces. Initial audit confirms scheduling exists, but Phase 13 still needs complete edit/cancel lifecycle proof and transactional communication behavior.

### Tasks

`/api/project-delivery` and `project_tasks` remain canonical. Phase 12 already hardened project/run relation integrity. Phase 13 will extend only the collaboration requirements around assignment, evidence, blockers, notifications and usability.

### Notifications and email

`notifyUser()` already resolves `notification_preferences` by `event_key` and independently honours `in_app_enabled` and `email_enabled`. Phase 13 must route mention, meeting and task events through the correct event keys rather than bypassing that matrix.

## Initial gaps confirmed

1. Chat composer currently sends new messages as `update` by default; the four meaningful Phase 13 categories are not yet first-class at composition time.
2. Mention notification currently uses `type='project_mention'` but the wrong `eventKey='task_assigned'`; this can apply the wrong preference row.
3. Mention validation currently accepts active/completed memberships; active collaboration should not treat historical completed members as current mention targets.
4. Meeting creation exists, but edit/cancel lifecycle is not yet implemented in the inspected collaboration API.
5. Meeting change communication requires complete preference-aware regression coverage.
6. Task assignment already uses `notifyUser`, but Phase 13 must prove its event key/preference behavior and active-team assignment boundary end-to-end.
7. Completed-run historical access must remain read-only; collaboration mutation controls/API paths must not present completed membership as active delivery authority.

## Phase 13 success criteria

1. Existing Chat reused.
2. Existing meetings reused.
3. Existing tasks reused.
4. No duplicate systems.
5. Mentions work.
6. Username mention works.
7. Team-membership validation works.
8. Meeting communication works.
9. Task assignment works.
10. Communication preferences honoured.
11. Mobile works.
12. Accessibility passes.
13. Collaboration regression passes.
14. Docs updated.

## Release rule

Phase 13 remains **NOT APPROVED** until all 14 criteria, Supabase/RLS/database checks, exact-head CI, authenticated collaboration E2E, mobile/accessibility audits and the stacked Phase 6→12 prerequisites are green.
