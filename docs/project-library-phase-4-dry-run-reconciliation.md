# PR #199 — Phase 4 Production Dry-Run and Identity Reconciliation

Date: 2026-09-03
Scope: Project Library canonical import architecture
PR: #199
Branch: `codex/task-project-library-architecture`

## Purpose

Phase 4 performs a read-only production reconciliation of the 300 Phase 3 staged Project IDs against the current `public.projects` table. No canonical production project content is written in this phase.

## Matching order

The reconciliation order is deterministic and non-fuzzy:

1. canonical Project ID (`projects.canonical_project_key`)
2. exact slug
3. exact normalised title
4. otherwise create

Any multiplicity or multiple workbook rows resolving to the same existing UUID is treated as a release blocker.

## Dry-run result

Staged projects evaluated: **300**

- canonical-key matches: **0**
- exact-slug matches: **116**
- exact-title-only matches: **1**
- planned creates: **183**
- ambiguous matches by multiplicity: **0**
- duplicate target UUID mappings: **0**

The single exact-title-only reconciliation is:

- Project ID: `B13-135`
- Title: `Parkinson’s Remote Monitoring & Longitudinal Symptom Intelligence`
- Existing UUID: `564ea08a-004c-4740-a001-2932dfd8c6f4`

## Existing project preservation

Current production projects: **122**

- existing projects matched to workbook: **117**
- existing projects not represented by the workbook and therefore explicitly preserved: **5**

All **117** matched existing UUIDs are present in the protected Phase 1 identity baseline. Zero matched UUIDs fall outside that baseline.

## Production mutation check

At the end of the Phase 4 dry run:

- production projects: **122**
- projects with canonical Project IDs: **0**

Therefore Phase 4 did not apply canonical project content or create any project rows.

## Phase 4 success criteria

- [x] Exactly 300 staged projects evaluated.
- [x] Existing project matches explicitly counted.
- [x] Planned creates explicitly counted.
- [x] Non-workbook projects explicitly counted for preservation.
- [x] Zero ambiguous matches.
- [x] Zero duplicate target UUID mappings.
- [x] Existing matching UUIDs are covered by the protected Phase 1 identity baseline.
- [x] No fuzzy matching used.
- [x] No project APPLY performed during this phase.
- [x] Production remains 122 projects / 0 canonical Project IDs.
- [x] No paid infrastructure introduced.

## Phase 5 gate

Phase 5 may proceed only with this exact reconciliation contract:

- preserve the 117 matched existing UUIDs
- create exactly 183 workbook projects unless production changes before APPLY
- preserve all 5 unrelated existing projects
- abort if any ambiguity, duplicate target mapping, or production identity drift is detected immediately before APPLY

A fresh pre-APPLY guard must rerun these counts at the start of Phase 5. If the production project set has changed, the APPLY must stop and Phase 4 must be rerun.
