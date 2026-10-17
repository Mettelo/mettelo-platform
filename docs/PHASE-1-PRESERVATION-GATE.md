# Phase 1 preservation gate — 50-project migration

**Status:** OPEN / implementation blocked. **Snapshot date:** 17 October 2026. **Scope:** evidence and design only, no database writes or deployment.

## Phase 1 reviewed evidence
- Project Library: 50 catalogue records, IDs 001–050 unique; 50 master README files readable through connected GitHub integration. Ten early items have empty `use_case`/`data_source` metadata.
- Supabase current counts: 305 projects, 12 applications, 10 runs, 8 memberships, 4 offers, 0 final-proof submissions and 0 contributions.
- Direct foreign keys: 47 tables referencing `projects`, 37 tables referencing `project_runs`, with overlap.
- Other populated dependent tables: 4,500 deliverables, 300 data sources, 303 milestones, 300 problem briefs, 83 project notifications, 44 activity records, 14 discussions, 6 tasks.
- 11 projects have activity in at least one of application/run/member/offer/task/discussion/notification/activity tables; 294 have no references in these checked operational categories. The 294 **are not proven safe to delete**.
- No existing canonical key matches the new `MTL-<track>-<number>` naming model; do not auto-relabel historical records.

## Preservation disposition rules
| Data family | Approved default until migration proven | Release invariant |
| --- | --- | --- |
| Legacy public discovery | Retain until 50-record import + safe flag cutover | New public discovery shows precisely approved 50 only |
| Legacy projects linked to active/historical workflows | Retain original operational UUID, archive discoverability only | Authenticated member can access pre-existing project, tasks and runs |
| Applications and offers | Retain all IDs, review outcomes, transitions | Count, ownership, state, relationship unchanged |
| Runs and memberships | Retain original IDs, membership state, access policies | All active/waiting/completed memberships resolved |
| Lab communications, tasks, notifications and support | Retain and protect by RLS | No data loss, privilege escalation, or broken run isolation |
| Old master brief/data-source/milestone/deliverable fields | Candidate for eventual retirement only after full lineage audit | No unexpected reference loss; master GitHub remains content source |
| New 50 projects | Add managed catalogue IDs and approved operational mapping | 50 distinct publishable projects, 50 valid GitHub links |
| Team delivery | One team GitHub repository URL, versioned per run | Historical reads, review authority and independent Proof preserved |
| Existing entire Supabase instance | Keep during initial cutover | Auth/storage/service access and rollback intact |

## Phase 1 acceptance gate
- [x] Owner scope is 50
- [x] GitHub index is 50 unique entries
- [x] 50 master README documents accessible to the authenticated connector
- [x] FK topology inventory and sampled dependent-record counts
- [x] Target architecture and public/member/Lab content contracts documented
- [ ] Detailed 305-row classification covering ALL FK children, not only operational subsets
- [ ] Signed decision for blank catalogue metadata + anonymous GitHub link access
- [ ] Testable schema migration script and isolated backup/restore rehearsal
- [ ] Approved mobile/desktop wireframes
- [ ] Full historical-run and Auth/RLS/frontend regression baseline
- [ ] Owner acceptance of architecture, retention and cutover procedure

**Gate rule:** This report cannot authorize any database removal, Production update, deployment or runtime redesign. Block Phase 2 schema implementation until remaining Phase 1 criteria pass or the owner explicitly approves a separately non-destructive preparatory sub-phase.
