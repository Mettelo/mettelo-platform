# Phase 1 — 50-project catalogue and experience contract
**State:** proposed acceptance contract; no runtime/database writes. **Base:** 07099572bfe01c49a746fda4a4406f72a284439c. **Deployment:** manual only, not CI acceptance.

## Entry conditions and phase success criteria
1. Exactly 40 unique approved `Mettelo/project-library/docs/projects.json` entries, at a pinned source commit, have a documented validation report including master repository availability and schema/taxonomy consistency. A failed/missing entry **blocks** approval rather than silently reducing the catalogue.
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
| Public catalogue | Exactly approved 40; concise 2–3 sentence business brief, track, sector/roles, search/facets, accurate count, pagination | SEO, links, signed-out access, mobile filter navigation |
| Public detail | Concise approximately 150–250-word summary; prominent labelled **Read master brief on GitHub** link; status, role/application CTA | Correct URL validation, dynamic eligibility, sign-in return, accessible navigation |
| Member Discover and detail | Same catalogue identity, with saves, fit/readiness and application/offer status from canonical policy | Existing server-side authorisation, applications, alerts, member navigation |
| Initial Mettelo Lab | Project title, short summary, team/run identity, role, master repo link; distinct team delivery status/input | Chat, team, tasks, RLS, support, review, notifications, completion and Proof; do not remove server-side dependencies merely because long project detail UI is hidden |

## Database disposition contract
Current read-only baseline 17 October 2026: `projects=305` (302 open, 1 draft, 1 forming, 1 pilot), `project_applications=12`, `project_runs=10`, `project_members=8`, `contributions=0`. These are observations, **not approval to delete**. Each project must be classified: (1) map to new 40, (2) archive/hide in public catalogue but preserve related operational data, (3) active historical operational retain, (4) manual review, (5) eligible for later deletion only after data-retention approval and verified backup/restore. All FK references and RLS must pass.

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


## Authoritative scope update — 50 projects (17 October 2026)
**Supersedes all references to 40 as the initial launch count in this Phase 1 contract.** Owner has approved **50** launch projects. Pin the source to `Mettelo/project-library` main commit `65dc740ac1c6c8f88868863a6772150c1a5a12f7` and JSON blob `44477ee087cf22a7d2a9427a7613186f96a407fe` for the current audit; repin if source changes before implementation.

Verified: `docs/projects.json` contains 50 entries, 50 distinct IDs, all numeric suffixes 001–050 and nonempty `brief`, `roles`, `repository` values. URLs are structurally within the Mettelo GitHub organisation. The final five (046–050) are AI copilot/assistant projects. **Repository existence/content and access remain to be independently verified.** Ten early entries (001–010) have empty `use_case` and `data_source`; resolve by content approval or versioned schema rule, not fabrication.

**Updated success gate:** approve all 50 specific source IDs and master links; resolve mandatory metadata; classify all 305 legacy project records and preserve 12 applications, 10 runs, 8 memberships, 4 offers and all other related records; approve ERD, Lab and public/member page design, one delivery GitHub URL input with independent Proof review, rollback and security regression. Phase 1 remains open until objective evidence is complete. No automated deployment, Production deletion or code cutover authorised.
