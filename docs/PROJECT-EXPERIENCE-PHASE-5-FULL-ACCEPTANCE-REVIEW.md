# Project Experience Phase 5 — Full User Story + Acceptance Review

**PR:** #214  
**Phase:** Member Project Experience & Qualification  
**Binding contract:** 80 user stories, 50 mandatory test journeys, 63-point Director sign-off  
**Current decision:** **NOT APPROVED**  

This ledger distinguishes source/architecture evidence from exact-head runtime evidence. A source PASS does not replace a required browser, Supabase, RLS, accessibility or release-gate result.

## Status legend

- **PASS** — implemented and source contract supports the story; where runtime is mandatory, the test is also explicitly listed below.
- **PARTIAL** — source implementation exists, but mandatory runtime evidence is still pending.
- **BLOCKED** — cannot be accepted until exact-head CI/browser/Supabase execution completes.
- **NOT APPLICABLE** — the requested optional convention does not exist in the current repository and Phase 5 does not create a replacement system.

## User-story ledger

| US | Story | Status | Evidence / current result |
|---:|---|---|---|
| 1 | View Member Project | PARTIAL | `/member/discover/[id]` uses canonical project ID/content and authenticated state; responsive/error runtime pending. |
| 2 | Public→Member continuity | PARTIAL | Same project ID and canonical model reused; exact browser continuity pending. |
| 3 | Member project is a decision surface | PASS | Hero decision panel + fit + team/capacity + deliverables + contribution areas + next step. |
| 4 | One dominant CTA | PASS | Eligible state resolves to **Submit Interest** only. |
| 5 | CTA reflects eligibility | PARTIAL | Shared qualification + server revalidation implemented; runtime matrix pending. |
| 6 | Experience level | PASS | Canonical `difficulty_level` is displayed from project model. |
| 7 | Career/capability fit | PASS | Advisory domain/tool/capability/skill fit plus informational contribution areas. |
| 8 | Time commitment | PASS | Canonical duration/weekly commitment shown; saved capacity is advisory only. |
| 9 | Participation mode | PASS | Canonical Phase 3 `participation_mode` shown. |
| 10 | Current team state | PARTIAL | New server helper reads current run/project membership; runtime data scenarios pending. |
| 11 | Minimum vs target | PASS | UI explains minimum, target and maximum as different concepts. |
| 12 | Available capacity | PARTIAL | Project-level occupied/reserved/max calculation implemented; runtime capacity scenarios pending. |
| 13 | Team state not stale | PARTIAL | Dynamic server page + server revalidation; race/stale E2E pending. |
| 14 | Eligibility evaluated | PASS | Shared qualification covers profile/project/request/capacity/participation/deadline. |
| 15 | Eligible member | PASS | `ELIGIBLE` → `/member/discover/[id]/apply` with **Submit Interest**. |
| 16 | Ineligible reason | PASS | Explicit profile/full/closed/existing/participating states and actions. |
| 17 | Eligibility server-enforced | PARTIAL | Phase 6 route + API revalidate persisted state; forged/stale runtime cases pending. |
| 18 | Incomplete profile | PARTIAL | Submit Interest routes to profile with exact safe return; browser round-trip pending. |
| 19 | Reuse Phase 2 readiness | PASS | `calculateMemberReadiness()` reused by page, route and API. |
| 20 | Show what is missing | PASS | Existing readiness missing labels shown; no duplicated field definition. |
| 21 | Return to exact project | PARTIAL | Safe internal `next` + `#member-decision-title` focus target implemented; browser proof pending. |
| 22 | Failed profile save retains intent | BLOCKED | Existing profile form behavior must be evidenced in browser failure journey. |
| 23 | Existing interest state | PASS | Any active exact-user/exact-project request produces Interest submitted / tracker state. |
| 24 | Duplicate interest prevented | PARTIAL | API idempotent active-request check plus PostgreSQL partial unique index protect concurrent role-neutral interest; current exact-head DB test pending. |
| 25 | Interest tracker | PASS | Reuses `/member/applications`; no tracker_v2. |
| 26 | Withdrawn/declined history | PASS | API active-request query and Phase 5 uniqueness index both exclude `declined`/`withdrawn`, so terminal history does not permanently block re-interest. |
| 27 | Open project | PASS | Eligible open project exposes Submit Interest. |
| 28 | Closed project | PASS | Closed state has explanation and no Submit Interest action. |
| 29 | Full project | PARTIAL | Explicit `full` state from project-level capacity; full fixture E2E pending. |
| 30 | Active project | PARTIAL | Canonical lifecycle function remains authority; late-join runtime cases pending. |
| 31 | Completed project | PASS | Completed state has no interest CTA. |
| 32 | Accepted/active participant | PASS | Membership overrides interest CTA and routes to Projects. |
| 33 | Possible contribution areas | PASS | Informational contribution cards are shown. |
| 34 | No role selection before interest | PASS | No role radio/selection, no `?role`, initial interest persists with `project_role_id=null`. |
| 35 | Career fit vs project role clear | PASS | Copy explicitly says contribution areas are not a formal role application. |
| 36 | Member uses Phase 3 data | PASS | Member model built from same canonical project/detail/planning sources. |
| 37 | Member-specific data is additive | PASS | Qualification/team/request state layered onto canonical project content. |
| 38 | Only authorised resources | PARTIAL | Detail loader exposes deny-by-default public/permitted/green metadata only; runtime security regression pending. |
| 39 | Interest does not grant Lab | PARTIAL | Interest API performs no membership write and persistence E2E now explicitly asserts zero `project_members` rows after successful interest; current exact-head execution pending. |
| 40 | Member identity consistency | PARTIAL | `auth.user.id` is authoritative; username-change persistence regression pending. |
| 41 | Profile data reused | PASS | Existing profile supplies readiness, availability and professional links; no project-page authority copy. |
| 42 | Profile update affects readiness | PARTIAL | Server re-read on return implemented; exact browser recalculation pending. |
| 43 | Public intent survives auth | PARTIAL | Phase 4 exact-project `next` retained into member page; full signup/verification/onboarding browser chain pending. |
| 44 | Authenticated user no signin loop | PARTIAL | Server checks current auth and renders member route; runtime regression pending. |
| 45 | Correct Phase 6 interest flow | PASS | Submit Interest → canonical `/apply` route, no role parameter. |
| 46 | No early application record | PASS | Member page/route do not insert; write occurs only at Phase 6 submit. |
| 47 | Eligibility reads Supabase state | PASS | Profile/preferences/project/request/membership/run/capacity read from persisted state. |
| 48 | Existing interest query | PARTIAL | Exact user/project and lifecycle filtering implemented; cross-user/duplicate runtime included and current exact-head result pending. |
| 49 | Project capacity query | PARTIAL | Confirmed + waiting/reserved current run/project state counted; runtime scenarios pending. |
| 50 | RLS protects state | PARTIAL | Hosted `project_applications` owner/admin policies verified; isolated cross-user profile/preference/request tests included; current exact-head run pending. |
| 51 | No hosted-only DB dependency | PARTIAL | Required uniqueness change is repository-versioned; production was reviewed read-only and no hosted DDL was changed. Strengthened clean migration runtime pending at current exact head. |
| 52 | One qualification contract | PASS | `resolveMemberProjectQualification()` returns state/reason/eligible and state resolver delegates to it. |
| 53 | Safe identifiers | PASS | Member ID is derived from authenticated session; project is canonical route/body ID and validated server-side. |
| 54 | Known product states structured | PASS | Structured reasons include ELIGIBLE, PROFILE_INCOMPLETE, INTEREST_EXISTS, PROJECT_CLOSED, CAPACITY_FULL, ALREADY_PARTICIPATING, DEADLINE_PASSED, CAPACITY_UNKNOWN. |
| 55 | Visually a decision page | PASS | Eligibility/team/CTA are in hero decision panel before long content. |
| 56 | Eligibility message clear | PASS | Human-readable state copy; no generic error for known product states. |
| 57 | Team information understandable | PASS | Human explanations accompany min/target/max/current/reserved counts. |
| 58 | CTA state designed | PASS | Eligible, incomplete, existing, closed, full, accepted/active states have distinct content/actions. |
| 59 | Contribution areas informational | PASS | No selection control; informational copy and cards only. |
| 60 | Profile completion interaction | BLOCKED | Existing form provides validation/state; full keyboard/error/return runtime journey still required. |
| 61 | Rapid CTA clicks safe | PARTIAL | Navigation creates no record; API idempotency plus PostgreSQL active-interest uniqueness protect double-submit; current exact-head runtime pending. |
| 62 | Stale state handled | PARTIAL | Phase 6 route/API re-read latest state; closed/full race E2E pending. |
| 63 | 320px member project | BLOCKED | Authenticated suite includes 320px, exact-head execution pending. |
| 64 | Mobile CTA | BLOCKED | Sticky Submit Interest implementation exists; browser overlap/touch-target evidence pending. |
| 65 | Tablet | BLOCKED | 768/1024 widths included; exact-head execution pending. |
| 66 | 200% reflow | BLOCKED | Browser suite applies 200% text sizing; exact-head execution pending. |
| 67 | Keyboard journey | BLOCKED | Semantic links/buttons/focus styling implemented; keyboard E2E pending. |
| 68 | Screen reader state | BLOCKED | Semantic headings/status labels implemented; accessibility runtime pending. |
| 69 | Status not colour-only | PASS | All states have explicit text labels/copy. |
| 70 | Focus after return | PARTIAL | Safe return hash + focusable qualification heading implemented; browser proof pending. |
| 71 | Cannot spoof eligibility | PARTIAL | Route/API revalidation implemented; malicious direct-route/POST matrix pending. |
| 72 | Cannot view another application | PARTIAL | Hosted owner/admin RLS verified and isolated Member A→Member B request read/update IDOR test included; current exact-head run pending. |
| 73 | Cannot gain team access | PARTIAL | Public-safe projection, no membership write, and zero-membership-after-interest persistence assertion included; explicit applicant→Lab/private-resource runtime still pending. |
| 74 | Member view measured | NOT APPLICABLE | No repository analytics convention/framework was found to reuse. Phase 5 does not invent a new analytics stack. |
| 75 | No sensitive eligibility analytics | PASS | Phase 5 adds no analytics payload or private profile/application content logging. |
| 76 | Phase 1 regression | BLOCKED | Auth/identity exact-head suites pending. |
| 77 | Phase 2 regression | BLOCKED | Profile/readiness exact-head suites pending. |
| 78 | Phase 3 regression | BLOCKED | Canonical project/governance exact-head suites pending. |
| 79 | Phase 4 regression | BLOCKED | Public project/auth-return exact-head suites pending. |
| 80 | Existing application regression | BLOCKED | Legacy application path kept; persistence/Admin regressions pending. |

## Mandatory test journey ledger

| Test | Required journey | Current evidence |
|---:|---|---|
| 1 | Eligible member → Member Project → Submit Interest | Covered in authenticated visual suite; **PENDING CI** |
| 2 | Submit Interest → canonical Phase 6 form | Covered; **PENDING CI** |
| 3 | Incomplete profile → save → exact project → recalculated | Covered in browser suite/source; **PENDING CI** |
| 4 | Profile save failure retains values/intent | **PENDING additional runtime evidence** |
| 5 | Existing active interest → Interest submitted + tracker | State/domain coverage; **PENDING browser runtime** |
| 6 | Rapid double click | API idempotency + DB active-interest uniqueness included; DB test also proves declined history can reapply; **PENDING current exact-head runtime** |
| 7 | Project closed | API/state regression present; **PENDING CI** |
| 8 | Deadline passed | Structured qualification test uses deadline-governed partner project while Open Projects retain continuous-intake semantics; **PENDING current exact-head runtime** |
| 9 | Project full | State/helper covered; **PENDING browser/API fixture** |
| 10 | Active + late joining permitted | Canonical lifecycle retained; **PENDING runtime** |
| 11 | Active + late joining closed | Canonical lifecycle retained; **PENDING runtime** |
| 12 | Completed project | State contract covered; **PENDING browser runtime** |
| 13 | Already accepted | State contract covered; **PENDING browser runtime** |
| 14 | Active member → Projects/Lab action | State contract covered; **PENDING browser runtime** |
| 15 | Team min/target/max/current | Authenticated fixture + UI assertions; **PENDING CI** |
| 16 | Solo participation | Canonical value source; **PENDING browser fixture** |
| 17 | Flexible participation | Canonical value source; **PENDING browser fixture** |
| 18 | Contribution areas informational, no selection | Source + browser assertions; **PENDING CI** |
| 19 | Public → signin → same member project | Covered; **PENDING CI** |
| 20 | Public → signup→username→verification→onboarding→same project | Phase 4 auth chain exists; **PENDING full runtime** |
| 21 | Malicious return URL rejected | `ProfileReturnAfterSave` rejects `//`, backslash and foreign origin; **PENDING browser security test** |
| 22 | Member A cannot read Member B request | Isolated request SELECT/UPDATE IDOR test included and hosted owner/admin policy verified; **PENDING current exact-head CI** |
| 23 | Anonymous cannot access qualification | Server auth redirect; **PENDING runtime** |
| 24 | Applicant cannot access team-only resources | Public-safe projection plus successful-interest zero-membership assertion included; explicit Lab/private-resource runtime **PENDING** |
| 25 | Direct Phase 6 invalid eligibility blocked | Route/API revalidation; **PENDING CI** |
| 26 | Change project state while page open | API latest-state read; **PENDING race E2E** |
| 27 | Change capacity while page open | API latest-state team read; **PENDING race E2E** |
| 28 | Phase 2 readiness update | Browser fixture + persistence fixture now seed canonical readiness; **PENDING CI** |
| 29 | Username change preserves request | Auth ID architecture; **PENDING runtime** |
| 30 | Project ID/slug preserved | Canonical route/model; **PENDING browser continuity** |
| 31 | Repository-versioned schema | Versioned migration replaces the legacy declined-blocking index. Prior 148-migration isolated stack was clean before the predicate replacement; **PENDING current exact-head clean migration run** |
| 32 | RLS policies | Hosted policies verified + isolated RLS tests included; **PENDING current exact-head CI** |
| 33 | 320px | Included; **PENDING CI** |
| 34 | Tablet | Included; **PENDING CI** |
| 35 | Desktop | Included; **PENDING CI** |
| 36 | 200% reflow | Included; **PENDING CI** |
| 37 | Keyboard-only | Focus/controls source pass; **PENDING dedicated runtime** |
| 38 | Screen reader | Semantic source pass; **PENDING accessibility runtime** |
| 39 | Focus after profile return | Hash/focus implementation; **PENDING browser assertion** |
| 40 | Loading states | Existing dynamic surfaces; **PENDING runtime review** |
| 41 | Error states | Known states structured; infrastructure errors require runtime review |
| 42 | Existing-interest tracker regression | Existing Applications reused; **PENDING CI** |
| 43 | Public project regression | Phase 4 tests retained and stale public CTA assertion repaired; **PENDING exact head** |
| 44 | Profile regression | Existing profile tests retained; **PENDING exact head** |
| 45 | Auth regression | Existing auth tests retained; **PENDING exact head** |
| 46 | Project regression | Existing project tests retained; **PENDING exact head** |
| 47 | Lint | **PENDING exact-head CI** |
| 48 | Typecheck | Missing dev onboarding `returnTo` integration regression fixed; **PENDING exact-head CI** |
| 49 | Build | **PENDING exact-head CI** |
| 50 | Relevant E2E/release gates | **PENDING exact-head CI** |

## 63-point Director user-journey sign-off

1. Member Project architecture — **PASS source / runtime pending**
2. Public→Member continuity — **PARTIAL**
3. Canonical project data — **PASS**
4. One dominant CTA — **PASS**
5. Submit Interest wording — **PASS**
6. Competing application CTAs removed — **PASS**
7. Project-fit information — **PASS**
8. Experience Level — **PASS**
9. Career/capability fit — **PASS**
10. Duration/commitment — **PASS**
11. Participation mode — **PASS**
12. Team information — **PARTIAL runtime**
13. Current members — **PARTIAL runtime**
14. Minimum team — **PASS source**
15. Target team — **PASS source**
16. Maximum team — **PASS source**
17. Capacity — **PARTIAL runtime**
18. Project state — **PARTIAL runtime**
19. Eligibility engine — **PASS source**
20. Authentication check — **PASS source**
21. Profile-readiness check — **PASS source**
22. Project status check — **PASS source**
23. Existing-interest check — **PASS source**
24. Capacity check — **PASS source**
25. Prior-participation check — **PASS source**
26. Deadline check — **PASS source**
27. Incomplete-profile journey — **PARTIAL browser**
28. Exact project return — **PARTIAL browser**
29. Existing-interest state — **PASS source**
30. Tracker — **PASS source**
31. Duplicate-interest protection — **PASS source/DB contract; current exact-head runtime pending**
32. Closed state — **PASS source**
33. Full state — **PARTIAL runtime**
34. Accepted state — **PASS source**
35. Active-participant state — **PASS source**
36. Possible contribution areas — **PASS**
37. No required role selection — **PASS**
38. Profile data reuse readiness — **PASS source**
39. Phase 6 handoff — **PASS source**
40. Supabase query integrity — **PARTIAL runtime**
41. Database/migration compatibility — **PASS source + hosted read-only audit; current exact-head clean migration pending**
42. RLS — **PASS hosted policy review; current exact-head isolated RLS pending**
43. Member privacy — **PARTIAL runtime**
44. Team-resource protection — **PARTIAL runtime**
45. Backend/frontend state agreement — **PASS domain contract / runtime pending**
46. Stale/race state handling — **BLOCKED E2E**
47. UI/UX — **PASS source / browser pending**
48. Mobile — **BLOCKED browser**
49. Tablet — **BLOCKED browser**
50. Desktop — **BLOCKED browser**
51. 200% reflow — **BLOCKED browser**
52. Keyboard — **BLOCKED browser**
53. Screen reader — **BLOCKED accessibility run**
54. Focus management — **PARTIAL browser**
55. Analytics — **NOT APPLICABLE: no existing convention found**
56. Phase 1 regression — **BLOCKED CI**
57. Phase 2 regression — **BLOCKED CI**
58. Phase 3 regression — **BLOCKED CI**
59. Phase 4 regression — **BLOCKED CI**
60. Existing application regression — **BLOCKED CI**
61. Tests executed — **BLOCKED current exact-head runtime**
62. Documentation — **PASS, final exact-head runtime evidence update still required**
63. Remaining defects — **runtime evidence gaps remain; no Director approval yet**

# FINAL DECISION

**NOT APPROVED**

The Phase 5 source architecture is aligned to the binding Submit Interest / no-role-selection contract. PostgreSQL now protects concurrent active role-neutral interest while allowing re-interest after declined/withdrawn terminal history, and hosted schema/RLS compatibility has been reviewed read-only with no production DDL change. Approval still requires the final documentation-inclusive exact head to pass lint, typecheck, build, isolated Supabase/migrations/RLS, authenticated browser/responsive/accessibility, persistence/regression, Event Room and protected Release Gate evidence.
