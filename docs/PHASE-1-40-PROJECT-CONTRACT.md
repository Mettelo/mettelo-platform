# Phase 1 — 50-project catalogue and experience contract
**State:** proposed acceptance contract; no runtime/database writes. **Base:** 07099572bfe01c49a746fda4a4406f72a284439c. **Deployment:** manual only, not CI acceptance.

## Entry conditions and phase success criteria
1. Exactly 50 unique approved `Mettelo/project-library/docs/projects.json` entries, at a pinned source commit, have a documented validation report including master repository availability and schema/taxonomy consistency. A failed/missing entry **blocks** approval rather than silently reducing the catalogue.
2. The new project content fields and page information architecture have one authoritative definition, for public /projects, public detail, authenticated Discover/detail and Lab overview. Every metadata field has a verified origin; no invented durations, eligibility or availability.
3. A complete existing-to-new disposition report classifies all 305 current Supabase `projects` records with dependency counts and actions. **Do not delete any row** during Phase 1.
4. Confirm exact protection contract for 12 applications, 10 project runs and 8 memberships observed on 17 October 2026; refresh counts and test rows before every later migration. Map offers, notifications, tasks, resource records and Proof. Historical records remain readable to authorised users.
5. Draft a new schema with stable external catalogue IDs, immutable operational project UUIDs/run IDs, snapshot provenance and separate team delivery repository records. Compare additive in-place vs isolated replacement before selection.
6. Define accessible mobile-to-desktop wireframes and state tables, including failures, closed/eligible status, applications, member views and direct GitHub master brief links; owner approves layouts before coding.
7. Confirm the final team submission contract: **one required user-entered team GitHub delivery repository URL**; existing summary>=30, conditional evidence URL and `phase19_submit_final_proof` logic must be updated together in a later phase. Independent member Proof review is preserved.
8. Phase output consists of decision record, schema/UX contract, data disposition and fully enumerated tests. No production, migration, code change or deployment permitted; human owner gate required.

## Content ownership and application authority
**GitHub master repos** are editorial truth for complete briefs, source files, detailed outputs and source instructions. **Mettelo** owns operational project identity, publication approval, verified dynamic eligibility, applications/roles, offers, run/team membership, Lab work, submissions, governance, review and Proof. The catalogue importer retains last approved snapshot through GitHub outages.

## Page contracts
| Surface | Required presentation | Must remain working |
| --- | --- | --- |
| Public catalogue | Exactly approved 50; concise 2–3 sentence business brief, track, sector/roles, search/facets, accurate count, pagination | SEO, links, signed-out access, mobile filter navigation |
| Public detail | Concise approximately 150–250-word summary; prominent labelled **Read master brief on GitHub** link; status, role/application CTA | Correct URL validation, dynamic eligibility, sign-in return, accessible navigation |
| Member Discover and detail | Same catalogue identity, with saves, fit/readiness and application/offer status from canonical policy | Existing server-side authorisation, applications, alerts, member navigation |
| Initial Mettelo Lab | Project title, short summary, team/run identity, role, master repo link; distinct team delivery status/input | Chat, team, tasks, RLS, support, review, notifications, completion and Proof; do not remove server-side dependencies merely because long project detail UI is hidden |

## Database disposition contract
Current read-only baseline 17 October 2026: `projects=305` (302 open, 1 draft, 1 forming, 1 pilot), `project_applications=12`, `project_runs=10`, `project_members=8`, `contributions=0`. These are observations, **not approval to delete**. Each project must be classified: (1) map to new 50, (2) archive/hide in public catalogue but preserve related operational data, (3) active historical operational retain, (4) manual review, (5) eligible for later deletion only after data-retention approval and verified backup/restore. All FK references and RLS must pass.

## Delivery acceptance contract
The master's brief repository and the team's delivery repository are distinct. For new GitHub-first runs, the UI requires only the team's delivery GitHub repository URL; server derives actor/run/time/audit metadata. URL allowlist/secure validation, membership authority, resubmission, review state, historical compatibility and review/Proof separation are mandatory. A URL being submitted must **not** auto-verify an individual member contribution.

## Exit-gate checklist and evidence
- [ ] 40/40 catalogue data validated at exact approved GitHub SHA.
- [ ] Every current project and all protected dependent records classified and counted.
- [ ] New ERD, mapping strategy, rollback and retention decision approved.
- [ ] Public, member and Lab page wireframes/state matrix approved.
- [ ] One-URL submission and member Proof separation signed off.
- [ ] Risk/UX/accessibility/regression matrix documented (320, 375, 390, 430, 768, 1024, 1280, 1440 px; keyboard, 200% zoom, WCAG 2.2 AA).
- [ ] Manual owner approval recorded before Phase 2 engineering.
- [ ] Only checks appropriate to this **docs-only** change required; no automated deployment.

**Gate rule:** If any criterion is incomplete, Phase 1 remains OPEN. No destructive database operation, frontend cutover or automatic deployment can proceed.


## Phase 1 audit evidence — 17 October 2026 (read-only)

### GitHub catalogue: launch cohort selection blocker
- `Mettelo/project-library/docs/projects.json` inspected blob SHA `524ef5de2838f0b849c6a6c4258c1aa53d312f60`.
- **45 entries, 45 unique IDs**, rather than previously documented 40. New items `MTL-BA-041` to `MTL-BA-045` form five **Business Analysis** projects. The agreed launch target is the original 001–040 cohort; **this is a candidate cohort definition, not automatic approval to hide five valid projects**.
- All 45 `status=Available`; all 45 have a `brief` and `roles`, and their master repository URL strings conform to the Mettelo GitHub URL pattern. Live target HTTP reachability was **not** verified.
- `use_case` and `data_source` are empty on **10 projects each**; schema audit should distinguish legacy optional-empty values from enforced required values. `source_guide` absent/empty on 30, `data_downloads` on 35; these latter two are explicitly optional. Do not invent content to pass checks.
- **Gate decision:** source-validation subcriterion remains open pending business confirmation whether initial cohort is 001–040, all 45, or another approved explicit list. The importer must implement explicit cohort pinning, not rely on the current growing JSON count.

### Supabase current-state baseline
Read-only standalone counts (avoid joined counts because multiple child rows can multiply joined totals):

| Table | Count |
| --- | ---: |
| `projects` | 305 |
| `project_applications` | 12 |
| `project_runs` | 10 |
| `project_members` | 8 |
| `project_offers` | 4 |
| `project_final_proof_submissions` | 0 |
| `contributions` | 0 |

The 305 projects include 302 open, one draft, one forming and one pilot. Applications touch 9 distinct project identities. The initial foreign-key inspection shows many additional children of projects/runs including tasks, capability paths, notifications, Lab data, final submission, governance, events and source records. The precise per-project archive/mapping disposition remains **uncompleted**: individual protected records must not be purged or reassigned.

### Unfinished verification and next steps
1. Confirm immutable source **commit SHA** (blob SHA above is file identity, not necessarily commit SHA), master repository HEAD/visibility and the initial approved cohort selection.
2. Generate per-project protected-dependency crosswalk and classified disposition, keeping identifying personal/member data out of published docs.
3. Draft approved ERD and compare in-place parallel schema against separate database design, with migration/rollback and historical preservation.
4. Complete public/member/Lab UX contract and one-repository-URL delivery acceptance scenarios.
5. Pass docs-only CI and obtain human sign-off. **This Phase 1 gate has not passed.** No deployment, schema mutations, delete or frontend cutover performed.


## Phase 1 owner decision: **50 launch projects** — 17 October 2026

**This is the controlling launch scope and overrides every earlier 40-project launch target, SRC-40 acceptance test and 45-entry selection blocker in this document.** The launch set is precisely `MTL-*-001` through `MTL-*-050`, using exact canonical full IDs in the validated index (do not derive track prefix from number).

Verified source: `Mettelo/project-library` current main commit `65dc740ac1c6c8f88868863a6772150c1a5a12f7`; `docs/projects.json` blob `44477ee087cf22a7d2a9427a7613186f96a407fe`. There are **50 entries and 50 distinct IDs**, with all numeric suffixes 001–050 present. All contain nonempty `brief`, `roles` and `repository` fields; all repository URLs pass structural Mettelo GitHub pattern checks (not yet independent HTTP/repository-access verification). All are marked `Available` in source metadata; this does **not** guarantee operational admission availability.

**Content issues:** ten early records (001–010) have blank `use_case` and `data_source`; existing schema docs list those fields. Determine whether to populate them from approved GitHub briefs or formally accept empty values with a documented fallback, before the validation gate passes. Never invent data sources or use-cases.

**Updated Phase 1 exit criteria:** (1) 50/50 approved source records from pinned commit, (2) 50 distinct project IDs and 50 master repos resolved and verified, (3) all mandatory fields/schema policy pass, (4) legacy 305 database records fully classified, protected FK integrity/backup and restoration documented, (5) 50-only public and member UX designs accepted, (6) one-URL delivery/independent Proof acceptance approved, (7) no Production writes or automated deployments. Missing criteria keep the gate OPEN.

**Current status:** owner launch number decided; catalogue count/IDs/present fields verified; GitHub repository existence and master brief content, Supabase crosswalk, detailed design and data migration remain outstanding. No migration performed.
