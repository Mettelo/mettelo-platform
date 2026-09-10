# Project Experience Phase 11 — Project Alignment & Start Readiness

**Status: FINAL VALIDATION IN PROGRESS — NOT APPROVED**

Phase 11 prevents a project from becoming active until its operating environment is ready. It extends the existing Phase 9/10 start boundary; it does not create a second project lifecycle, run system, membership system, Lab, responsibility model, leadership model, or start service.

Phase 10 / PR #219 is now merged into `main`. Phase 11 is based on current `main`; it is no longer waiting on an unmerged Phase 10 branch.

## Canonical inheritance

Phase 11 preserves:

- `projects` as the project definition/lifecycle record;
- `project_runs` as the cohort/run authority;
- `project_members` as the participation authority;
- `project_member_responsibilities` as Phase 10 delivery ownership/history;
- `project_members.team_role='project_lead'` as Project Lead authority;
- `project_experience_readiness` as the existing project/Lab definition-readiness source;
- Phase 9 participation, capacity, scheduling and atomic activation rules;
- `startProjectRun()` as the application-level start entry point;
- `phase9_activate_project_run()` as the final database-atomic ACTIVE transition.

## Phase 11 readiness model

A project is start-ready only when all three readiness groups are true.

### Project readiness

The canonical project definition must be valid and publication-ready. Phase 11 consumes `project_experience_readiness` and the existing problem-brief model rather than introducing another project definition checklist. It also requires real alignment content including key questions and in/out-of-scope boundaries.

### Team readiness

The current canonical run must have confirmed live members, meet its effective minimum, remain within maximum capacity, have one confirmed Project Lead where the run requires team governance, and have normalized responsibility ownership for each live member where collaborative delivery requires it. Threshold-1 Solo/Flexible delivery does not receive artificial Team-only Lead/responsibility blockers. REVIEW_REQUIRED participation must be backed by the accepted, unreleased and consumed Project Offer for the same application/run.

### System readiness

The run must still be a valid pre-start run, must not be start-blocked or paused, and canonical Lab readiness must be true. Phase 11 also checks canonical milestone readiness, governed private-resource provisioning, AUTO schedule eligibility, kickoff mechanism availability and the existing support route.

## Canonical start action

The Phase 11 start action flows through:

`Admin / scheduler / governed caller -> startProjectRun() -> phase11_project_start_readiness() -> phase9_activate_project_run()`

The database activation remains the final transactional authority. A Phase 11 trigger guards the `project_runs` ACTIVE transition itself, rechecking current readiness before a privileged or stale caller can activate a run. AUTO runs additionally cannot bypass their configured intervention deadline, paused state or blocked state.

Kickoff communication is emitted only after confirmed atomic activation and uses a run/member dedupe key.

### Admin start hardening

The legacy Admin `force_start` path previously mutated run/member/application/project activation state directly. Phase 11 removes that split authority: Admin start delegates to `startProjectRun()` and therefore cannot bypass the canonical readiness and atomic activation checks.

## Versioned Phase 11 migrations

1. `20260906020000_project_experience_phase_11_start_readiness.sql` — initial grouped Project/Team/System readiness projection.
2. `20260906020100_project_experience_phase_11_readiness_hardening.sql` — explicit reason codes, canonical alignment/resource/milestone checks and configurable AUTO intervention window.
3. `20260906020200_project_experience_phase_11_activation_guard.sql` — database invariant guarding the `project_runs` ACTIVE transition.
4. `20260906020300_project_experience_phase_11_final_authority.sql` — final service-only readiness wrapper, exact-run Project Offer authority and AUTO schedule eligibility.

No hosted-only DDL is permitted.

## Security boundary

`phase11_project_start_readiness` is `SECURITY DEFINER`, uses a fixed `search_path`, is revoked from `public`, `anon` and `authenticated`, and is executable only by `service_role`. Its renamed base implementation is revoked from all roles, including `service_role`; callers use only the canonical wrapper. The activation guard is not exposed to ordinary clients. Member-facing readiness is projected through authorized server paths; privileged internal readiness data is not exposed directly to clients.

## Phase 11 success criteria

| # | Criterion | Current status |
|---|---|---|
| 1 | Incomplete project cannot start accidentally | IMPLEMENTED — grouped readiness plus database ACTIVE-transition guard; exact-head runtime validation pending |
| 2 | Team minimum enforced | IMPLEMENTED — projection and existing atomic activation |
| 3 | Solo/Flexible threshold-1 readiness works | IMPLEMENTED contractually; exact-head backend journey validation pending |
| 4 | Lab ready before start | IMPLEMENTED — projection plus activation guard/atomic recheck |
| 5 | Access/private resource readiness | IMPLEMENTED — governed internal-storage gaps block readiness; runtime validation pending |
| 6 | First milestone ready | IMPLEMENTED — canonical milestone required; runtime validation pending |
| 7 | Kickoff communication works | IMPLEMENTED through canonical post-activation notification with dedupe; runtime/outbox validation pending |
| 8 | Start transition idempotent | Existing atomic activation retained; exact-head double/concurrent validation pending |
| 9 | Member state updates | Existing atomic activation retained; exact-head backend validation pending |
| 10 | Admin state/readiness updates | IMPLEMENTED — direct-start bypass removed and grouped Admin readiness UI added |
| 11 | RLS/function grants correct | IMPLEMENTED contractually; exact-head isolated reconstruction/security validation pending |
| 12 | Start E2E passes | PENDING final exact-head authenticated validation |
| 13 | Docs updated | IMPLEMENTED — this document records the current four-migration design and remaining validation |

## Mandatory final validation before Phase 11 sign-off

- exact-head isolated Supabase reconstruction across all four Phase 11 migrations;
- Team, Solo and Flexible backend start journeys under final Phase 11 readiness;
- missing Lead/responsibility, below-minimum, over-capacity, paused, blocked, schedule-not-due and stale-readiness cases;
- exact-run REVIEW_REQUIRED Offer authority;
- direct ACTIVE-write denial through the database activation guard;
- double/concurrent start idempotency and post-start run/member/application state;
- kickoff notification/outbox deduplication;
- final exact-head lint, typecheck, build, blocking regression/E2E, Event Room contract and protected Release Gate.

**Do not approve, mark ready, or merge Phase 11 while any mandatory validation item or exact-head protected gate remains unresolved.**
