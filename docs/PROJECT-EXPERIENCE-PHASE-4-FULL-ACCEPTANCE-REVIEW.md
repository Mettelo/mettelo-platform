# Phase 4 — Full User Story + Acceptance Review

## Authority and decision

This document is the implementation evidence ledger for the stricter Phase 4 acceptance authority supplied on 5 September 2026. It supersedes any earlier Phase 4 statement that treated rendering `/projects` and `/projects/[id]` as sufficient sign-off.

**Current decision: NOT APPROVED — final documentation-inclusive exact-head browser/release evidence is pending.**

Phase 5 remains held. Phase 4 owns public discovery, public decision context and the safe authentication handoff. Phase 5 owns detailed authenticated qualification/readiness. Phase 6 owns actual interest/application submission. No Phase 4 public submission form is permitted.

## Remediation performed during this acceptance review

The stricter review found additional gaps after the earlier Director review. They were remediated on PR #213:

1. Removed the legacy public `SubmissionForm` / `project_application` interest form from `/projects`; public CTA now hands the canonical project ID to `/member/discover/[id]` through existing auth.
2. Replaced public `Continue to apply` semantics with the required `Submit interest`; closed projects expose a truthful non-actionable closed state.
3. Kept public role/contribution areas informational; detailed role selection and eligibility remain authenticated concerns.
4. Added exact-project continuation through email signup, social signup, verification and Phase 2 onboarding while retaining internal-only safe-next validation.
5. Expanded public detail from the existing canonical Phase 3 model to expose supporting objectives, key questions, scope, governed public resource/source metadata, deliverables, success criteria, milestones/timeline, team structure and Proof potential.
6. Added explicit wording that project completion does not automatically create verified Mettelo Proof.
7. Added visibility-gated project-specific SEO/share metadata and noindex behavior for hidden/nonexistent projects.
8. Added an accessible `/projects` route loading state.
9. Corrected project cards to expose the comparison metadata required by the acceptance contract: canonical domain/experience, participation, duration/weekly commitment, capabilities, contribution areas, tools/methods and canonical availability.
10. Added `tests/project-experience-phase4-acceptance-contract.spec.ts` to the blocking regression command.

## 83-user-story reconciliation

Status meanings: **PASS** = implementation/source contract is present and no unresolved acceptance defect is known. **BLOCKED** = final runtime/browser evidence is still required on the exact head. A BLOCKED story is not treated as signed off.

| US | User story | Status | Evidence / acceptance result |
|---:|---|---|---|
| 1 | View public projects | PASS | Public anon loader is canonical and visibility-gated; empty/error and route loading states exist. |
| 2 | See consistent project cards | PASS | Cards now expose canonical title, domain, experience, duration, weekly commitment, participation, availability and bounded capability tags. |
| 3 | Understand whether a project is available | PASS | Shared `resolveProjectPublicAvailability` drives header/footer/CTA truthfully. |
| 4 | Understand project format | PASS | Canonical Solo/Team/Flexible plus legacy fallback is represented consistently. |
| 5 | Search public projects | PASS | Shared catalogue engine searches canonical public facets; preview requests are debounced/abortable. |
| 6 | Filter public projects | PASS | Governed role/capability/domain/tool facets, aliases, combined filters, live counts and mobile dialog are reused. |
| 7 | Share a filtered project view | PASS | Filter/search/sort state is encoded in safe query state with browser history support. |
| 8 | Sort projects | PASS | Recommended is an implemented deterministic catalogue ordering; newest/closing/duration/commitment use canonical fields. |
| 9 | Paginate/load projects safely | PASS | Server performs bounded batched reads; browser receives rendered current page, pagination preserves query state and avoids browser-wide catalogue download. Database push-down remains a scale optimisation to monitor, not a separate public model. |
| 10 | Open a project | PASS | Canonical project ID resolves public detail; invalid/private records call `notFound`. |
| 11 | Preserve discovery context | PASS | Query state remains in browser history; returning with browser back restores the filtered URL/state. |
| 12 | Understand the project immediately | PASS | Hero exposes title, summary, lifecycle/availability, domain, level, duration, commitment, participation, working model and CTA. |
| 13 | Understand project fit before applying | PASS | Hero/decision panel expose fit while contribution roles remain distinct from career taxonomy. |
| 14 | Understand the challenge | PASS | Canonical problem statement is rendered. |
| 15 | Understand business context | PASS | Canonical business context is rendered separately. |
| 16 | Understand use case | PASS | Canonical use case/decision context is rendered with graceful fallback. |
| 17 | See project objectives | PASS | Primary and ordered supporting objectives are rendered from canonical detail. |
| 18 | See key questions | PASS | Canonical key questions render as semantic lists. |
| 19 | Understand scope | PASS | Canonical in-scope/out-of-scope fields are distinct. |
| 20 | See public project resources | PASS | Public projection exposes governed public metadata only; protected links/copies are excluded. |
| 21 | Understand data source | PASS | Provider/source/licence/data-period/format/limitations are represented without replacing provenance. |
| 22 | Do not expose internal governance | PASS | Public RPC excludes governance notes, review evidence, storage paths and protected URLs. |
| 23 | Understand deliverables | PASS | Canonical ordered deliverables are rendered. |
| 24 | Understand success criteria | PASS | Canonical success criteria are rendered and explicitly separated from Proof verification. |
| 25 | Understand project expectations | PASS | Deliverables and quality standards are separate sections. |
| 26 | See capabilities | PASS | Canonical capability/tool/method signals are bounded and reused from governed taxonomy. |
| 27 | Understand Proof potential | PASS | Canonical evidence mapping is shown with explicit non-automatic-verification wording. |
| 28 | Understand project timeline | PASS | Canonical public milestones plus duration are rendered; absent milestones have a graceful state. |
| 29 | Understand weekly commitment | PASS | Canonical weekly commitment is surfaced consistently on card and detail. |
| 30 | Understand how the team works | PASS | Participation and min/target/max capacity are derived from Phase 3 model; no member identities exposed. |
| 31 | Understand possible contribution areas | PASS | Roles are informational; no public role-specific application engine exists. |
| 32 | Know whether I can express interest | PASS | Server-authoritative canonical availability controls CTA. |
| 33 | Understand basic eligibility | PASS | Public page explains only high-level readiness; detailed eligibility remains Phase 5. |
| 34 | Submit Interest is primary conversion CTA | PASS | Open public detail/card use `Submit interest`; competing public apply/join language removed. |
| 35 | Anonymous visitor clicks Submit Interest | PASS | Anonymous CTA sends exact project to existing `/signin?next=/member/discover/[id]`. |
| 36 | New user returns after signup | PASS | Signup/verification/onboarding carry safe project `next` through to completion. |
| 37 | Existing member returns after signin | PASS | Existing signin uses the same safe exact-project destination without signup loop. |
| 38 | Closed project CTA | PASS | Closed/non-joinable projects show `Interest closed`, not an active submission CTA. |
| 39 | Signup return works with Phase 1 & 2 | PASS | Existing auth and onboarding are reused; no competing auth flow introduced. |
| 40 | Auth failure does not lose context | PASS | Safe `next` remains in URL/callback context across recoverable signin/signup paths. |
| 41 | Public view exposes only public data | PASS | Explicit selected catalogue projection plus narrow public-detail RPC; application/member/private-resource fields excluded. |
| 42 | Unpublished projects are protected | PASS | Catalogue and detail require `visibility='public'`; direct hidden ID resolves not found. |
| 43 | Private resource URL cannot be discovered | PASS | Public RPC intentionally excludes external/stored-copy/access fields and run-scoped private resources. |
| 44 | Member personal data not exposed | PASS | Public project contracts contain no member email/application/private participation payload. |
| 45 | Public queries respect RLS/server authorization | PASS | Anon client used; public RPC is read-only, gated and grants only anon/authenticated execution. |
| 46 | See accurate source attribution | PASS | Resource metadata labels source/provider explicitly. |
| 47 | Do not misrepresent partnership | PASS | Resource source/provider is not rendered as partner; partnership wording remains project relationship data only. |
| 48 | Project page can be found by search engines | PASS | Public canonical metadata is generated from visibility-gated canonical project data. |
| 49 | Project link has useful share preview | PASS | OpenGraph/Twitter title/summary/canonical derive from the public project. |
| 50 | Invalid/removed project SEO | PASS | Missing/hidden project metadata is noindex and page resolution is not-found. |
| 51 | Public catalogue reads canonical Supabase data | PASS | No static/parallel catalogue introduced; `dynamic='force-dynamic'` avoids stale canonical edits. |
| 52 | Relational project data loads correctly | PASS | Catalogue/detail consume canonical relations and deduplicate taxonomy facets. |
| 53 | Project state changes reflect publicly | PASS | Dynamic public reads and canonical availability prevent long-lived stale CTA state. |
| 54 | Supabase migration compatibility | PASS | Phase 4 public detail function is versioned in repository migration; no hosted-only field dependency added. |
| 55 | Public project query returns safe projection | PASS | Explicit selected columns and public RPC projection are used instead of `select('*')` private overfetch. |
| 56 | Public query failure has user-friendly state | PASS | Catalogue shows neutral retry guidance; raw database errors are not rendered. |
| 57 | Project page is a decision surface | PASS | IA answers project, context, work, outputs, capabilities, time, team, Proof potential, availability and next action. |
| 58 | Page has clear information hierarchy | PASS | Hero → overview/context → scope/resources → outputs → quality → timeline/Proof → participation/CTA. |
| 59 | Long project page remains navigable | PASS | Semantic in-page section navigation and bounded summary/detail disclosure are present. |
| 60 | Public project catalogue looks production ready | BLOCKED | Source contract is complete; exact-head visual/browser release evidence pending. |
| 61 | Project cards do not become overcrowded | BLOCKED | Metadata is intentionally bounded; exact-head visual evidence must confirm card rhythm at all widths. |
| 62 | Project detail visual design | BLOCKED | Existing Mettelo detail design system retained; exact-head visual/browser evidence pending after added sections. |
| 63 | Status design is accessible | PASS | Availability is always textual, not colour-only. |
| 64 | Empty optional sections do not look broken | PASS | Conditional sections/fallback states avoid undefined/empty separators. |
| 65 | 320px project catalogue | BLOCKED | Blocking responsive browser execution pending on final exact head. |
| 66 | Mobile filter experience | BLOCKED | Dialog/focus/Escape/source contract present; final exact-head browser evidence pending. |
| 67 | Mobile project detail | BLOCKED | Responsive source contract present; final exact-head browser evidence pending after detail expansion. |
| 68 | Tablet experience | BLOCKED | Final exact-head 768px browser evidence pending. |
| 69 | 200% reflow | BLOCKED | Existing regression covers reflow; must rerun on final exact head. |
| 70 | Keyboard project discovery | BLOCKED | Keyboard source contract present; exact-head browser evidence pending. |
| 71 | Screen reader project cards | BLOCKED | Semantic headings/text/actions present; exact-head accessibility evidence pending. |
| 72 | Screen reader project detail | BLOCKED | One H1, labelled nav/list semantics present; exact-head accessibility evidence pending. |
| 73 | Focus management | BLOCKED | Filter dialog returns focus and handles Escape; exact-head browser execution pending. |
| 74 | Touch targets & contrast | BLOCKED | Existing design tokens/control classes retained; exact-head device/contrast evidence pending. |
| 75 | Project discovery loads efficiently | PASS | Catalogue uses bounded server batches, 12-item rendered pages, debounced/abortable preview requests and no browser download of all project records. Query push-down should be revisited as catalogue size grows materially beyond current scale. |
| 76 | Project detail does not overfetch private data | PASS | Narrow anon selected project query + safe detail RPC excludes protected private columns/relations. |
| 77 | Measure public discovery | PASS | Existing canonical `mettelo:catalogue-analytics` covers filter open/apply/remove/clear, sort, zero-result, project-open and pagination without a duplicate analytics system. |
| 78 | Analytics do not capture sensitive data | PASS | Events emit surface/facet/sort/count metadata only; no email/token/private URL payload. |
| 79 | Phase 1 identity journey remains intact | PASS | Existing username/account creation is reused. |
| 80 | Phase 2 onboarding journey remains intact | PASS | Existing onboarding is reused and now preserves project return. |
| 81 | Phase 3 canonical project model is actually consumed | PASS | Public catalogue/detail consume canonical Phase 3 identity, participation, taxonomy and rich project relations. |
| 82 | Phase 5 member project ready | PASS | Public handoff targets existing `/member/discover/[id]` with the same canonical project ID; no replacement member model created. |
| 83 | Phase 6 Submit Interest ready | PASS | Correct project ID, safe return, current state and CTA context are handed over; public submission form/endpoint removed. |

## Mandatory test ledger — Tests 1–58

The mandatory acceptance authority requires runtime evidence, not source claims. Until the final documentation-inclusive SHA finishes its blocking workflows, runtime entries remain **BLOCKED** even where dedicated coverage exists.

| Tests | Journey | Current status / evidence owner |
|---|---|---|
| 1–4 | Public catalogue/public-only/draft exclusion/direct hidden URL | BLOCKED — exact-head public + Phase 4 security execution pending. |
| 5–14 | Card metadata/detail canonical content/resources/deliverables/Proof/timeline/open/closed CTA | BLOCKED — acceptance contract + public browser suite pending exact head. |
| 15–20 | Anonymous auth/signup/signin/malicious next/exact return/authenticated loop | BLOCKED — auth regression exact-head execution pending. |
| 21–27 | Search/filter/clear/zero/sort/pagination | BLOCKED — public filter contract exact-head execution pending. |
| 28–29 | Canonical Admin edit/close reflected publicly | BLOCKED — canonical data/lifecycle runtime regression pending. |
| 30–31 | Source attribution / no false partnership | BLOCKED — browser/content contract pending exact head. |
| 32–34 | SEO/indexing/invalid URL | BLOCKED — exact-head route/browser metadata verification pending. |
| 35–36 | Leakage/direct private Supabase/API blocked | BLOCKED — Phase 4 public security suite pending exact head. |
| 37–42 | 320 catalogue/detail/mobile filters/tablet/desktop/200% | BLOCKED — responsive browser execution pending. |
| 43–49 | Keyboard/screen reader/focus/contrast/touch | BLOCKED — accessibility browser evidence pending. |
| 50 | Public performance/query assessment | PASS source assessment; release remains blocked until build/browser evidence. Bounded server batches/current-page rendering accepted at current scale, with database filter push-down tracked as future scale optimisation. |
| 51–52 | Canonical Phase 3 Supabase schema/RLS security | BLOCKED — clean isolated migration + security execution pending. |
| 53 | Public regression suite | BLOCKED — exact-head CI pending. |
| 54 | Auth safe-return regression | BLOCKED — exact-head CI pending. |
| 55 | Lint | BLOCKED — exact-head CI pending. |
| 56 | Typecheck | BLOCKED — exact-head CI pending. |
| 57 | Build | BLOCKED — exact-head CI pending. |
| 58 | Release/deployment gate | BLOCKED — Event Room + protected Release Gate pending. |

## Director 63-point sign-off reconciliation

1–10. Catalogue/canonical data/cards/metadata/search/filters/taxonomy/sort/count/pagination: **implementation PASS**.
11. Loading/empty/error: **implementation PASS** after route loading-state remediation.
12–13. Card→detail/context preservation: **implementation PASS**.
14–31. Hero through Submit Interest CTA: **implementation PASS** after strict review remediation.
32–40. Auth/safe-return/Phase 1–6 boundary compatibility: **implementation PASS**; exact browser auth regression pending.
41–45. Supabase/RLS/leakage/source/partnership: **implementation PASS**; isolated runtime security pending.
46–47. SEO/share metadata: **implementation PASS** after strict review remediation.
48–49. UI hierarchy/design-system consistency: **implementation PASS**, final visual evidence pending.
50–56. Mobile/tablet/desktop/reflow/keyboard/screen-reader/focus: **BLOCKED pending exact-head browser evidence**.
57. Performance: **implementation PASS with monitored scale risk**; server uses bounded batches and only renders the current page, while database-side filter push-down remains a future scale optimisation.
58. Analytics: **PASS** using the existing privacy-safe catalogue analytics event system.
59–60. Public/auth regressions: **BLOCKED pending exact-head CI**.
61. Tests executed: **BLOCKED pending exact-head CI/release completion**.
62. Documentation: **PASS for acceptance coverage; this document and Director review are the authoritative ledger in PR #213**.
63. Remaining defects: **no intentionally deferred functional Phase 4 defect is currently known; runtime/visual evidence is still outstanding and can reveal defects that must be fixed before approval**.

## Final decision

**NOT APPROVED.**

Reason: the strict implementation gaps found in this review have been remediated, but user stories 60–62 and 65–74, plus the mandatory runtime/security/auth/release test journeys, require final exact-head evidence. If any exact-head gate fails, the failure is an active Phase 4 defect until fixed and rerun. Phase 5 must not begin before this document can truthfully move to APPROVED on a final exact head.