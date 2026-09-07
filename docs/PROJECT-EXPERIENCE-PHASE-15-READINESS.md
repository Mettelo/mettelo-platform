# Project Experience Phase 15 — Solo Delivery & Solo-to-Team Conversion

**Status: IN PROGRESS / NOT APPROVED**

**Stacked base:** Phase 14 branch `feature/project-experience-phase-14`

## Authoritative objective

Allow work to start without waiting for team liquidity.

Phase 15 must extend the existing canonical participation, run, membership, Lab, recruitment, contribution and Proof architecture. It must not create a parallel conversion or membership system.

## Source-defined requirements

### Solo start

For Solo/Flexible projects, an accepted member must be able to progress through the existing canonical chain:

`accepted member → run → membership → Lab → project start`

### Solo UI

Where the member is currently working independently, the product must communicate:

- WORKING INDEPENDENTLY;
- current project state;
- target team;
- joining availability;
- Invite collaborator, where permitted;
- Open collaboration place, where permitted.

### Solo → Team

A later collaborator must join the **same run**. The transition must not unnecessarily create a separate project or run and must preserve:

- tasks;
- milestones;
- chat;
- history;
- resources;
- contribution history.

### Proof integrity

Solo work may evidence Technical Delivery, Ownership, Problem Solving, Documentation and Communication. Solo delivery must not automatically infer Collaboration or Peer Leadership.

## Existing canonical architecture confirmed before change

### Phase 9 participation/run authority

`projects.participation_mode` remains the authority for `solo`, `team` and `flexible` participation.

The existing Phase 9 runtime contract already establishes:

- Solo and Flexible runs have a canonical minimum start threshold of one member;
- Team runs use the project minimum viable team size;
- target team size is planning guidance, not a start threshold;
- pure Solo capacity is one member;
- Flexible capacity can grow toward target/max capacity;
- started-run thresholds are preserved rather than rewritten after activation;
- capacity is enforced by a database trigger on canonical `project_members`;
- one live membership per user/run is protected by a partial unique index;
- active recruiting runs have a dedicated operational index.

### Atomic run activation

The existing Phase 9 activation function revalidates project, run, capacity, readiness and lifecycle state in one transaction. One-person run geometry explicitly bypasses Team-only responsibility/lead gates. This means the backend already has a valid one-member activation path for Solo/Flexible, subject to the normal Lab/readiness and lifecycle contracts.

### Existing late joining

Phase 6 and Phase 10 late-admission contracts already prefer the existing started active run and prevent unnecessary competing-run creation where late joining is not allowed. Phase 15 must preserve and prove this behaviour rather than introduce a new join path.

## Director audit still required before implementation/sign-off

The following must be traced end to end before declaring an existing contract sufficient or introducing changes:

1. accepted-member → one-member run → active membership → Lab → start for Solo;
2. same journey for Flexible with one member;
3. Team-only negative start path;
4. AUTO and REVIEW_REQUIRED later collaborator admission into the exact active run;
5. invitations/open collaboration place UI and authority;
6. new-member RLS access to authorised existing same-run tasks, milestones, chat/history and resources;
7. contribution and Proof attribution before and after conversion;
8. member-facing Solo state and joining availability in Lab;
9. Admin visibility of independent/converted state where operationally required;
10. preference-aware notifications using the canonical notification engine;
11. privacy-safe analytics without sensitive free text;
12. public/discover/project-card consequences of participation/joining state;
13. responsive, keyboard, screen-reader and 200% reflow behaviour;
14. exact-head regression and fresh-database reconstruction.

## Success criteria evidence register

| # | Criterion | Current evidence status |
|---|---|---|
| 1 | Solo start works | PARTIAL — database start threshold/activation authority exists; authenticated journey proof pending |
| 2 | Flexible solo works | PARTIAL — database minimum is one; authenticated journey proof pending |
| 3 | Team-only cannot start solo | PARTIAL — Phase 9 minimum-team rule exists; negative E2E pending |
| 4 | Same run supports later collaborator | PARTIAL — existing late-join authority prefers active run; end-to-end proof pending |
| 5 | History preserved | BLOCKED pending same-run conversion E2E |
| 6 | Contribution preserved | BLOCKED pending contribution attribution audit/E2E |
| 7 | Tasks preserved | BLOCKED pending Lab/RLS conversion E2E |
| 8 | Milestones preserved | BLOCKED pending Lab/RLS conversion E2E |
| 9 | Proof integrity preserved | BLOCKED pending Proof inference/attribution audit |
| 10 | Joining rules enforced | PARTIAL — canonical late-join/cutoff/recruitment rules exist; actor tests pending |
| 11 | Capacity enforced | PARTIAL — DB trigger exists; concurrent/negative E2E pending |
| 12 | RLS correct | BLOCKED pending member/new-member/outsider matrix |
| 13 | Solo-to-team E2E passes | BLOCKED |
| 14 | Docs updated | IN PROGRESS |

No criterion is considered PASS until the repository, database and relevant browser/RLS evidence support it on the exact Phase 15 head.

## Mandatory release gates

Before Phase 15 can be signed off:

- lint;
- typecheck;
- production build;
- blocking regression;
- fresh isolated Supabase migration replay for any schema changes;
- RLS/IDOR negative tests;
- database CRUD/state-transition tests;
- Solo start and Flexible-solo authenticated E2E;
- Team-only negative-start E2E;
- Solo-to-team same-run E2E;
- Lab/collaboration regression covering tasks, milestones, chat/history/resources;
- contribution and Proof integrity regression;
- Admin/member/public/discover regression where affected;
- mobile/tablet/desktop and 200% reflow;
- keyboard/screen-reader/accessibility checks;
- exact-head protected Release Gate;
- dependency-chain safety.

## Change-control rule

Do not mark Phase 15 APPROVED while any material gap, skipped critical test, Supabase/RLS inconsistency or dependency-chain risk remains unresolved. Any new commit invalidates prior exact-head release evidence.