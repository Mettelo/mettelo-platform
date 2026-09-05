# Project Experience Phase 9 — Team / Solo / Flexible Participation Model

**Status:** implementation on stacked draft Phase 9 branch. Not approved for merge or deployment.

**Dependency chain:** Phase 6 → Phase 7 → Phase 8 → Phase 9. Phase 9 is based on the exact Phase 8 head `60ac7355a47225b62065543a56c6c3101f5d41b9` and must be retargeted/revalidated if an upstream phase changes.

## Goal

Phase 9 activates the canonical project participation geometry already defined in Phase 3 and used by Phase 6/8:

```text
TEAM
minimum starts the run
 target is preferred planning size
 maximum caps the run

SOLO
minimum = target = maximum = 1

FLEXIBLE
minimum = 1
 target is preferred planning size
 maximum caps the run
 late joining may continue after start when policy allows
```

The critical product rule is:

```text
MINIMUM starts the project.
TARGET never blocks start.
MAXIMUM cannot be exceeded.
```

Participation mode is independent from admission mode. REVIEW_REQUIRED acceptance must receive the same Team/Solo/Flexible runtime semantics as AUTO-qualified participation.

## Canonical architecture reused

Phase 9 does not introduce a second project/team system.

It reuses:

- `projects.participation_mode`;
- `projects.min_team_size`;
- `projects.target_team_size`;
- `projects.max_team_size`;
- compatibility `projects.team_size_threshold`;
- `project_applications.participation_preference`;
- canonical `project_runs`;
- canonical `project_members`;
- Phase 6 late-joining policy (`late_joining_enabled`, `late_joining_cutoff_at`, run `recruitment_open`);
- Phase 8 accepted Offer reservation/consumption;
- canonical `startProjectRun()`;
- existing Lab/start-readiness architecture.

No `team_v2`, `membership_v2`, participation-v2 or second late-join subsystem is introduced.

## Existing project-definition constraints

Phase 3 already enforces:

- valid modes are `solo`, `team`, `flexible`;
- `1 <= min <= target <= max <= 50`;
- Solo = `1 / 1 / 1`;
- Team minimum >= 2;
- Flexible minimum = 1;
- legacy `team_size_threshold` stays synchronized with canonical minimum.

Phase 9 preserves these constraints rather than replacing them.

## Runtime run contract

Migration:

`20260906001000_project_experience_phase_9_participation_runtime.sql`

For **unstarted** canonical runs:

- Solo required team size = 1;
- Flexible required team size = 1;
- Team required team size = project minimum;
- target team size is never written as the required start threshold.

A database trigger keeps new/forming runs aligned with the project definition.

Once a run has started, its historical `required_team_size` is not rewritten by later project-definition changes. This preserves run history and auditability.

## Maximum-capacity invariant

Phase 6 and Phase 8 already enforce capacity inside their own admission/Offer flows. Phase 9 closes the cross-phase gap by enforcing maximum capacity at the canonical `project_members` boundary as well.

Before any membership enters `waiting` or `active`:

1. project and run relationship is validated;
2. the project-level advisory lock shared with Phase 6 is acquired;
3. current waiting/active members are counted;
4. project maximum is revalidated;
5. an over-capacity write fails with `PARTICIPATION_CAPACITY_FULL`.

This makes maximum capacity invariant even when a later team-formation phase creates membership directly.

A partial unique index also guarantees one live waiting/active membership per `project_run_id + user_id` while preserving historical non-live rows.

## Capacity snapshot

Service-only RPC:

`phase9_project_run_capacity(project_id, run_id)`

returns canonical runtime facts:

- participation mode;
- minimum;
- target;
- maximum;
- occupied;
- ready;
- target reached;
- capacity available;
- late joining allowed.

The function is operational and service-only because private project membership counts must not become a browser-side RLS bypass.

## Start readiness

`startProjectRun()` now reads the project participation mode directly.

Previously, the single-member exception was inferred from AUTO-qualified application preferences. That meant a REVIEW_REQUIRED Solo/Flexible run could be incorrectly subjected to Team-only responsibility-coverage and Project-Lead gates.

Phase 9 changes this to participation-mode semantics:

- Solo + required=1 → one-member participation readiness;
- Flexible + required=1 → one-member participation readiness;
- Team → normal team responsibility/lead rules continue;
- admission mode does not redefine participation geometry.

Acceptance still does not bypass Lab/readiness checks or automatically start a project.

## Late joining

Phase 6 already owns the canonical late-joining architecture. Phase 9 reuses it.

A started run can accept another eligible participant only when:

- project policy enables late joining;
- optional cutoff has not passed;
- run recruitment is open;
- current occupancy is below maximum.

Phase 9 adds an index for locating an active recruiting run efficiently.

No late join creates a second run merely to bypass a closed active-run policy.

## Phase 8 compatibility

Accepted REVIEW_REQUIRED Offers remain historical accepted evidence.

When later canonical membership is created:

```text
accepted Offer reservation
→ canonical project_members row
→ Offer capacity_consumed_at set
```

The member is therefore counted once, not once as membership plus once as an accepted reservation.

Member participation preference remains on the canonical application for Phase 10 formation logic.

## Public/member UX

Existing project detail surfaces already expose the Phase 9 model and are deliberately preserved:

Public project detail:

- Participation: Solo / Team / Flexible;
- Capacity: minimum–maximum with target shown separately.

Member project detail:

- participation mode;
- Team state;
- Confirmed;
- Minimum to start;
- Target team;
- Maximum team;
- reserved/offered capacity context.

This correctly communicates that the target is desirable rather than mandatory.

## RLS and authorization

Phase 9 does not loosen `project_members` RLS or expose the service-only capacity RPC to authenticated browser users.

Required release evidence includes:

- member can read only membership/project data already permitted by canonical RLS;
- other-member private membership remains protected;
- browser cannot invoke service-only capacity operations as a privilege escalation;
- Admin/service operational paths retain required visibility;
- direct membership writes by ordinary members remain prohibited;
- service role remains server-side.

## Mandatory Phase 9 verification

Release evidence must prove:

1. Team below minimum waits;
2. Team at minimum is ready even below target;
3. Solo one member is ready;
4. Flexible one member is ready;
5. target does not block start;
6. maximum capacity is enforced at database membership boundary;
7. duplicate live membership is blocked;
8. late joining is allowed while policy/window/capacity permit;
9. late joining is blocked after cutoff/recruitment closure/max capacity;
10. started run threshold history remains intact;
11. Phase 8 accepted Offer history/reservation consumption remains intact;
12. AUTO admission regression remains green;
13. REVIEW_REQUIRED acceptance remains compatible with later formation;
14. Lab/start readiness is not bypassed;
15. RLS/security tests remain green;
16. public/member participation UI remains responsive and accessible;
17. lint/typecheck/build/regression/E2E/Release Gate all pass on the exact final head.

## Hosted Supabase status

The connected hosted Supabase project is currently behind the stacked Phase 6/7/8 schema and does not yet contain `project_offers`. Therefore Phase 9 migration must **not** be manually applied to production ahead of its dependencies.

Required deployment order remains:

```text
Phase 6 migrations
→ Phase 7 migrations
→ Phase 8 migrations
→ Phase 9 migration
```

After those are merged/applied through the normal migration path, hosted schema, constraints, indexes, triggers, functions, RLS and CRUD must be revalidated before Phase 9 can be signed off.
