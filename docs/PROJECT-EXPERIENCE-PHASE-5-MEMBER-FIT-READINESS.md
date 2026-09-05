# Project Experience Phase 5 — Member Project Experience & Qualification

## Purpose

Phase 5 is the authenticated project decision and qualification layer between Phase 4 public discovery and the Phase 6 interest form.

Canonical journey:

`UNDERSTAND PROJECT → UNDERSTAND FIT → UNDERSTAND TEAM/CAPACITY → UNDERSTAND ELIGIBILITY → RESOLVE PROFILE READINESS IF NEEDED → SEE EXISTING INTEREST/PARTICIPATION STATE → SUBMIT INTEREST → PHASE 6`

The one dominant conversion action is **Submit Interest**.

Phase 5 does **not** create a second project model, second tracker, separate application engine, early interest record, formal role reservation, or Lab membership.

## Non-negotiable role boundary

Possible delivery roles may be shown as **Possible contribution areas** to help the member understand the work.

They are informational in Phase 5:

- no mandatory role selector;
- no `Apply for role` CTA;
- no `Apply as contributor` CTA;
- no role ID required to enter Phase 6;
- no implication that initial interest is specifically an application for `Data Analyst`, `Engineer`, or another formal delivery role;
- responsibilities can be assigned later after review/team formation.

## Canonical architecture

Phase 5 reuses:

- the Phase 3 canonical project ID/content model;
- Phase 3 participation mode and min/target/max team fields;
- current project run/member state;
- Phase 2 member readiness engine;
- authenticated `auth.user.id` identity;
- current `project_applications` / interest history;
- current `project_members` participation history;
- existing Applications tracker;
- existing Phase 6 `/member/discover/[id]/apply` route and `/api/project-applications` persistence service.

No new Phase 5 database table or persisted fit score is required.

## One structured qualification contract

`resolveMemberProjectQualification()` is the canonical pure domain decision and returns:

- `state` — member-project lifecycle/CTA state;
- `reason` — structured qualification reason;
- `eligible` — whether Submit Interest is currently allowed.

Current reasons include:

- `ELIGIBLE`;
- `PROFILE_INCOMPLETE`;
- `INTEREST_EXISTS`;
- `PROJECT_CLOSED`;
- `CAPACITY_FULL`;
- `ALREADY_PARTICIPATING`;
- `DEADLINE_PASSED`;
- `CAPACITY_UNKNOWN`;
- completed/cancelled equivalents.

The existing state resolver delegates to this contract so page/catalogue behavior cannot define a competing eligibility matrix.

## Qualification inputs

Phase 5 eligibility is derived from authoritative server state:

1. authenticated identity;
2. canonical Phase 2 profile readiness;
3. current project recruitment/lifecycle state;
4. current active interest/application state;
5. project-level capacity;
6. previous/current participation constraints;
7. application/interest deadline.

Client-disabled controls are not security. The Phase 6 entry route and canonical submission API re-read persisted state before a write.

## Project fit

Fit is transparent decision support, not an automated acceptance score.

Current advisory signals may include:

- domain alignment;
- tool alignment;
- experience context;
- career/capability alignment;
- weekly commitment vs saved availability;
- per-contribution-area capability overlap.

A weekly-capacity mismatch is **advisory in Phase 5**. It may help the member make a realistic decision, but it does not create a new hard eligibility rule unless a later approved product contract explicitly makes it one.

## Team and capacity contract

The member page explains, from current Supabase state:

- participation mode;
- confirmed members;
- currently reserved/offered places where relevant;
- minimum team size;
- target team size;
- maximum team size;
- current team/project state;
- whether project capacity remains available.

Minimum, target and maximum are distinct concepts. Target is not presented as the minimum required to start.

For open projects, the current relevant run/cohort is used. For partner/single-cycle projects, current project membership is used. Reserved/waiting places count toward capacity where the existing model treats them as occupied.

Project-level capacity controls Phase 5 qualification. Per-role capacity may still be shown as context but does not force initial role selection.

## Existing interest and participation

Phase 5 detects active interest/application state for the authenticated user and exact project. Historic declined/withdrawn records do not permanently block a new request.

Existing active state replaces Submit Interest with the current Applications tracker action.

Existing waiting/active/completed membership replaces Submit Interest with the appropriate Projects/active/completed state.

## Profile readiness and safe exact-project return

Phase 5 reuses `calculateMemberReadiness()` and does not duplicate required profile fields in page JSX.

If profile readiness is incomplete:

- Submit Interest routes to profile completion;
- the `next` target is the exact project plus `#member-decision-title`;
- `ProfileReturnAfterSave` accepts only same-origin internal paths and rejects protocol-relative (`//`), backslash and foreign-origin targets;
- profile save completes before the `mettelo:profile-updated` return event navigates;
- the member project re-reads backend state and recalculates qualification;
- the qualification heading is programmatically focusable and receives focus after return;
- no interest record is created before Phase 6 final submission.

## Phase 6 handoff

Eligible member:

`Member Project → Submit Interest → /member/discover/[id]/apply → canonical Phase 6 interest form`

The initial handoff requires project/member qualification, not a project role ID.

The current Phase 6 form submits `application_kind='interest'` through `/api/project-applications`; `project_role_id` remains null for initial interest unless a later approved flow intentionally assigns a formal role.

The API revalidates authentication, profile readiness, project state/deadline, active interest, prior participation and project capacity immediately before insert.

## Supabase / RLS

Phase 5 requires repository-versioned schema and policies only.

Relevant owner/privacy boundaries:

- member profile reads are owner-scoped;
- profile domain/tool preferences are owner-scoped;
- application/interest reads are user-or-admin scoped;
- membership reads are user-or-admin scoped;
- project visibility remains canonical;
- member-specific qualification data is not exposed anonymously;
- service role is used only for protected server-side aggregate/project membership evaluation, not to bypass broken member RLS;
- submitting interest does not create project membership or Lab access.

`tests/project-experience-phase5-member-fit-security.spec.ts` provides isolated cross-user RLS coverage.

## Accessibility / responsive contract

Required evidence includes:

- 320px member project;
- 375/390/414 mobile;
- tablet;
- desktop;
- 200% text reflow without horizontal page overflow;
- keyboard activation of Submit Interest/profile/tracker actions;
- visible focus;
- status meaning expressed in text rather than colour alone;
- semantic headings/navigation;
- qualification focus after profile return;
- mobile primary CTA not obscuring content/browser UI.

## Documentation authority

Detailed acceptance evidence is maintained in:

- `docs/PROJECT-EXPERIENCE-PHASE-5-FULL-ACCEPTANCE-REVIEW.md` — 80 stories, 50 mandatory tests, 63-point Director matrix;
- `docs/PROJECT-EXPERIENCE-PHASE-5-DIRECTOR-SIGN-OFF-REVIEW.md` — Director summary and final decision.

## Current implementation status

Implemented in PR #214:

- canonical authenticated member project detail;
- transparent advisory fit signals;
- canonical Phase 2 profile readiness reuse;
- current project team state helper with confirmed/reserved/min/target/max/capacity;
- active interest/application detection across current request kinds;
- existing participation state detection;
- one dominant `Submit Interest` CTA;
- no required role selection before initial interest;
- Possible contribution areas rendered informationally;
- structured shared qualification result;
- hardened exact-project profile repair route and focus restoration;
- Phase 6 route revalidates qualification without requiring `?role=`;
- Phase 6 form submits interest without formal role assignment;
- `/api/project-applications` revalidates profile readiness, deadline/project state, active interest, prior participation and project capacity before insert;
- no fit score persistence or Phase 5 schema addition;
- isolated RLS security coverage;
- authenticated responsive browser coverage updated to the canonical interest journey.

## Sign-off state

**NOT APPROVED** until the final documentation-inclusive exact head passes all mandatory lint, typecheck, build, blocking regression, isolated Supabase/RLS, authenticated browser/responsive/accessibility, Event Room and protected Release Gate checks.

Source review is not a substitute for runtime evidence.
