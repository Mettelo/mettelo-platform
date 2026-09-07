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

Phase 13 extends these paths instead of introducing `lab_chat` or another message table/API.

### Meetings

`project_meetings`, `/api/project-events`, the Lab Events panel and the existing public-event projection remain canonical. Phase 13 extends their edit/cancel and communication behavior rather than adding another meeting implementation.

The existing public projection is deliberately sanitised: only opted-in `community_learning` / `approval_required` learning or presentation events can project into `public.events`, and private provider/join/run/participant fields remain in `project_meetings`.

### Tasks

`/api/project-delivery` and `project_tasks` remain canonical. Phase 12 already hardened project/run relation integrity. Phase 13 reuses the existing assignment, milestone, evidence and blocker model.

### Notifications and email

`notifyUser()` resolves `notification_preferences` by `event_key` and independently honours `in_app_enabled` and `email_enabled`.

Phase 13 uses:

- `project_mention` for direct project mentions;
- `event_changed` for material project-event schedule/change/cancellation communication;
- the existing `task_assigned` contract for task assignment.

Migration `20260907084000_project_experience_phase_13_collaboration_privacy_preferences.sql` makes `project_mention` and `event_changed` active canonical catalogue entries so valid preference rows can be saved under the existing foreign-key contract. No second preference table or notification engine is introduced.

## Phase 13 implementation and hardening

### Chat categories and mentions

- Update / Question / Blocker / Decision are first-class composer choices.
- `@username` mentions resolve only to active members of the exact project/run.
- invalid, historical or cross-run mention targets are rejected server-side.
- edits notify only newly introduced valid mentions.
- completed project collaboration remains readable but mutation paths require active delivery authority.

### Event lifecycle communication

- schedule/edit/cancel/extend remain on the canonical project Events system;
- `event_changed` flows through `notifyUser()` and therefore the existing preference engine;
- notification dedupe remains event/user/action scoped;
- event-change notifications link to the governed My Events surface rather than embedding a direct provider/join URL.

### Restricted-event privacy

The Phase 13 sign-off review found two privacy gaps and corrected them in the same PR:

1. `named_members` event changes previously used an all-active-team notification helper. Phase 13 now derives recipients from event visibility. A `named_members` event notifies only canonical named participants (excluding the acting user); team/community events use their governed audience.
2. the inherited `project_meetings` SELECT policy treated every project member as an authorised reader regardless of event visibility. The Phase 13 migration replaces that read policy with the canonical `mettelo_can_access_project_event()` predicate. `named_members` rows are now limited to named participants plus organiser/Lead/Admin authority; team/community events retain governed member or confirmed-attendee access.

The public projection continues to delete/not publish `project_team` and `named_members` events, so this hardening does not create a second public-event path.

## Initial gaps confirmed and disposition

1. Chat composer defaulted every new message to Update. **Resolved:** all four Phase 13 categories are selectable first-class types.
2. Mention notification used the wrong preference key. **Resolved:** `project_mention` is used and is now an active catalogue event.
3. Mention validation accepted historical completed members. **Resolved:** mention targets must be active members of the exact project/run.
4. Meeting creation existed without complete edit/cancel proof. **Resolved in implementation:** canonical `/api/project-events` owns schedule/edit/cancel/extend.
5. Meeting change communication needed preference-aware regression coverage. **Resolved in implementation/static regression; exact-head CI and authenticated E2E still gate approval.**
6. Task assignment needed proof of canonical reuse. **Covered by Phase 13 regression against `project_tasks` / `/api/project-delivery` and existing `task_assigned` preference behavior.**
7. Completed-run historical access needed a read-only boundary. **Resolved in UI and backend collaboration/event mutation paths.**
8. Hosted notification catalogue lacked `project_mention` and had `event_changed` inactive. **Resolved by versioned Phase 13 migration; hosted application remains a release/deployment gate rather than an ad-hoc database edit.**
9. `named_members` events could leak through all-team notifications and inherited broad meeting-read RLS. **Resolved by audience-aware notification delivery and the Phase 13 RLS migration.**

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

Phase 13 remains **NOT APPROVED** until all 14 criteria, Supabase/RLS/database checks, migration validation, exact-head CI, authenticated collaboration E2E, mobile/accessibility audits and the stacked Phase 6→12 prerequisites are green.
