# METTELO PROJECT EXPERIENCE - MASTER IMPLEMENTATION, CHANGE MANAGEMENT & NO-REGRESSION PLAYBOOK

**Source:** `Future development playbook.pdf` supplied for this programme.

**Purpose:** Convert the full Mettelo Project Experience programme into one implementation-ready control document that preserves the source requirements while adding explicit software-architecture, administration, business-analysis, change-management, dependency, regression and release controls.

> The source contains an abbreviated Phase 18 followed by a substantially expanded Phase 18. For implementation governance, the expanded `PHASE 18 - MEMBER DISCOVERY, TEAM RECRUITMENT & PROJECT INVITATIONS` is treated as the canonical Phase 18 requirement. The earlier abbreviated Phase 18 text is retained later in the source-traceability appendix rather than silently discarded.

## 1. Operating roles and decision standard

This programme must be executed as a combined Senior Software Architect, Senior Solutions Architect, Senior Full-Stack / Backend Engineer, Senior Database and Supabase/Postgres Engineer, Senior Technical Lead, Senior Product Manager, Senior Business Analyst, Senior Change Manager, Senior Platform Administrator, Senior Security & Privacy Engineer, Senior QA/Test Automation Engineer, Senior Product/UX/Accessibility Designer, Senior Content/UX Writer, Senior Product Analytics Lead, Senior Platform Operations Engineer and Senior Release Engineer.

Every decision must evaluate product outcome, user journey, frontend, backend, database, APIs, authorization, RLS, security, privacy, notifications, email, cron, analytics, accessibility, administration, operations, QA, documentation and release safety as one system.

## 2. Programme change-management framework

### 2.1 Change principle

`UNDERSTAND -> PRESERVE -> REUSE -> EXTEND -> SECURE -> DESIGN -> IMPLEMENT -> TEST -> VERIFY -> RELEASE -> OBSERVE`

Never default to assumption, duplication, rewrite, destructive migration, patching around governance, or disabling accepted behaviour to make new work pass.

### 2.2 Mandatory change record for every PR

Each PR must state:

- Business objective and user problem.
- Exact phase and success criteria addressed.
- Current architecture and existing canonical owner.
- Current behaviour to preserve.
- Change type: `PRESERVE`, `REUSE`, `EXTEND`, `REPAIR`, `MIGRATE`, `ADD`, `RETIRE LEGACY`, or `DEFER`.
- Data/schema/RLS/API/UI/Admin/notification/email/cron/analytics impact.
- Affected upstream and downstream consumers.
- Migration and rollback/forward-fix plan.
- Test evidence and exact-head CI/Release Gate evidence.
- Documentation updated in the same PR.

### 2.3 Change classification

| Classification | Meaning | Required action |
|---|---|---|
| PRESERVE | Existing implementation already satisfies the programme | Protect with tests; do not rewrite |
| REUSE | Canonical mechanism already exists | Route new behaviour through it |
| EXTEND | Canonical mechanism exists but lacks required capability | Add minimally without parallel architecture |
| REPAIR | Current implementation violates an accepted contract | Fix root cause and strengthen regression |
| MIGRATE | Current model must evolve | Use compatible, auditable, rollback-aware migration |
| ADD | No suitable canonical owner exists | Introduce one canonical mechanism only |
| RETIRE LEGACY | Old path conflicts with canonical behaviour | Prove replacement, migrate consumers, then remove safely |
| DEFER | Requirement belongs to a later phase | Document dependency; do not silently expand scope |

### 2.4 Programme-wide Preservation Register

Before changing any shared contract, record and maintain the following capabilities: Supabase Auth; signup; signin; OAuth; email verification; password reset; profiles; onboarding; username/member identity; project IDs/slugs; canonical project data; project interest/applications; application history; offers; project runs; project members; Project Lead; responsibilities; Lab; chat; events/meetings; tasks; milestones; resources; notifications; email outbox; cron; Admin; Weekly Pulse/team health; leave/handover/replacement; support cases; member discovery/invitations; completion; contributions; Proof; analytics; RLS; deployment/release gates.

For each capability record: current implementation, accepted behaviour, source of truth, planned change, dependent consumers, preservation strategy and regression tests.

### 2.5 No affected area left unupdated - dependency rule

A shared contract change is incomplete until every known consumer has been assessed and either updated, explicitly confirmed compatible, or marked not applicable with evidence. Database-only, API-only and UI-only partial updates are not acceptable when the contract spans layers.

### 2.6 Definition of a coherent merge

A PR may merge only when the repository remains internally coherent: existing clients cannot create invalid new state, new clients cannot depend on unshipped backend/schema state, historical records remain readable, permissions remain correct, and all applicable exact-head checks are green.

---

# 3. PHASE-BY-PHASE CONTROLLED IMPLEMENTATION

## Phase 0 - PROGRAMME BOOTSTRAP & ARCHITECTURE TRUTH

### Change-impact and preservation overlay

**Primary affected functionality:** Repository governance; CI / Release Gate; Architecture documentation; Database provenance; Preservation Register; All forms and interactions; Notifications and email; Cron; Analytics; Security/RLS; Regression baseline.

### Source-defined phase requirements and success criteria

OBJECTIVE
Understand the full current system before making any programme change.

### 7.1 REPOSITORY STATE
Record repository name, current main SHA, current Rolling Green Baseline, latest relevant merges, current CI, current Release Gate, deployment status, open PRs, overlapping work, branch protections and current unresolved P0/P1 issues.

### 7.2 READ MANDATORY DOCUMENTATION
Read:
1. AGENTS.md
2. CONTRIBUTING.md
3. docs/DEVELOPER-START-HERE.md
4. docs/README.md
5. docs/ONBOARDING.md
6. docs/ARCHITECTURE.md
7. docs/FEATURES.md
8. docs/DESIGN-SYSTEM.md
9. docs/CI-CD.md
10. docs/REGRESSION_TESTING.md
11. docs/OPEN-ISSUES.md
12. relevant docs/DECISIONS.md
13. authentication standards
14. project-specific documentation
15. relevant migrations
16. relevant tests

### 7.3 TRACE THE EXISTING PROJECT JOURNEY
Trace the actual implementation:
Anonymous visitor → Public Project → Signup/Signin → Onboarding → Member Project → Submit Interest/Application → Admin → Project Membership → Project Run → Lab → Chat → Events → Tasks → Completion → Contribution → Proof.
For each step identify UI, API, backend service, database tables, RLS, notifications, email, cron, Admin surface and tests.

### 7.4 DATABASE PROVENANCE REGISTER
Before changing schema, confirm authoritative migration history for every touched table. Record table, code usage, creation migration, RLS migration, indexes, hosted-only risk and safe-to-extend status. If canonical hosted schema is not reproducible from versioned migrations: STOP and reconcile the schema baseline first.

### 7.5 PRESERVATION REGISTER
Create a Preservation Register covering Supabase Auth, Signup, Signin, OAuth, Email verification, Password reset, Profiles, Onboarding, Project IDs, Project slugs, Project applications, Project interest, Application history, Project roles, Project runs, Project members, Project Lead, Lab, Chat, Events, Tasks, Milestones, Resources, Notifications, Email outbox, Cron, Admin, Contributions, Proof and RLS.
For each capability record current implementation, accepted behaviour, source of truth, planned change, preservation strategy and regression tests.

### 7.6 DUPLICATION CONTROL
Before creating any table, API, service, helper, state machine, notification mechanism, UI component, dashboard, workflow, cron or project-management capability, search the repository and ask whether Mettelo already has a system that owns this responsibility. If yes, extend it. Do not create team_v2, chat_v2, meetings_v2, tasks_v2, proof_v2, notifications_v2 or project_application_v2 unless there is a documented architectural reason.

### 7.7 SURFACE IMPACT MATRIX
For every phase create a surface matrix covering Database, RLS, API, Public, Signup, Signin, Onboarding, Profile, Account/Settings, Member Home, Discover, Project Detail, Applications, Admin Applications, Team Formation, Lab, Chat, Events, Tasks, Milestones, Notifications, Email, Cron, Proof, Analytics, Documentation and QA.

### 7.8 FORM & INTERACTION REGISTER
Inventory affected auth, identity, onboarding, profile, project, team, Lab and Proof interactions. For every interaction record Existing/New, API, Database, RLS, Notification, Email, Success state, Failure state, Duplicate state and Tests.

### 7.9 COMMUNICATION TRIGGER MATRIX
Use one canonical trigger matrix:
- Level A: in-app only for routine activity.
- Level B: in-app + optional email for mentions, assignments, reminders, invitations and approaching deadlines.
- Level C: in-app + transactional email for offers, starts, major meeting changes, leave/replacement outcomes, major support updates, completion and Proof decisions.
- Level D: email required for verification, password reset, account security, external invitations and critical recovery.
Do not email every Chat message or every task update.

### 7.10 SENSITIVE COMMUNICATION RULE
Never put safeguarding allegations, team conflict details, private support notes, disciplinary detail or confidential evidence in ordinary email. Use a secure-update message directing the user to sign in.

### 7.11 CRON / SCHEDULED PROCESS MATRIX
Assess offer expiry/reminders, invitation expiry, check-in reminders, joining-window closure, inactivity assessment, replacement escalation and event reminders. Reuse existing cron architecture where possible.

### 7.12 ANALYTICS MATRIX
Define canonical events before implementation, including account_created, username_created, onboarding_started/completed, profile_updated, project_viewed, interest_started/submitted/withdrawn, place_offered, offer_accepted/declined/expired, team_forming/ready, project_started, solo_started, collaborator_invited/joined, meeting_scheduled, task_assigned, checkin_submitted, support_requested, leave_requested, member_left, replacement_requested/joined, project_completed and proof_submitted/verified. Never put sensitive free text into analytics payloads.

### 7.13 PHASE 0 SUCCESS CRITERIA
1. AGENTS.md has been executed.
2. Current main SHA verified.
3. Rolling Green Baseline verified.
4. Open PRs inspected.
5. Relevant docs read.
6. Architecture mapped.
7. Database provenance assessed.
8. Preservation Register created.
9. Duplication risks documented.
10. Surface Impact Matrix created.
11. Form Register created.
12. Communication Matrix created.
13. Cron Matrix created.
14. Analytics Matrix created.
15. Test baseline understood.
16. Release process understood.
17. Risks documented.
18. No implementation has started prematurely.
STOP. Do not begin Phase 1 until approved.

---

## Phase 1 - MEMBER IDENTITY & USERNAME
**Primary affected functionality:** Supabase Auth; Signup; Signin; OAuth; Email verification; Password reset; Profiles; Onboarding; Admin member search; Mentions; Team roster; Support; Proof attribution; RLS.

OBJECTIVE: Create a stable member identity suitable for member discovery, invitations, mentions, team roster, support, future reputation and Proof attribution.

### Phase requirements
- Preserve Supabase Auth user ID as internal authority; never expose or let users choose it.
- Assess whether existing account/member ID is sufficient; otherwise introduce immutable human-readable Member ID such as `MTL-004281`, which grants no permission.
- Username/handle must be unique, case-insensitive, normalized, indexed, server-validated, database-constrained, reserved-name protected, use safe characters and safe change policy, with anti-enumeration controls.
- Extend the existing signup flow to collect Full name, Username, Email and Password; do not create a new signup system.
- Google/GitHub signup must result in a valid username, routing to username selection when necessary.
- Existing users must not lose access; provide Username Claim or equivalent migration and keep accounts without username functional until migrated.
- Email or username signin may be supported through safe server-side resolution without replacing Supabase Auth authority.
- Member-facing surfaces should show Full Name and @username, not auth UUID.
- Admin can search/view username and Member ID and resolve member identity.
- Security tests must cover duplicate username race, enumeration, impersonation, reserved names, Unicode confusables, rapid changes and rate limits.
- Username creation normally does not require transactional email; Auth governs account security/verification communication.

### PHASE 1 SUCCESS CRITERIA
1. Existing email signin works.
2. Existing OAuth works.
3. Existing sessions remain stable.
4. Auth ID remains authoritative.
5. Member ID works if introduced.
6. Username creation works.
7. Username unique constraint exists.
8. Case-insensitive uniqueness works.
9. Reserved names blocked.
10. Race conditions handled.
11. Signup collects username.
12. OAuth reaches username state safely.
13. Existing-user migration works.
14. Existing users are not locked out.
15. Username signin works if approved.
16. Password reset works.
17. Verification works.
18. Profile can display username.
19. Admin can identify member.
20. UUID not unnecessarily exposed.
21. RLS remains safe.
22. Mobile passes.
23. Keyboard passes.
24. Screen reader passes.
25. 200% reflow passes.
26. Security tests pass.
27. Docs updated.
STOP.

---

## Phase 2 - ONBOARDING, PROFILE, ACCOUNT & PREFERENCES
**Primary affected functionality:** Onboarding; Profile; Account/Settings; Privacy; Communication preferences; Profile readiness; Discoverability; Project eligibility; Notifications; Auth/security; RLS.

OBJECTIVE: Keep account identity, professional profile and account/privacy settings conceptually separate.

### Phase requirements
- Preserve existing professional-profile onboarding unless repository reality justifies change. Likely structure: About you; Skills & interests; Project goals; Availability; Review. Do not repeat Username if already completed.
- Preserve professional profile fields such as full name, headline, bio, location, professional area, current role, organisation, experience level, employment status, skills, languages, primary goal, preferred roles, LinkedIn, GitHub, portfolio, project availability, weekly capacity, domain preferences, tool preferences and public visibility.
- Preserve existing readiness engine; do not accidentally make username or optional communication settings block eligibility.
- Assess existing Account/Settings before adding anything. Potential settings: Username, Email, Password/security, Member ID, Profile discoverability, Allow project invitations, Allow member messages.
- Non-critical communication preferences may include mention emails, task reminders, meeting reminders, Weekly Pulse reminders, project invitations and optional digest. Critical transactional/security messages remain non-optional where required.
- Keep Profile, Account, Privacy and Notifications conceptually separated.
- Profile saves and preference changes should not create noisy email.

### PHASE 2 SUCCESS CRITERIA
1. Onboarding remains resumable.
2. Progress persists.
3. Existing profile data remains intact.
4. Existing member readiness remains accurate.
5. Profile update remains idempotent.
6. Username integrates correctly.
7. Discoverability works.
8. Invitation preference works.
9. Communication preferences persist.
10. Preferences are enforced server-side.
11. Critical notifications cannot be accidentally disabled.
12. Profile remains separate from Proof.
13. Account/security information is correctly separated.
14. Mobile passes.
15. Accessibility passes.
16. Existing profile regression passes.
17. Docs updated.
STOP.

---

## Phase 3 - CANONICAL PROJECT MODEL & GOVERNANCE
**Primary affected functionality:** Canonical project schema; Public Project; Member Project; Discover; Applications; Admin; Team formation; Lab; Resources; Deliverables; Success criteria; Milestones; Responsibilities; Proof configuration; Data governance; RLS.

OBJECTIVE: Ensure every project has one complete, governed definition.

### Required canonical project data
- Identity: Project ID, Title, Slug, Summary, Project type, Domain, Category, Difficulty, Visibility, Lifecycle, Recruitment state.
- Commitment: Duration, Weekly commitment, Participation mode, Minimum team, Target team, Maximum team, Format, Expected start, Interest close date.
- Context: Problem statement, Business context, Use case, Primary objective, Supporting objectives, Key questions, In scope, Out of scope.
- Resources: Resource title/type/description, source organisation, provider, original URL, logo, licence, licence URL, reuse status, retention permission, SharePoint permission, exact data subset, visibility, last verified and stored copy.
- Delivery: Deliverables, Success criteria, Acceptance criteria, Milestones, Timeline, Dependencies.
- Capabilities: Technical skills, Professional skills, Potential Proof categories, Evidence expectations.
- Team: Responsibilities, Role architecture, Leadership requirement, Project Architect, Team structure.
- Data governance: UNREVIEWED, VERIFICATION REQUIRED, GREEN, AMBER, RED; reviewer, review date, notes, licence evidence and retention decision.
- Publication gate: incomplete projects cannot publish; external-data projects need sufficient resource/legal governance.

### PHASE 3 SUCCESS CRITERIA
1. One canonical project definition exists.
2. Public/Member/Lab can consume same data.
3. Required project metadata defined.
4. Team thresholds supported.
5. Resource governance supported.
6. Licence evidence supported.
7. Visibility supported.
8. Deliverables structured.
9. Success criteria structured.
10. Skills structured.
11. Responsibilities structured.
12. Timeline structured.
13. Publication completeness enforced.
14. Existing projects migrated safely.
15. Existing IDs/slugs preserved.
16. No custom page-specific duplication required.
17. Admin editing works.
18. RLS correct.
19. Docs updated.
STOP.

---

## Phase 4 - PUBLIC PROJECT DISCOVERY EXPERIENCE
**Primary affected functionality:** Public Projects; Project cards; Project detail; SEO; Auth return destination; Signup/signin handoff; Source attribution; Privacy; Responsive/accessibility.

OBJECTIVE: Help anonymous users understand projects clearly before joining Mettelo.

### Requirements
- Project card: Title, Domain, Difficulty, Duration, Commitment, Participation mode, Project state, Capability tags; primary action VIEW PROJECT.
- Public detail: Hero, Challenge, Business context, Use case, Objectives, Key questions, Scope, Resources, Deliverables, Success criteria, Capabilities, Proof potential, Timeline, Team structure, Eligibility, CTA.
- Primary CTA: SUBMIT INTEREST. Anonymous users go through signin/signup with a safe preserved project return destination.
- Never expose private resource URLs, team-only files, internal governance notes, applications or member personal data.
- Provider/source branding is attribution only; never imply partnership unless explicit.

### PHASE 4 SUCCESS CRITERIA
1. Canonical data only.
2. Project cards consistent.
3. Public detail complete.
4. CTA works.
5. Safe next/return works.
6. Signup return works.
7. Private data protected.
8. Source attribution accurate.
9. SEO works.
10. Mobile works.
11. 200% reflow works.
12. Keyboard works.
13. Accessibility works.
14. Public regression passes.
15. Docs updated.
STOP.

---

## Phase 5 - MEMBER PROJECT EXPERIENCE & QUALIFICATION
**Primary affected functionality:** Member Project; Eligibility; Profile readiness; Project capacity; Existing interest state; Project roles display; Tracker; Applications; Responsive/accessibility.

OBJECTIVE: Make the Member Project Page the primary decision surface.

### Requirements
- One project-conversion CTA: SUBMIT INTEREST. Remove normal member-facing Apply for a role / contributor and role-selection-before-applying paths.
- Show participation mode, current members, minimum required, target, maximum and current project state.
- Check authentication, profile readiness, project status, interest status, capacity, prior participation constraints and application deadline.
- Incomplete profile may route to Profile Completion and must return to the exact project afterward.
- Existing interest shows INTEREST SUBMITTED with tracker link; no duplicate submission.
- Roles may appear informationally as possible contribution areas, but are not selected before initial interest.

### PHASE 5 SUCCESS CRITERIA
1. One dominant CTA.
2. CTA says Submit Interest.
3. No required role selection.
4. Eligibility enforced.
5. Profile completion return works.
6. Existing-interest state works.
7. Closed state works.
8. Accepted/active state works.
9. Team state accurate.
10. Canonical data displayed.
11. Duplicate interest prevented.
12. Mobile passes.
13. Accessibility passes.
14. Member regression passes.
15. Docs updated.
STOP.

---

## Phase 6 - SUBMIT INTEREST FLOW
**Primary affected functionality:** Submit Interest form; Profile reuse; Applications service; Validation; Duplicate protection; Terms; Admin queue; Tracker; Notifications; Analytics; RLS.

OBJECTIVE: Create a short, useful project-interest experience.

### Requirements
- Collect only project-specific information: why interested, how they could contribute, availability confirmation, participation preference, leadership interest, relevant evidence link and terms where required.
- Participation preference: TEAM-only=Team; SOLO-only=Solo; FLEXIBLE=Team/Solo/Either.
- Reuse stored profile data; do not re-ask name, email, profile links, skills or career context unless necessary.
- Extend the canonical application/interest service; do not create another submission engine.
- One active interest per member/project/lifecycle; return existing request when appropriate.
- Submission uses in-app confirmation; email only if communication policy justifies it.

### PHASE 6 SUCCESS CRITERIA
1. Interest form concise.
2. No role required.
3. Participation preference works.
4. Leadership interest works.
5. Profile values reused.
6. Server validation works.
7. Duplicate-safe.
8. Terms work.
9. Admin receives submission.
10. Tracker updated.
11. Form values survive recoverable error.
12. Notification policy followed.
13. Analytics event created.
14. Mobile works.
15. Accessibility works.
16. Application regression passes.
17. Docs updated.
STOP.

---

## Phase 7 - ADMIN INTEREST REVIEW & SELECTION
**Primary affected functionality:** Admin application review; Member identity/profile; Project capacity; Review states; Offer handoff; Audit; Permissions/RLS; Admin mobile/accessibility.

OBJECTIVE: Give Admin a structured review process.

### Requirements
Admin review shows Member identity, Username, Professional profile, Skills, Availability, Relevant Proof, Interest statement, Participation preference, Leadership interest, Relevant evidence and Current project capacity.
Potential review states: SUBMITTED, IN REVIEW, SHORTLISTED, OFFERED, DECLINED, mapped safely to existing status model.
Admin actions: Start review, Shortlist, Offer project place, Decline, Request clarification where supported. Admin approval must not automatically create confirmed participation.
Audit records actor, timestamp, previous/new state and notes/reason where appropriate.

### PHASE 7 SUCCESS CRITERIA
1. Admin sees complete interest context.
2. Existing history preserved.
3. Review state transitions validated server-side.
4. Audit events recorded.
5. Selection does not auto-enrol member.
6. Decline works.
7. Shortlist works.
8. Offer action works.
9. Permissions correct.
10. Admin mobile works.
11. Accessibility passes.
12. Admin regression passes.
13. Docs updated.
STOP.

---

## Phase 8 - PROJECT PLACE OFFER & MEMBER ACCEPTANCE
**Primary affected functionality:** Offer lifecycle; Capacity reservation; Member tracker; Admin; Notifications/email; Cron; Project run/cohort association; Concurrency; RLS.

OBJECTIVE: Create an explicit commitment boundary.

### Requirements
- Conceptual lifecycle: submitted → in_review → shortlisted → offered → accepted/declined/expired; after accepted: waiting_for_team → ready → active. Map safely to existing statuses.
- Offer data tracks Offer ID, Project, Member, offered/expires/accepted/declined/expired timestamps, Offered by, Run/cohort, Reserved capacity.
- Pending offer temporarily reserves a place; decline/expiry releases capacity.
- Member offer UI shows Project, Commitment, Team state, Expected start, Offer expiry, Participation expectations and ACCEPT PLACE / DECLINE.
- Place offered uses in-app + transactional email; reminders bounded; expiry email policy-controlled; no spam.
- Reuse existing cron/project formation/event/email infrastructure for expiry/reminders.

### PHASE 8 SUCCESS CRITERIA
1. Offer record exists.
2. Offer expiry exists.
3. Offer capacity reserves correctly.
4. Over-offering prevented.
5. Acceptance works.
6. Decline works.
7. Expiry works.
8. Capacity releases.
9. Race conditions handled.
10. Member tracker updates.
11. Admin updates.
12. Notification matrix followed.
13. Reminder dedupe works.
14. Mobile offer UI works.
15. Accessibility passes.
16. Offer E2E passes.
17. Docs updated.
STOP.

---

## Phase 9 - TEAM / SOLO / FLEXIBLE PARTICIPATION MODEL
**Primary affected functionality:** Project participation mode; Minimum/target/maximum thresholds; Project readiness; Late joining; Runs; Membership history; Capacity; RLS.

OBJECTIVE: Support realistic project start conditions.

### Requirements
Support TEAM, SOLO and FLEXIBLE participation modes; Minimum, Target and Maximum team sizes; minimum controls readiness while target does not unnecessarily block start; Solo/Flexible may start with one accepted member when configured; support late_joining_allowed and joining_window.

### PHASE 9 SUCCESS CRITERIA
1. Team mode works.
2. Solo mode works.
3. Flexible mode works.
4. Minimum/target separate.
5. Maximum enforced.
6. Minimum controls readiness.
7. Target does not unnecessarily block start.
8. Team-only cannot start below minimum.
9. Solo can start with one.
10. Flexible can start solo.
11. Late joining works.
12. Existing runs preserved.
13. Existing membership history preserved.
14. RLS works.
15. Boundary tests pass.
16. Docs updated.
STOP.

---

## Phase 10 - TEAM FORMATION & RESPONSIBILITY ALLOCATION
**Primary affected functionality:** Team formation; Project runs; Membership; Responsibilities; Project Lead; Admin Team Formation; Capacity/concurrency; Notifications; RLS.

OBJECTIVE: Form viable delivery teams after members accept places.

### Requirements
Consider participation mode, member preference, current forming run, minimum/target/maximum, availability, capabilities, project needs and leadership interest. Responsibilities are assigned after selection and may include Data Analysis, Research, Modelling, Engineering, Dashboard, QA, Documentation, Presentation, Stakeholder Storytelling and Project Lead. They are delivery responsibilities, not application products. Reuse current leadership architecture; Admin/appropriate authority confirms Lead. Prevent duplicate membership, over-capacity, multiple accidental Leads, duplicate approvals and races. Admin Team Formation shows Project, confirmed members, thresholds, Lead, responsibilities, readiness and open places.

### PHASE 10 SUCCESS CRITERIA
1. Correct run selected.
2. New run created only when required.
3. Membership idempotent.
4. Capacity safe.
5. Lead logic reused.
6. Responsibilities assigned.
7. Multiple Leads prevented.
8. Minimum readiness works.
9. Admin can override safely.
10. Member team state accurate.
11. Notifications appropriate.
12. RLS passes.
13. Team formation E2E passes.
14. Docs updated.
STOP.

---

## Phase 11 - PROJECT ALIGNMENT & START READINESS
**Primary affected functionality:** Canonical brief; Team readiness; Lab provisioning; Permissions; Resources; Milestones; Kickoff; Project start state; Membership activation; Notifications; RLS.

OBJECTIVE: Do not activate a project until its operating environment is ready.

### Requirements
Project readiness requires canonical brief, problem, context, objectives, key questions, scope, resources, deliverables, success criteria and timeline. Team readiness requires confirmed members, minimum reached, Lead where needed, responsibilities and capacity. System readiness requires Lab provisioned, permissions, private resources, first milestone, kickoff and support route. Start activates run and membership, opens Lab/private resources, starts milestones, enables collaboration and sends kickoff communication.

### PHASE 11 SUCCESS CRITERIA
1. Incomplete project cannot start accidentally.
2. Team minimum enforced.
3. Solo readiness works.
4. Lab ready before start.
5. Access ready.
6. First milestone ready.
7. Kickoff communication works.
8. Start transition idempotent.
9. Member state updates.
10. Admin state updates.
11. RLS correct.
12. Start E2E passes.
13. Docs updated.
STOP.

---

## Phase 12 - METTELO LAB CANONICAL PROJECT EXPERIENCE
**Primary affected functionality:** Mettelo Lab; Canonical project data; Team roster; Resources; Milestones; Tasks; Chat/events navigation; Proof status; Private access; RLS.

OBJECTIVE: Make Lab the operating environment for delivery.

### Requirements
Lab Overview shows project status, team, current milestone, next meeting, blockers and upcoming work. Brief uses canonical project problem/context/use case/objectives/questions/scope/success criteria. Resources include data/docs/source attribution/team files/links. Delivery includes milestones/tasks/deliverables/success criteria. Team shows members, @username, responsibilities, Project Lead and participation state. Communication includes Chat, mentions, decisions, blockers and meetings. Proof area shows evidence expectations, contribution status and review status. Lab must not manually recreate Project Brief; use canonical project data.

### PHASE 12 SUCCESS CRITERIA
1. Lab consumes canonical project data.
2. No duplicate brief.
3. Team displayed.
4. Responsibilities displayed.
5. Resources permission-safe.
6. Milestones work.
7. Tasks work.
8. Existing Lab navigation preserved.
9. Non-member cannot access Lab.
10. Removed member cannot access private Lab.
11. Mobile works.
12. Accessibility passes.
13. Lab regression passes.
14. Docs updated.
STOP.

---

## Phase 13 - CHAT, MEETINGS, TASKS & COLLABORATION
**Primary affected functionality:** Chat; Mentions; Username identity; Meetings/events; Tasks; Decisions; Notifications; Communication preferences; Membership validation; RLS.

OBJECTIVE: Extend existing collaboration capabilities rather than replace them.

### Requirements
Chat supports meaningful categories such as Update, Question, Blocker and Decision. Mentions use @username where appropriate, validate team membership, generate in-app notification and email only by preference/matrix. Reuse project meeting/event infrastructure for schedule/edit/cancel/join/purpose/time/platform/attendance where governed. Tasks support enough project delivery function: Title, Owner, Status, Due date, Milestone, Evidence, Blocker—do not build an unnecessary Jira clone. Important decisions remain discoverable. Do not email every chat message; meeting changes may be transactional; task assignments may use preference-based email.

### PHASE 13 SUCCESS CRITERIA
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
STOP.

---

## Phase 14 - WEEKLY PROJECT PULSE & TEAM HEALTH
**Primary affected functionality:** Weekly Pulse; Team health; Member privacy; Lead/Admin views; Reminders; Notifications; Cron; Analytics; RLS.

OBJECTIVE: Detect struggling projects before they collapse.

### Requirements
Member check-in captures progress (On track/Some risk/Blocked), workload (Manageable/Heavy/Unsustainable), team state (Working well/Some friction/Significant concern), support need (No/Maybe/Yes), optional note. Store Member, Project, Run, Period, progress/workload/team states, Blocked, Support requested and Timestamp. Sensitive responses are not visible to the entire team by default. Health indicators must be explainable, not pseudo-scientific. Lead/Admin surface shows operational signals. Reminders are bounded and respect non-critical email preferences.

### PHASE 14 SUCCESS CRITERIA
1. Check-in works.
2. Correct run linked.
3. Only member can submit own check-in.
4. Frequency rule exists.
5. Private data protected.
6. Lead view appropriate.
7. Admin view appropriate.
8. Health explainable.
9. No surveillance introduced.
10. Reminder bounded.
11. Preference respected.
12. Mobile works.
13. Accessibility passes.
14. Health tests pass.
15. Docs updated.
STOP.

---

## Phase 15 - SOLO DELIVERY & SOLO-TO-TEAM CONVERSION
**Primary affected functionality:** Solo/Flexible participation; Project runs; Membership; Lab; Recruitment; Invitations; Open collaboration places; Tasks; Milestones; Chat/history; Proof integrity; RLS.

OBJECTIVE: Allow work to start without waiting for team liquidity.

### Requirements
For Solo/Flexible: Accepted member → run → membership → Lab → project start. Solo UI shows WORKING INDEPENDENTLY, current project state, target team and joining availability, with Invite collaborator/Open collaboration place where permitted. New collaborator joins the SAME run; do not create a separate project/run unnecessarily. Preserve tasks, milestones, chat, history, resources and contribution history. Solo may evidence Technical Delivery, Ownership, Problem Solving, Documentation and Communication; do not automatically infer Collaboration or Peer Leadership.

### PHASE 15 SUCCESS CRITERIA
1. Solo start works.
2. Flexible solo works.
3. Team-only cannot start solo.
4. Same run supports later collaborator.
5. History preserved.
6. Contribution preserved.
7. Tasks preserved.
8. Milestones preserved.
9. Proof integrity preserved.
10. Joining rules enforced.
11. Capacity enforced.
12. RLS correct.
13. Solo-to-team E2E passes.
14. Docs updated.
STOP.

---

## Phase 16 - MEMBER EXIT, HANDOVER & REPLACEMENT
**Primary affected functionality:** Membership lifecycle; Leave flow; Handover; Project access; Chat access; Capacity; Replacement; Notifications/email; Historical contribution; Proof; RLS.

OBJECTIVE: Allow projects to survive member departure.

### Requirements
Leave flow captures reason category, handover, open responsibilities and relevant availability without forcing sensitive detail. Preserve membership history using lifecycle concepts such as Active, Leaving and Left mapped safely to existing schema. After departure revoke private project/chat access while preserving historical contribution. Handover captures completed/open work, files, decisions, risks and recommendations. Lead/Admin can request replacement: member leaves → capacity opens → replacement required → shortlist/reopen recruitment → offer → acceptance → join existing run. Leave/replacement communication goes only to relevant recipients.

### PHASE 16 SUCCESS CRITERIA
1. Pre-start withdrawal still works.
2. Active leave works.
3. History preserved.
4. Proof preserved.
5. Contribution preserved.
6. Handover stored.
7. Capacity updates.
8. Access revoked.
9. Remaining members retain access.
10. Lead notified.
11. Admin notified.
12. Replacement request works.
13. Joining cutoff respected.
14. New member joins existing run.
15. RLS updates immediately.
16. Leave/replacement E2E passes.
17. Docs updated.
STOP.

---

## Phase 17 - SUPPORT, CONFLICT & SAFEGUARDING
**Primary affected functionality:** Support cases; Conflict/safeguarding privacy; Admin operations; Member/Lead permissions; Replacement/removal; Audit; Secure notifications; RLS.

OBJECTIVE: Provide a secure route for project problems.

### Requirements
Support categories may include Technical/access, Resource/data, Project scope, Project Lead support, Team collaboration, Workload, Conduct, Accessibility adjustment and Other. Store Case ID, Reporter, Project, Run, Category, Description, Status, Assigned Admin, timestamps, Resolution, Internal notes and Member-visible updates. Support cases are private; Project Lead does not automatically see them. Admin may review, assign, request information, record recovery plan, reassign responsibility, change Lead, approve replacement, pause participation, remove member, escalate safeguarding, resolve and close. Never email confidential case detail; use secure-update wording. Material Admin actions are audited.

### PHASE 17 SUCCESS CRITERIA
1. Member can create case.
2. Correct project/run attached.
3. Case private.
4. Admin access restricted.
5. Lead complaint does not require Lead permission.
6. Sensitive details not emailed.
7. Case states work.
8. Audit works.
9. Recovery plan works.
10. Replacement can follow resolution.
11. Removal authorized.
12. RLS passes.
13. Mobile works.
14. Accessibility passes.
15. Security review passes.
16. Support E2E passes.
17. Docs updated.
STOP.

---

## Phase 18 - MEMBER DISCOVERY, TEAM RECRUITMENT & PROJECT INVITATIONS
**Primary affected functionality:** Member Discover; Profile privacy; Invitation preferences; Project/Run recruitment policy; Project Lead/Admin/member permissions; Invitations; External signup; Capacity; Late joining; Lab/Project team surfaces; Replacement; Notifications/email; Analytics; Anti-abuse; RLS.

OBJECTIVE: Allow members and project teams to safely discover suitable collaborators, invite people into projects, fill open project places and expand existing teams without bypassing governance, capacity, privacy, readiness or security.

### Core invitation contract
Invitation must never automatically create membership:
INVITE → ACCEPT → REVALIDATE → AUTHORIZE → JOIN EXISTING PROJECT RUN.
Never create duplicate project/run merely because a collaborator joins.

### Member discovery
Search/filter permitted public fields such as Username, Name, Capabilities, Skills, Domain, Professional area, Preferred roles, Experience level, Availability/open-to-project and Weekly capacity. Respect discoverability, invitation preference, block/report, account status, eligibility and privacy. Never expose auth UUID, private email/profile fields, application history, support cases, private project participation or internal Admin data. Hidden members remain undiscoverable even if another user knows profile fragments.

### Who may invite
Server-side authority only:
- Admin may invite eligible internal/external members, forming/active projects where allowed, initiate replacement, revoke and use governed overrides, but still respects capacity, lifecycle, legal/safeguarding, blocks, compatibility and joining cutoff except explicit audited override.
- Project Lead may invite when recruitment/capacity/joining/lifecycle/eligibility/policy permit, but cannot bypass max capacity/privacy/blocked states/acceptance/Admin approval.
- Active member of same project/run may recruit only when team invitations permit and all capacity/eligibility/window/privacy/anti-abuse/acceptance/run validation rules pass. If approval required: MEMBER REQUESTS INVITE → LEAD/ADMIN REVIEWS → INVITATION SENT using same canonical invitation object/state machine.

### Project invitation policy
Assess existing equivalent controls before adding fields. Potential controls: allow_member_discovery, allow_project_invitations, allow_team_member_invites, allow_project_lead_invites, allow_external_invites, invite_requires_approval, late_joining_allowed, joining_window, recruitment_open, maximum_team_size. Do not duplicate equivalent fields.
Forming project: Lead can invite; members where team invites enabled; Admin can invite.
Active project: Lead only if recruitment/late joining remains permitted; members only if team invites + late joining permit; Admin by governed override.
Completed/archived: no normal invitations.
Strict Solo: no collaborator invite unless configuration intentionally changes. Flexible may Invite Collaborator/Open Collaboration Place and collaborator joins same run after acceptance/validation.

### Existing-member invite flow
Search @username/member discovery → Review permitted profile → Select project/run → optional reason → Send invitation → in-app notification + optional email → View Project / Accept / Decline. Before membership, revalidate project existence/joinability, invitation validity/revocation/expiry, duplicate/conflicting membership, capacity/max size, joining window, readiness, account eligibility and RLS. Only then Accepted invitation → Project membership → Same run → Access updated → Lab access where appropriate.

### External invitation
Authorized inviter → email → safe invite email → signup → username → verification → onboarding/profile readiness → return to exact invitation → review → accept/decline → revalidate eligibility/capacity → join same run if valid. Invitation context survives signup, verification, signin, onboarding and profile completion. Email is required delivery but must not expose confidential team/project data.

### Invitation data/state
Use one canonical invitation model. Store/derive Invitation ID, inviter member/authority, project/run, invitee member or external email, source/reason/type, status, created/expires/accepted/declined/revoked timestamps, revoked by, approval metadata and replacement context. Potential statuses: PENDING_APPROVAL, PENDING, ACCEPTED, DECLINED, EXPIRED, REVOKED, INVALIDATED. Do not create invitation_v2 when canonical mechanism exists.

### Capacity & joining safety
Authoritative server-side capacity at invitation and acceptance. Pending invites reserve capacity only if current product policy says so. Always revalidate at ACCEPT and prevent final-slot races using transaction/locking/constraint-safe architecture.

### Open collaboration place
A run may expose COLLABORATOR NEEDED when legitimately seeking members due to being below target, continued recruitment, Solo/Flexible conversion, member departure, approved replacement or governed capacity. Expose via canonical Discover, never create a separate project, and do not create instant membership.

### Project/Lab recruitment surface
Authorized active Project/Lab surfaces provide Invite Collaborator / Find Team Member / Open Collaboration Place. Lead sees members, min/target/max, open places, pending invites, collaborator-needed state. Ordinary members only see authorized controls. If approval required show INVITE REQUESTED and approval state. No Admin-only controls for ordinary users.

### Acceptance, decline, revoke, expiry, invalidation
Invitee sees who invited, project name/summary/state, participation/commitment/team state, role context, run/start state, joining deadline and invite expiry. Acceptance is explicit. Decline closes invite without harming unrelated participation. Authorized inviter/Lead/Admin may revoke. Invitations have bounded expiry using existing cron architecture. Invalidate if team fills, recruitment closes, project completes, joining window closes, invitee becomes ineligible or joins another valid path; explain state clearly.

### Replacement
Reuse same invitation architecture. Replacement needed → Discover/search → Invite → Accept → Revalidate → Join SAME run → Access update → responsibility reassignment. Preserve former member's historical membership/contribution.

### Privacy, anti-abuse, email, analytics and RLS
Privacy settings support discoverability, project invitations, member messages and invitation notification preference. Ordinary Lead/member invitation blocked when invitations off, except governed/audited Admin exceptional flows if policy permits. Protect against enumeration.
Use rate limiting, search throttling, invite limits, duplicate prevention, block/report, privacy, expiry, revocation, audit, server authorization and enumeration resistance. Prevent spam, repeated external email, mass enumeration, blocked/self invites, private-run abuse and client-side bypass.
Existing members get in-app notification and preference-governed email; external invite email required. Reuse existing notification/outbox/email architecture; do not scatter provider calls.
Analytics may include search/invite/approval/view/accept/decline/expire/revoke/join/open-place/replacement events, without sensitive search/profile/email content.
RLS/API verifies inviter identity/membership/run relationship/role, invitation config, invitee eligibility, capacity, joining window and invitation state. Test IDOR, RLS bypass, forged inviter/project/run IDs, token reuse, expired/revoked token, capacity race, duplicate acceptance, unauthorized revoke and hidden-profile enumeration.

### PHASE 18 SUCCESS CRITERIA
1. Member discovery works.
2. Username search works.
3. Capability/domain discovery works.
4. Hidden profiles remain hidden.
5. Invitation preference is respected.
6. Member search is rate-limited.
7. Admin invitation authorization works.
8. Project Lead invitation authorization works.
9. Active-team-member invitation authorization works where configured.
10. Unauthorized member cannot invite into another project.
11. Team-member approval flow works where configured.
12. Existing-member invitation works.
13. External invitation works.
14. External signup preserves invitation context.
15. Invitee can accept.
16. Invitee can decline.
17. Invitation expiry works.
18. Invitation revocation works.
19. Duplicate invitations handled safely.
20. Invitation cannot directly create membership without acceptance.
21. Capacity is revalidated on acceptance.
22. Maximum capacity cannot be exceeded.
23. Joining window is revalidated.
24. Late joining respects project configuration.
25. Accepted collaborator joins the SAME project/run.
26. Existing project history is preserved.
27. Solo-to-team invitation works for Flexible projects.
28. Collaborator Needed appears correctly in Discover.
29. Project/Lab Invite Collaborator action works for authorized users.
30. Project Lead sees appropriate recruitment state.
31. Ordinary members see only authorized recruitment controls.
32. Replacement invitations reuse canonical invitation architecture.
33. Replacement preserves historical contribution/membership.
34. Invite privacy works.
35. Block/report works.
36. Anti-spam controls work.
37. Invitation state is auditable.
38. Existing notification architecture reused.
39. Existing email/outbox architecture reused.
40. External invitation email works.
41. Sensitive information is not emailed.
42. RLS passes.
43. IDOR/security tests pass.
44. Capacity-race tests pass.
45. Mobile works.
46. Tablet works.
47. Desktop works.
48. Accessibility passes.
49. 200% reflow passes.
50. Existing-member invitation E2E passes.
51. External invitation E2E passes.
52. Team-member invitation E2E passes.
53. Project Lead invitation E2E passes.
54. Solo-to-team E2E passes.
55. Replacement invitation E2E passes.
56. Existing project/member/Lab regression passes.
57. Documentation updated.
STOP.

---

## Phase 19 - PROJECT COMPLETION & FINAL REVIEW
**Primary affected functionality:** Completion readiness; Deliverables; Success criteria; Milestones; Final submission; Contribution mapping; Admin/reviewer; Project lifecycle; Notifications; Proof separation; RLS.

OBJECTIVE: Complete projects through evidence, not arbitrary status switching.

### Requirements
Assess deliverables, success criteria, milestones, presentation where required, final resources, project summary and contribution submissions. Final submission may include deliverable links, summary, outcomes, limitations, presentation and contribution mapping. Reviewer/Admin validates project-level completion. Critical rule: PROJECT COMPLETED DOES NOT MEAN EVERY MEMBER AUTOMATICALLY RECEIVES VERIFIED PROOF. Completion uses in-app + transactional email; Proof verification remains separate.

### PHASE 19 SUCCESS CRITERIA
1. Completion requirements defined.
2. Required deliverables checked.
3. Final submission works.
4. Reviewer permissions work.
5. Project can be completed.
6. Completion history stored.
7. Contribution review remains separate.
8. Notification works.
9. Mobile works.
10. Accessibility passes.
11. Completion E2E passes.
12. Docs updated.
STOP.

---

## Phase 20 - CONTRIBUTION ATTRIBUTION & METTELO PROOF
**Primary affected functionality:** Contribution attribution; Evidence; Proof review; Leadership evidence; Solo proof; Historical Proof; Notifications; Security/RLS.

OBJECTIVE: Create credible individual evidence from team delivery.

### Requirements
For each member capture Responsibility, Specific contribution, Related task/deliverable, Evidence, Review outcome and Verification status. Never award Proof merely for joining, being on the team, holding a title, attending a meeting or project completion alone. Leadership evidence may include creating clarity, coordinating delivery, resolving blockers, protecting quality, influencing decisions, supporting others and ownership; leadership does not require direct reports. Solo participants do not get collaboration evidence without real collaboration. Reuse existing contribution/Proof architecture with states such as Draft, Submitted, Under review, Changes required, Verified, Declined. Proof verified uses in-app + transactional email; changes required uses appropriate notification/email policy.

### PHASE 20 SUCCESS CRITERIA
1. Individual contribution recorded.
2. Evidence linked.
3. Review works.
4. Verification works.
5. Project completion does not auto-verify Proof.
6. Solo Proof rules correct.
7. Leadership evidence credible.
8. Existing contribution architecture reused.
9. Historical Proof preserved.
10. Notifications work.
11. Security works.
12. Proof E2E passes.
13. Docs updated.
STOP.

---

## Phase 21 - CONTINUATION, ADMIN OPERATIONS & FUTURE PROJECT SCALE
**Primary affected functionality:** Member continuation; Admin project creation; Canonical project model; Publication gate; Project list; Recruitment settings; Lab generation; Duplication/templates; Historical data protection; RLS.

OBJECTIVE: Make the system scalable beyond one completed project.

### Requirements
After completion show appropriate View Proof, Update Profile, Find next Project, Explore Opportunities, Build leadership evidence, Advance Capability Path; avoid manipulative engagement.
Admin Create Project should be a governed multi-step flow: Basics; Problem & Business Context; Resources/Data; Deliverables & Success Criteria; Skills & Proof; Responsibilities & Team; Timeline; Recruitment/Interest Settings; Lab Preview; Review & Publish.
Admin Project List shows Project, Lifecycle, Participation mode, Minimum/Target, Recruitment, Applications, Offers, Team, Health, Lab readiness, Replacement, Support and Updated date.
Admin actions include Create, Edit, Preview, Publish, Open/Close interest, Review interest, Offer place, Form team, Start, Monitor, Archive, Duplicate.
Duplication may copy project content, responsibilities, resources, milestones, skills and success criteria, but never applications, offers, members, run activity, chat, submissions, Proof or completion.
Optional templates may cover Data Analytics, Data Science, Data Engineering, AI/ML, Software, Cybersecurity, Research, Product/UX. Templates suggest structure and never invent project-specific content.

### PHASE 21 SUCCESS CRITERIA
1. Admin can create project without developer.
2. Project appears Public automatically.
3. Project appears Member Discover automatically.
4. Lab generated automatically.
5. Completeness gate works.
6. Resource governance works.
7. Team configuration works.
8. Recruitment configuration works.
9. Offer settings work.
10. Preview works.
11. Duplicate works safely.
12. Historical data never copied.
13. Admin dashboard accurate.
14. Member continuation works.
15. No project-specific JSX required.
16. Docs updated.
STOP.

---

## Phase 22 - ANALYTICS, SECURITY, ACCESSIBILITY & RELEASE HARDENING
**Primary affected functionality:** Product analytics; Security; RLS; Accessibility; All full E2E journeys; All regressions; Migrations; Deployment Gate; Release Gate; Documentation; Rolling Green Baseline.

OBJECTIVE: Validate the complete system.

### Product analytics
Measure Signup completion, Onboarding completion, Project view → interest, Interest → offer, Offer acceptance/expiry, Time to team formation/start, Projects starting below target, Solo start, Solo-to-team, Withdrawal, Replacement, Support cases, Completion and Proof verification.

### Security
Test Authentication, Authorization, RLS, IDOR, Service-role isolation, Username enumeration, Invite abuse, Offer manipulation, Capacity races, Support privacy, Private resources, Removed-member access, Open redirects, XSS, Upload validation and Rate limits.

### Accessibility
WCAG 2.2 AA. Validate 320px, Mobile, Tablet, Desktop, 200% zoom, Keyboard, Visible/logical focus, Screen reader, Form labels, Errors, Success announcements, Touch targets, Contrast, Reduced motion, no colour-only status and no horizontal overflow.

### Full E2E journeys
A. New team member: Public Project → Submit Interest → Create account → Username → Verify → Onboarding → Return → Submit → Review → Offer → Accept → Team formation → Start → Lab → Collaborate → Complete → Proof.
B. Existing eligible member: Signin → Discover → Project → Submit Interest → Offer → Accept → Start.
C. Incomplete profile: Project → Submit Interest → Profile gate → Update Profile → Return to exact project → Submit.
D. Offer expiry: Offer → Reminder → no response → Expire → Capacity released.
E. Team starts below target: minimum reached → Start → recruitment remains open → later member joins.
F. Solo: Submit Interest → Solo → Offer → Accept → Start alone → Lab.
G. Solo becomes team: Solo active → Invite collaborator → Member joins → same run → history preserved.
H. Member leaves: Active → Leave request → Handover → Access revoked → Capacity opens → Replacement → New member.
I. Support: Member → Support request → Private Admin case → Secure update → Resolution.
J. Future project: Admin create → Publish → Public → Member Discover → Submit Interest → Offer → Team → Lab, no developer involvement.

### Release gates
Run all applicable: Lint, Typecheck, Build, Static audits, Migration validation, Public regression, Auth regression, Member regression, Application regression, Admin regression, Lab regression, Project collaboration regression, RLS tests, Security checks, Accessibility, Mobile, Staging E2E, Deployment Gate and Release Gate. Critical skipped tests are NOT green.

### PHASE 22 SUCCESS CRITERIA
1. Analytics works.
2. Sensitive data excluded.
3. Security tests pass.
4. RLS tests pass.
5. Auth regression passes.
6. Public regression passes.
7. Member regression passes.
8. Application regression passes.
9. Admin regression passes.
10. Lab regression passes.
11. Collaboration regression passes.
12. Accessibility passes.
13. Mobile passes.
14. 200% reflow passes.
15. Migrations validate.
16. Lint passes.
17. Typecheck passes.
18. Build passes.
19. Deployment Gate passes.
20. Release Gate passes.
21. Post-merge main SHA verified.
22. New Rolling Green Baseline confirmed only after evidence.
23. Docs updated.

---

# 4. PROGRAMME-WIDE CONTRACTS, RELEASE CONTROLS & SOURCE TRACEABILITY

## Form Quality Contract
Every form changed or introduced must support Initial state, Loading state, Client validation, Server validation, Field error, Global error, Authentication error, Authorization error, Conflict/stale state, Duplicate state, Success state, Retry where safe, Idempotency where needed, Unsaved-change protection where appropriate, Back navigation, Safe resume, Value retention after recoverable failure, Mobile, Keyboard, Screen reader and 200% text reflow.

## Programme-wide Backend Contract
For every phase assess database schema/migration/constraints/indexes/defaults/nullability/FKs/history compatibility; API authentication/authorization/validation/idempotency/concurrency/error handling/rate limiting/abuse prevention; RLS for Anonymous, Authenticated non-member, Applicant, Offered member, Accepted member, Active member, Former member, Project Lead, Reviewer and Admin. Every state transition is server validated. Prevent duplicate membership/interest/offers, over-capacity, multiple accidental Leads, orphaned runs, deleted history and stale access. Reuse canonical notification infrastructure. Audit consequential Admin/system actions.

## Email & Notification Policy
In-app is default operational communication; email is selective. Do not email every Chat/task update. Use email for important decisions, commitments, security, external invitations and significant project changes. Optional reminders respect preference; critical security/transactional communication remains available. Sensitive support/conflict details never appear in ordinary email. Reuse notification, outbox, template, email-delivery, dedupe and cron architecture; never scatter bespoke provider calls.

## Design System Contract
All new UI must feel native to Mettelo. Reuse typography, spacing, colour system, cards, buttons, forms, status badges, dialogs, navigation, Lab patterns, empty states and responsive rules. Prefer reusable primitives such as MemberIdentity, MemberHandle, ParticipationMode, TeamCapacity, TeamReadiness, InterestFlow, ProjectOffer, OfferStatus, TeamRoster, ProjectHealth, WeeklyPulse, ProjectInvite, ReplacementStatus, SupportCase and ContributionStatus.

## UX Writing Contract
Avoid accusatory language. Prefer “No recent project update” over “Inactive member”; “Request member removal” over “Kick member out”; “Team forming” over “Incomplete team”; “Project needs attention” over “Failed project”; “Your participation needs attention” over “You failed to participate”.

## Documentation Contract
Every functional change updates relevant repository documentation in the SAME PR, including Architecture, Features, Design System, Regression Testing, Decisions, Open Issues, Onboarding, auth standards, project documentation and database documentation as relevant. A feature PR without required docs is incomplete.

## Phase Execution Gate
Before every phase implementation output a PHASE N — READINESS REVIEW covering current architecture, problem, existing functionality, functionality to preserve, backend/database/API/RLS/state/member UI/Admin UI/form/notification/email/cron/analytics/accessibility/security impacts, likely files/migrations, existing/new tests, duplication assessment, regression surface, rollback strategy, documentation changes and success criteria. End by stating no implementation has yet occurred and await confirmation.

## Phase Completion Report
After implementation report architecture assessed, preservation, backend/database/migration/API/RLS/security/state/member UI/Admin UI/forms/notifications/email/cron/analytics/accessibility, tests added/executed, regressions, files changed, systems reused, duplication avoided, docs, remaining risks and deferred items. Mark every success criterion PASS, FAIL, BLOCKED or NOT APPLICABLE. Never claim completion with critical failures.

## No Silent Regression / Scope Expansion
If new functionality breaks accepted behaviour: STOP, investigate root cause, never disable working features to make new work pass. If requirement belongs to later phase, document and defer it rather than silently expanding scope.

## PR Strategy
One phase need not be one giant PR. Split safely into schema/contract, backend, member UX, Admin UX and integration PRs when appropriate. Never merge a state where old UI can create invalid new backend state. Each merged PR leaves system coherent.

## FINAL PROGRAMME DEFINITION OF DONE
The programme is complete only when:
1. Repository governance followed.
2. Current Rolling Green Baseline verified.
3. Database provenance is safe.
4. Existing Auth preserved.
5. Username works.
6. Existing users remain functional.
7. Onboarding works.
8. Profile remains distinct from Proof.
9. Account/privacy preferences work.
10. Canonical Project model works.
11. Project source governance works.
12. Public Project uses canonical data.
13. Member Project uses canonical data.
14. Submit Interest is the one primary conversion action.
15. Role selection is not required before interest.
16. Profile data is reused.
17. Duplicate interest is prevented.
18. Admin review works.
19. Selection produces Offer.
20. Member explicitly Accepts/Declines.
21. Offer capacity reservation works.
22. Offer expiry works.
23. Minimum/Target/Maximum team works.
24. Team mode works.
25. Solo mode works.
26. Flexible mode works.
27. Team formation works.
28. Project Lead works.
29. Responsibilities assigned after selection.
30. Start readiness works.
31. Lab receives canonical data automatically.
32. Private resources remain protected.
33. Existing Chat reused.
34. Existing Meetings reused.
35. Existing Tasks reused.
36. Mentions work.
37. Username identity works in collaboration.
38. Email is selective.
39. Notification preferences work.
40. Weekly Pulse works.
41. Team Health works.
42. Solo-to-team conversion works.
43. Active member leave works.
44. Handover works.
45. Replacement works.
46. Support cases work.
47. Support privacy works.
48. Member discovery works safely.
49. Invitations work.
50. Anti-abuse works.
51. Project completion works.
52. Completion remains separate from Proof.
53. Contribution attribution works.
54. Proof verification works.
55. Leadership evidence remains credible.
56. Admin can create future projects without developers.
57. New projects automatically render across Public/Member/Lab.
58. Project duplication is safe.
59. Analytics covers lifecycle.
60. Sensitive data is not unnecessarily captured.
61. RLS protects all new data.
62. Service role remains server-only.
63. Migrations are safe.
64. All forms satisfy the Form Quality Contract.
65. Mobile passes.
66. Tablet passes.
67. Desktop passes.
68. WCAG 2.2 AA passes.
69. 200% reflow passes.
70. Public regression passes.
71. Auth regression passes.
72. Member regression passes.
73. Application regression passes.
74. Admin regression passes.
75. Lab regression passes.
76. Collaboration regression passes.
77. Security tests pass.
78. Migration validation passes.
79. Lint passes.
80. Typecheck passes.
81. Build passes.
82. Deployment Gate passes.
83. Release Gate passes.
84. Documentation matches implementation.
85. No duplicate architecture exists.
86. No incompatible legacy path remains active.
87. No standard project requires custom developer implementation.
88. Post-merge main SHA is verified.
89. New Rolling Green Baseline is only declared after exact-SHA evidence.

## REQUIRED FIRST RESPONSE FROM THE IMPLEMENTATION AI
When receiving this playbook:
- DO NOT MODIFY CODE.
- DO NOT CREATE MIGRATIONS.
- DO NOT CREATE FEATURE BRANCHES UNTIL THE REPOSITORY STARTUP CONTRACT HAS BEEN FOLLOWED.
- DO NOT ASSUME OLD CHAT OR HISTORICAL PR STATUS IS CURRENT.
- Execute repository `AGENTS.md` first.
- Then produce the METTELO PROJECT EXPERIENCE — PROGRAMME PRE-FLIGHT AUDIT covering current main SHA, Rolling Green Baseline, CI, deployment, open PRs/branches, docs read, every major architecture from Auth through Proof/RLS/tests, existing/partial/missing capability assessment, duplicate/database/security/UX/migration/release risks, Preservation Register, Form & Interaction Register, Communication/Cron/Analytics matrices, recommended PR strategy and implementation ordering.
- Then produce PHASE 1 — READINESS REVIEW and mark every Phase 1 success criterion NOT YET TESTED.
- Do not start Phase 1 until assessment and success criteria are reviewed and confirmed.

## FINAL AI OPERATING PRINCIPLE
PRESERVE FIRST.
UNDERSTAND BEFORE CHANGING.
REUSE BEFORE CREATING.
EXTEND BEFORE REPLACING.
BACKEND AND UI MUST AGREE.
SECURITY MUST BE SERVER-ENFORCED.
EMAIL MUST BE SELECTIVE.
PROJECT HISTORY MUST BE PRESERVED.
PROOF MUST REMAIN EVIDENCE-BASED.
TEST EVERY AFFECTED JOURNEY.
ONLY MOVE FORWARD AFTER THE PHASE SUCCESS CRITERIA ARE PROVEN.

# 5. Additional enterprise change-management controls

### 5.1 Business analysis traceability
Every requirement must be traceable from: `business outcome -> user journey -> acceptance criterion -> architecture owner -> implementation PR -> automated/manual evidence -> merged SHA`.

### 5.2 Stakeholder / administrative impact assessment
For each phase identify affected operational users: anonymous visitor, new member, existing member, applicant, offered member, accepted member, active member, former member, Project Lead, reviewer, Admin, support/safeguarding operator, platform administrator and release operator. Update Admin controls, runbooks and support guidance wherever workflows change.

### 5.3 Data-change governance
- Prefer additive migrations before destructive changes.
- Never drop or repurpose historical state until all consumers and rollback implications are proven.
- Protect referential integrity for projects, runs, memberships, applications, offers, invitations, contributions and Proof.
- Test concurrency and idempotency at transitions that reserve capacity, create membership, assign leadership, accept invitations/offers, complete projects or verify Proof.
- Service-role usage remains server-only and narrowly scoped.

### 5.4 Release and rollback management
- Use phase-safe PR decomposition when safer than a giant PR.
- Maintain backward compatibility across intermediate merged states.
- Prefer forward-fix for additive schema issues where rollback could destroy valid data.
- Define a rollback path for UI/API changes and a forward-only recovery plan for irreversible data migrations.
- Verify post-merge `main` SHA and confirm new Rolling Green Baseline only after exact-SHA evidence.

### 5.5 Change communication
For material user/admin workflow changes, prepare concise release notes covering what changed, who is affected, any new action required, what remains unchanged, known limitations, support route and rollback/incident ownership. Never expose sensitive implementation/security details in public release notes.

### 5.6 Programme completion rule
The programme is not complete because all features appear in the UI. It is complete only when source-defined programme Definition of Done, all phase criteria, documentation, data integrity, security/RLS, accessibility, regressions, deployment/release gates, no-duplicate-architecture requirement and post-merge exact-SHA evidence are all satisfied.
