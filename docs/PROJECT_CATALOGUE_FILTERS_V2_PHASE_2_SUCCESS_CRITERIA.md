# Project Catalogue Filters V2 — Phase 2 Success Criteria

## Phase 2: Member Discover Filters V2

### Product outcome
Turn `/member/discover` into a precise, accessible member catalogue that can narrow the full project inventory using the governed Phase 1 taxonomy while preserving Mettelo's distinction between Discover, Recommended and Capability Paths.

## Experience hierarchy
The page hierarchy remains:
1. Member page header.
2. Capability Path context.
3. Search + one primary `Filters · N` action.
4. Active refinement chips and sort summary.
5. Result count.
6. Project cards.
7. Pagination.

Capability Path context remains outside the filter dialog. Paths provide direction; catalogue filters provide refinement.

## Desktop design contract
Visible controls:

`[ Search projects, skills or topics ................................ ] [ Filters · 0 ]`

When filters are active, removable chips appear underneath, for example:

`[ Role: Data Analyst × ] [ Skill: Forecasting × ] [ Domain: Finance × ] [ Remote × ] [ Clear all ]`

Sort remains visible as a passive summary/control and does not increment `Filters · N`.

### Filter dialog information architecture
**WHAT YOU WANT TO WORK ON**
- Role
- Skill / capability
- Domain
- Tool / technology

**HOW YOU WANT TO WORK**
- Commitment
- Working model
- Project type
- Project stage

**SORT RESULTS**
Exactly four options:
1. Recently added — default
2. Closing soon
3. Shortest duration
4. Longest duration

`Best match` is intentionally excluded because personalised ranking belongs to Recommended.

## Skill/capability interaction
The capability taxonomy may grow well beyond a usable native-select size. Skill/capability selection therefore uses an accessible searchable combobox/listbox, initially single-select.

Requirements:
- search canonical labels and accepted aliases;
- render canonical labels only;
- keyboard-operable;
- selected value removable as a chip;
- no duplicate casing/synonyms;
- values are derived from Phase 1 taxonomy, never a frontend constant array.

## Mobile design contract
At the existing mobile breakpoint the filter dialog becomes a full-width bottom sheet.

Controls stack vertically in the same logical order as desktop.

A sticky action footer remains reachable:

`Clear all                    Show N projects`

Close button, Escape behaviour and focus restoration remain intact.

## Filtering semantics
1. Search and selected facets combine with AND semantics.
2. Within a single single-select facet, the selected canonical value is exact by ID/slug, not fuzzy text.
3. Search still covers project title, summary, roles, canonical capabilities, domains, tools, methods, Path context and working metadata.
4. Filtering is performed across the complete loaded catalogue before pagination.
5. Sorting is performed before pagination.
6. Any search/filter/sort change resets the current page to page 1.
7. Result count reflects the complete filtered set, not the current page.

## Pagination
- Exactly 9 projects per page.
- Desktop numbered pagination may show first/last pages with ellipsis.
- Mobile keeps compact Previous / Page X of Y / Next behaviour.
- Empty states never render impossible pagination controls.

## Facet coverage
Member Discover filter facets are:
- canonical role family;
- canonical skill/capability;
- domain;
- tool/technology;
- commitment;
- working model;
- project type;
- project stage.

Methods remain searchable and may become a dedicated facet later, but are not required as a ninth filter in this phase unless usability evidence supports it.

## Accessibility criteria
1. WCAG 2.2 AA.
2. Complete keyboard operation.
3. Correct native dialog semantics or equivalent accessible pattern.
4. `aria-haspopup`, `aria-expanded`, labelled controls and meaningful removal labels.
5. Searchable capability selector follows combobox/listbox semantics.
6. Focus enters the dialog predictably and returns to the Filters trigger on close.
7. Escape closes the dialog.
8. Minimum 44x44px interactive targets.
9. 200% text zoom/reflow without clipped controls or horizontal page overflow.
10. Reduced-motion preference is respected.
11. QA viewports include 320, 375, 390, 414, 768, 1024 and desktop widths.

## Content and UX writing criteria
- `Filters · N` communicates active refinements.
- `Skill` may be labelled `Skill / capability` where needed to avoid presenting tools as skills.
- `Working model` uses Remote, Hybrid and On-site.
- `Project type` uses Open Project and Partner Project.
- Stage labels follow existing governed lifecycle wording.
- Empty state explains how to recover without blaming the user.

## Product-boundary criteria
No change to:
- Save semantics;
- project applications;
- membership/team formation;
- member project lifecycle states;
- Mettelo Lab;
- Proof;
- Capability Path progression;
- recommendation ranking.

## Analytics criteria
Instrument non-sensitive product events for:
- filter dialog opened;
- facet applied/removed by facet type, not free-text content;
- sort changed;
- search used as a boolean/count signal without logging private query text by default;
- zero-result state reached;
- pagination used.

Analytics must not log member-identifying profile data or raw sensitive search text.

## QA success criteria
Phase 2 is accepted only when:
1. All filter options come from Phase 1 governed facets.
2. A canonical capability associated with multiple projects returns all of them.
3. A newly associated capability appears without frontend code changes.
4. Canonical Role filtering works across multiple projects.
5. Domain filtering works across multiple projects.
6. Tool filtering works across multiple projects.
7. Commitment works.
8. Working model works.
9. Project type works.
10. Project stage works.
11. Combined filters use AND semantics.
12. Search + filters combine correctly.
13. Removing one chip preserves the other filters.
14. Clear all restores defaults.
15. All four sort modes are deterministic.
16. Filter/search/sort changes reset pagination to page 1.
17. Exactly 9 results appear per full page.
18. Capability Path selection remains independent and can combine with refinements.
19. Member lifecycle state/CTA remains correct on filtered cards.
20. Save remains a private bookmark only.
21. Application journeys remain unchanged.
22. Desktop, tablet, mobile and 200% zoom visual QA pass.
23. Accessibility automated and manual keyboard checks pass.
24. Exact-head lint, typecheck, build, public regression, authenticated QA, persistence, informational journeys, Event Room and Release Gate are green.

## Exit gate to Phase 3
Phase 3 starts only after Member Discover is stable on the shared Phase 1 taxonomy and the Phase 2 exact head has passed all required release gates.