# Project Catalogue Filters V2 — Phase 2 Success Criteria

## Phase 2: Member Discover Filters V2

### Product outcome
Turn `/member/discover` into a precise, accessible member catalogue that can narrow the complete project inventory using the governed Phase 1 taxonomy while preserving Mettelo's distinction between Discover, Recommended and Capability Paths.

Phase 2 is implemented on the same integration branch as Phase 1 and Phase 3. It is not an intermediate merge boundary.

## Baseline defect Phase 2 must remove
The current Member Discover client derives Role and Skill options from project-specific `project_roles.title` and raw `project_roles.skills`. That means a filter can look populated while most projects are not classified against it.

Phase 2 is not successful if it merely adds more visible controls. The UI must consume the canonical project facets created in Phase 1.

## Architecture contract
1. Member Discover receives canonical facet relations from the authenticated server query.
2. A shared, pure catalogue filter engine owns search/filter/sort semantics so Phase 3 can reuse the same meanings.
3. Project-specific role titles remain visible on cards but are not the source of the canonical Role filter.
4. Raw `project_roles.skills` remain legacy/display data only; the Skill / Capability filter uses `capabilities` + `project_capabilities`.
5. Domains use `domains` + `project_domains`.
6. Tools use `tools` + `project_tools`.
7. Methods use `methods` + `project_methods` for search coverage, not a required ninth visible facet in this phase.
8. Capability aliases may assist matching inside the capability selector but canonical labels are always displayed.
9. Filter semantics operate on stable slugs/IDs, never display-text equality.
10. No frontend constant array may define the available canonical roles, capabilities, domains or tools.

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

`[ Role: Data Analyst × ] [ Skill: Forecasting × ] [ Domain: Finance & Fintech × ] [ Remote × ] [ Clear filters ]`

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

## Skill / capability interaction
The capability taxonomy is too large for a long native select. Skill / capability therefore uses an accessible searchable combobox/listbox and is single-select in Phase 2.

Requirements:
- search canonical capability labels;
- accepted aliases may match the same canonical option;
- render canonical labels only;
- `role="combobox"` / listbox semantics with `aria-expanded`, `aria-controls`, active option and selected value communicated correctly;
- Arrow Up / Arrow Down navigation;
- Enter selects the highlighted option;
- Escape closes the options without closing the whole filter dialog;
- keyboard and pointer selection both work;
- selected capability is removable as an active chip;
- no duplicate casing/synonyms;
- empty search provides a neutral `No capabilities match` message;
- values come from Phase 1 taxonomy, never a frontend constant array.

## Commitment normalization contract
Current project data contains semantically equivalent text variants such as `5-7 hours`, `5–7 hours` and `5–7 hours per member for 5 weeks`.

Phase 2 must normalize commitment for discovery without rewriting source history:
- extract the weekly hour range where present;
- normalize hyphen/en-dash variants to one canonical display label, e.g. `5–7 hours`;
- project-specific explanatory suffixes remain available on the project card if needed but do not create duplicate filter choices;
- malformed/unparseable values do not cause broad matches or crashes;
- future normalized values appear automatically through the shared engine.

## Working-model, type and stage labels
- `remote` -> `Remote`
- `hybrid` -> `Hybrid`
- `onsite` -> `On-site`
- `open` project type -> `Open Project`
- `partner` project type -> `Partner Project`
- project stage labels use governed lifecycle wording such as Pilot, Recruiting, Open, Team forming, Active, In review and Completed.

## Mobile design contract
At the existing mobile breakpoint the filter dialog becomes a full-width bottom sheet.

Controls stack vertically in the same logical group order as desktop.

A sticky action footer remains reachable:

`Clear all                    Show N projects`

Close button, native Escape behaviour and focus restoration remain intact.

## Filtering semantics
1. Search and selected facets combine with AND semantics.
2. Across different facets, all selected facets must match.
3. Each Phase 2 facet is single-select; exact canonical slug matching is used.
4. Search covers project title, summary, project-specific role titles, canonical role families, canonical capabilities, domains, tools, methods, Capability Path context, working model, normalized commitment, project type and stage.
5. Filtering is performed across the complete loaded catalogue before pagination.
6. Sorting is performed after filtering and before pagination.
7. Any search/filter/sort change resets the current page to page 1.
8. Result count reflects the complete filtered set, not the current page.
9. A missing deadline sorts after dated projects for `Closing soon`.
10. Projects with unknown duration sort after known durations in both duration modes rather than being silently removed.

## Pagination
- Exactly 9 projects per page.
- Desktop uses numbered pagination with first/last page visibility and ellipsis when required.
- Mobile keeps compact Previous / Page X of Y / Next behaviour.
- Current page has `aria-current="page"`.
- Page controls are at least 44px for primary Previous/Next actions; compact number buttons retain clear keyboard focus.
- Filter/search/sort changes return to page 1.
- Empty states and result sets of 9 or fewer do not render unnecessary pagination controls.
- Reduced-motion preference is respected when returning focus/viewport to the result heading.

## Facet coverage
Member Discover exposes exactly these eight filter facets:
- canonical Role family;
- canonical Skill / capability;
- Domain;
- Tool / technology;
- Commitment;
- Working model;
- Project type;
- Project stage.

Methods remain searchable and may become a dedicated facet later only with evidence that a ninth visible filter improves discovery.

## Accessibility criteria
1. WCAG 2.2 AA.
2. Complete keyboard operation.
3. Correct native dialog semantics or equivalent accessible pattern.
4. `aria-haspopup`, `aria-expanded`, labelled controls and meaningful removal labels.
5. Searchable capability selector follows combobox/listbox semantics.
6. Focus enters the dialog predictably and returns to the Filters trigger on close.
7. Escape closes the dialog; Escape inside an open capability listbox first closes the listbox.
8. Minimum 44x44px primary interactive targets.
9. Visible focus indicators survive all member workspace backgrounds.
10. 200% text zoom/reflow without clipped controls or horizontal page overflow.
11. Reduced-motion preference is respected.
12. QA viewports include 320, 375, 390, 414, 768, 1024 and desktop widths.
13. Result-count changes are announced through an appropriate live region without excessive chatter on every keystroke.

## Content and UX writing criteria
- `Filters · N` communicates the count of active filter facets only.
- Sort does not increment N.
- Search does not increment N.
- label the capability field `Skill / capability` to distinguish it from tools.
- label working arrangement `Working model`, not generic `Location`, because values are Remote / Hybrid / On-site.
- `Clear filters` clears facet refinements and sort but does not silently erase a user's search query.
- `Clear search and filters` is reserved for the zero-result recovery action.
- empty state explains how to recover without blaming the user.
- no copy implies that filtering guarantees project eligibility or acceptance.

## Product-boundary criteria
No change to:
- Save semantics;
- project applications;
- membership/team formation;
- member project lifecycle states;
- Mettelo Lab;
- Proof;
- Capability Path progression;
- recommendation ranking;
- signed-in public `/projects` routing established by the public catalogue contract.

## Analytics criteria
Instrument only privacy-safe aggregate events when/where the existing analytics layer supports them:
- filter dialog opened;
- facet applied/removed by facet type, not member identity;
- sort changed;
- search used as a boolean/count signal without raw query text by default;
- zero-result state reached;
- pagination used.

Analytics must not log member-identifying profile data or raw sensitive search text without an approved privacy purpose and retention policy.

## QA success criteria
Phase 2 implementation is accepted for progression to Phase 3 only when:
1. All canonical Role options come from Phase 1 governed facet data.
2. All Skill / Capability options come from Phase 1 governed facet data.
3. All Domain options come from Phase 1 governed facet data.
4. All Tool options come from Phase 1 governed facet data.
5. A canonical capability associated with multiple projects returns all of them.
6. A newly associated capability appears without frontend code changes.
7. Canonical Role filtering works across multiple projects.
8. Domain filtering works across multiple projects.
9. Tool filtering works across multiple projects.
10. Equivalent commitment text variants collapse to one filter option and match the correct projects.
11. Working model filtering works.
12. Project type filtering works.
13. Project stage filtering works.
14. Combined filters use AND semantics.
15. Search + filters combine correctly.
16. Search includes canonical capabilities, domains, tools and methods.
17. Removing one chip preserves all other refinements.
18. `Clear filters` restores facet/sort defaults without clearing search.
19. zero-result `Clear search and filters` restores the complete catalogue.
20. all four sort modes are deterministic.
21. filter/search/sort changes reset pagination to page 1.
22. exactly 9 results appear per full page.
23. desktop numbered pagination and mobile compact pagination both work.
24. Capability Path selection remains independent and can combine with refinements.
25. member lifecycle state/CTA remains correct on filtered cards.
26. Save remains a private bookmark only.
27. application journeys remain unchanged.
28. signed-in public `/projects` remains public.
29. anonymous/member project visibility is unchanged by Phase 2.
30. desktop, tablet, mobile and 200% zoom visual QA pass.
31. capability combobox manual keyboard QA passes.
32. automated accessibility checks and existing authenticated regression stay green.
33. lint, typecheck and build pass on the Phase 2 integration head.

## Exit gate to Phase 3
Because the programme will merge once after all three phases, Phase 3 may start when the Phase 2 implementation satisfies the targeted functional, accessibility, lint, typecheck and build criteria above on the integration branch. The full public regression, authenticated QA, persistence, informational journeys, Event Room, Deployment and exact-head Release Gate remain mandatory on the final consolidated Phase 3 head before the single merge.