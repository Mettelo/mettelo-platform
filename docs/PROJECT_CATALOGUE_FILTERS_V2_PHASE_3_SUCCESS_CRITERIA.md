# Project Catalogue Filters V2 — Phase 3 Success Criteria

## Phase 3: Public Projects, shared facet engine and publishing governance

### Product outcome
Make `/projects` a visibly filterable public catalogue, align its discovery semantics with Member Discover, and prevent future projects from entering discovery with incomplete metadata.

## Public Projects information architecture
The existing public hero and editorial project storytelling remain intact.

At the catalogue section, the discovery controls become visibly actionable rather than hiding refinement behind low-discoverability `<details>` controls.

Desktop contract:

`Search projects`

`[ Project, role, skill, tool or domain ........................................ ]`

`[ Filters · 0 ]                                      [ Sort: Recently added ]`

Active refinements render directly below:

`[ Skill: Data Quality × ] [ Domain: Healthcare × ] [ Remote × ] [ Clear all ]`

Then:

`27 projects available                              Showing 1–12 of 27`

Public pagination may remain 12 per page unless a separate public-card-density decision changes it; Member Discover remains 9 per page.

## Public filter panel
### PROJECT FIT
- Role
- Skill / capability
- Domain
- Tool / technology

### PROJECT FORMAT
- Project type
- Working model
- Commitment
- Duration

### AVAILABILITY
- Open to join
- Team forming
- Active
- In review
- Completed

### DIRECTION
- Capability Path

### SORT BY
Exactly four options:
1. Recently added
2. Closing soon
3. Shortest duration
4. Longest duration

## Public state and URL contract
Public refinement state is URL-addressable.

Example shape:
`/projects?skill=forecasting&domain=finance-fintech&working=remote&sort=closing`

Requirements:
1. Refresh preserves filters.
2. Browser Back/Forward restores catalogue state.
3. Shared URLs reproduce the same public result set.
4. Pagination preserves active query parameters.
5. Clearing all returns to the canonical `/projects#projects` state.
6. Query handling validates known facet values; unknown values fail safely rather than broadening access.

## Shared facet engine
Public Projects and Member Discover consume the same canonical project-facet model for:
- role families;
- capabilities;
- domains;
- tools;
- methods/search terms;
- working model;
- commitment;
- duration;
- project type;
- stage;
- created date;
- deadline.

The pages may have different UI and visibility rules, but a facet must have the same meaning everywhere.

A project classified with Forecasting cannot appear as Forecasting in Member Discover but fail to match Forecasting on public Projects when the project is publicly visible.

## Public/member visibility boundary
1. Anonymous public queries only receive projects whose existing visibility/lifecycle rules permit public display.
2. Signed-in `/projects` stays the public catalogue.
3. `/member/discover` remains the member catalogue and may include member-visible projects.
4. Member application, membership, saved state and readiness data must never leak to anonymous public responses.
5. Shared facet code must accept visibility-safe input; it must not bypass RLS or project visibility predicates.

## Mobile design contract
At mobile sizes:
- Search remains full-width.
- Filters is an obvious 44px+ action directly below/alongside search.
- Filter content uses a full-width sheet or dedicated responsive panel.
- Controls are stacked in the same logical group order as desktop.
- Sticky footer exposes `Clear all` and `Show N projects`.
- Active filter chips wrap without horizontal page overflow.

## Facet counts and zero-result prevention
Where technically practical, filter options show contextual result counts.

Examples:
- `Forecasting (8)`
- `Data Quality (14)`
- `Computer Vision (0)`

Zero-count options may remain visible but disabled so users understand the taxonomy without selecting an impossible combination.

Counts must never expose the existence of member-only/private projects on the public page.

## Publishing governance
Phase 1 catalogue readiness becomes an authoring/publishing guard.

Admin / Project Architect project authoring must surface a `Catalogue readiness` section with criterion-level status.

Example:
- `✓ Project type`
- `✓ Domain`
- `✓ Roles`
- `✓ Skills / capabilities`
- `✓ Working model`
- `✓ Duration`
- `✓ Weekly commitment`
- `○ Tools — intentionally optional`

A project cannot transition into a discoverable recruiting/open/pilot/public state when required catalogue metadata is incomplete.

The guard must explain what is missing and must not silently invent metadata.

## Design-system criteria
1. Public and member filter controls share reusable primitives for trigger, chips, field groups, combobox and responsive dialog/sheet behaviour.
2. Visual styling follows Mettelo's existing Ink and Value system rather than introducing a new component language.
3. Public controls may use public-page sand/warm-surface styling; Member Discover keeps member workspace styling while preserving interaction parity.
4. All filter components expose design tokens/variables rather than one-off hard-coded geometry where reusable tokens exist.

## Content criteria
- Public CTA: `Filters · N`.
- Results: `N projects available`.
- Search placeholder remains task-oriented: `Project, role, skill, tool or domain`.
- Empty state provides recovery actions.
- No copy implies a filter guarantees eligibility or acceptance.
- Stage/availability wording matches governed project lifecycle semantics.

## Growth and analytics criteria
Instrument privacy-safe aggregate events for:
- public filter opened;
- facet type applied/removed;
- sort option selected;
- zero-result state;
- filtered project opened;
- pagination used.

Do not persist raw free-text search queries by default without an approved privacy purpose and retention policy.

## Security/privacy criteria
1. RLS and public project predicates remain authoritative.
2. Filter query parameters are validated and safely encoded.
3. No raw SQL is built from user-controlled filter strings.
4. No service-role credential is exposed to client code.
5. Facet counts cannot infer private/member-only project existence.
6. New publishing guard writes are admin/architect-authorised only.
7. Security advisor introduces no unresolved regression attributable to this phase.

## QA success criteria
Phase 3 is accepted only when:
1. Public `/projects` has a permanently visible Filters action adjacent to the search experience.
2. Advanced refinement is not hidden as the only discoverable path inside collapsed details.
3. Public Search and filters combine correctly.
4. Public Projects and Member Discover use the same canonical facet meaning.
5. Same visible project + same facet yields consistent inclusion across both catalogue surfaces.
6. Public filter state persists in the URL.
7. Refresh preserves state.
8. Back/Forward preserves state.
9. Pagination preserves state.
10. Result counts are accurate.
11. All four Sort options match Phase 2 ordering rules.
12. Public capability selector is searchable/accessibly usable where taxonomy volume requires it.
13. Active chips can be removed individually.
14. Clear all restores canonical unfiltered state.
15. Mobile sheet/panel passes keyboard/touch accessibility.
16. Signed-in `/projects` remains public.
17. Member-only project visibility is not leaked.
18. Application, Save, My Projects, Recommended, Capability Paths, Lab and Proof journeys do not regress.
19. Catalogue-readiness publishing guard blocks an intentionally incomplete fixture.
20. The same guard permits a complete fixture.
21. A new governed taxonomy association automatically appears in both relevant catalogue surfaces without hard-coded frontend edits.
22. 320, 375, 390, 414, 768, 1024 and desktop visual QA pass.
23. 200% text reflow passes.
24. WCAG 2.2 AA automated and keyboard QA passes.
25. Exact-head lint, typecheck, build, public browser regression, authenticated QA, persistence, Event Room, Deployment and Release Gate are green.

## Programme completion gate
Project Catalogue Filters V2 is complete only when all three phase documents are satisfied, current production-equivalent catalogue data passes readiness, and the final exact head is green. No phase may be marked complete solely because its UI appears correct.