# Project Experience Phase 11 — Project Alignment & Start Readiness

**Status: IMPLEMENTATION IN PROGRESS — NOT APPROVED**

Phase 11 exists to prevent a project from becoming active until its operating environment is ready. It extends the existing Phase 9/10 start boundary; it does not create a second project lifecycle, run system, membership system, Lab, responsibility model, leadership model, or start service.

## Canonical inheritance

Phase 11 must preserve:

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

The canonical project definition must be valid and publication-ready. Phase 11 consumes the existing readiness view rather than introducing another project definition checklist. The full Phase 11 acceptance pass must demonstrate the required brief, problem, context, objectives, key questions, scope, resources, deliverables, success criteria and timeline.

### Team readiness

The current canonical run must have confirmed live members, meet its effective minimum, remain within maximum capacity, have one confirmed Project Lead where the run requires team governance, and have normalized responsibility ownership for each live member where the run requires collaborative delivery. Threshold-1 Solo/Flexible delivery does not receive artificial Team-only Lead/responsibility blockers.

### System readiness

The run must still be a valid pre-start run, must not be start-blocked, must not be paused, and canonical Lab readiness must be true. Phase 11 acceptance must additionally prove permissions, private-resource access, first milestone readiness, kickoff readiness and a support route before sign-off.

## Canonical start action

The Phase 11 start action must flow through:

`Admin / scheduler / governed caller -> startProjectRun() -> phase9_activate_project_run()`

The database function remains the final transactional authority. It revalidates mutable project/run/team/Lab state under the existing lock order and atomically activates the run, waiting memberships and linked applications. Kickoff communication is emitted only after confirmed activation.

### Admin start hardening

The legacy Admin `force_start` path previously mutated run/member/application/project activation state directly. Phase 11 removes that split authority: Admin start now delegates to `startProjectRun()` and therefore cannot bypass the Phase 9/10 atomic activation checks.

## Versioned migration

1. `20260906020000_project_experience_phase_11_start_readiness.sql`

The migration adds the service-only `phase11_project_start_readiness(project_id, run_id)` projection. It composes the existing project, team and system facts into one structured readiness response. No hosted-only DDL is permitted.

## Security boundary

`phase11_project_start_readiness` is `SECURITY DEFINER`, uses a fixed `search_path`, is revoked from `public`, `anon` and `authenticated`, and is executable only by `service_role`. Member-facing readiness must be projected through an authorized server route; clients must not receive privileged internal blocker/detail data directly from the function.

## Phase 11 success criteria

| # | Criterion | Current status |
|---|---|---|
| 1 | Incomplete project cannot start accidentally | IN PROGRESS — project readiness projection plus final Phase 9 atomic recheck |
| 2 | Team minimum enforced | IMPLEMENTED in projection and existing atomic activation |
| 3 | Solo readiness works | IMPLEMENTED contractually; backend E2E still required |
| 4 | Lab ready before start | IMPLEMENTED in projection and existing atomic activation; E2E required |
| 5 | Access ready | NOT YET SIGNED OFF |
| 6 | First milestone ready | NOT YET SIGNED OFF |
| 7 | Kickoff communication works | Existing canonical start service retained; E2E required |
| 8 | Start transition idempotent | Existing atomic activation retained; concurrency/E2E required |
| 9 | Member state updates | Existing atomic activation retained; E2E required |
| 10 | Admin state updates | Admin direct-start bypass removed; Admin readiness UI/status still required |
| 11 | RLS correct | Function grant boundary implemented; full RLS review still required |
| 12 | Start E2E passes | NOT YET SIGNED OFF |
| 13 | Docs updated | IN PROGRESS — this document tracks Phase 11 implementation |

## Mandatory remaining work before Phase 11 sign-off

- prove the complete project-readiness field set against real project records;
- prove private resource provisioning/access and member permission boundaries;
- explicitly validate a first/current milestone is start-ready;
- verify kickoff/support-route readiness;
- expose grouped readiness and blockers in Admin Team Formation without leaking privileged data;
- expose a clear member pre-start state and next action;
- test Team, Solo and Flexible start geometry;
- test missing Lead, missing responsibility, below-minimum, over-capacity, paused, blocked and stale-readiness cases;
- prove concurrent/double start idempotency;
- prove run/member/application/Admin state after start;
- prove RLS/function grants/direct-write denial;
- verify kickoff notification/outbox behavior and deduplication;
- run isolated Supabase migration reconstruction;
- run lint, typecheck, build, blocking regression/E2E, Event Room contract and protected Release Gate on the final exact head;
- only after the stacked Phase 6→7→8→9→10 dependency chain is deployed, verify hosted Supabase schema/functions/grants without applying Phase 11 out of order.

**Do not approve or merge Phase 11 while any success criterion, upstream dependency, migration reconstruction, security proof, exact-head blocking gate or required E2E journey remains unresolved.**
