# Project Experience Phase 4 — Public Project Discovery Experience

## Status

**IMPLEMENTATION STARTED — READINESS / ARCHITECTURE TRUTH COMPLETE.**

Phase 4 is intentionally stacked on the final Phase 3 implementation handoff commit. Another developer owns Phase 3 merge/release mechanics. Phase 4 must preserve the Phase 1 identity, Phase 2 profile/account, and Phase 3 canonical project-governance contracts.

## Phase objective

Make the public Projects experience a reliable discovery and decision surface built from the same canonical project definition used by Project Architects, Admin governance, members and later formation/Lab flows.

The public journey must help a visitor:

1. understand what Mettelo projects are;
2. discover relevant projects quickly;
3. search/filter/sort without unnecessary waiting or stale results;
4. understand availability, participation format, role/career fit, capability, industry, tools, commitment and project stage;
5. inspect a complete project detail before signing in/applying;
6. continue cleanly into the authenticated member journey without losing project context.

## Existing architecture reviewed

### Public catalogue

`app/projects/page.tsx` is the canonical public catalogue surface. It already:

- loads only public project records through the public Supabase client;
- uses `loadPublicProjectCatalogue(...)` rather than a second project store;
- enriches projects with controlled role/capability/domain/tool/method facets;
- supports search, filters, sorting and pagination;
- preserves a selected capability-path context;
- uses authenticated state only to determine the continuation destination;
- keeps public discovery separate from authenticated qualification/application logic.

### Public filter interaction

`components/PublicProjectFilters.tsx` already implements:

- live/debounced filter preview;
- URL-synchronised filter state;
- result-count feedback before closing the filter drawer;
- filter chips and clear-all;
- desktop and mobile controls;
- keyboard handling for capability search;
- focus return from the filter dialog;
- `aria-live` result status;
- catalogue analytics events.

This must be extended rather than replaced.

### Catalogue read model

`lib/public-project-catalogue-loader.ts` is the canonical public catalogue loader. It currently reads:

- canonical project identity/title/summary/status/type;
- location/working model;
- difficulty;
- duration/commitment/deadline/application-open state;
- role/capability/domain/tool/method relations;
- project runs.

It includes backward-compatible fallback selects so older hosted schemas do not crash the public catalogue.

### Filtering model

`lib/project-catalogue-filtering.ts` owns public catalogue normalisation/filtering/sorting.

Existing facets include:

- Career / Role;
- Experience;
- Format;
- Skill / capability;
- Industry;
- Tool;
- Commitment;
- Working model;
- Project source;
- Availability;
- Stage;
- Duration;
- Capability Path.

### Public project detail

`app/projects/[id]/page.tsx` loads the same canonical `projects` record plus governed project detail/planning/role metadata and builds `ProjectExperienceModel`.

`ProjectPublicDetailV2` is the current public decision surface and includes:

- challenge/summary;
- availability;
- duration;
- commitment;
- team information;
- work format;
- difficulty;
- deadline;
- public approved resource metadata;
- authenticated/non-authenticated continuation CTA.

## Phase 4 readiness findings

### Finding 1 — Phase 3 participation is not yet represented canonically in public discovery

This is a Phase 4 blocking integration item.

The current public loader and public detail query still read `team_size_threshold` but do not read:

- `participation_mode`;
- `min_team_size`;
- `target_team_size`;
- `max_team_size`.

The current public catalogue format normaliser derives only:

- Solo when legacy threshold = 1;
- Team when legacy threshold > 1.

Therefore a canonical Phase 3 `flexible` project is currently indistinguishable from legacy Team/Solo behaviour on public discovery.

**Required fix:** Phase 4 must read the canonical Phase 3 participation fields and make them the public display/filter contract, using `team_size_threshold` only as a backward-compatibility fallback.

### Finding 2 — public detail exposes only the legacy minimum formation number

`ProjectPublicDetailV2` currently displays `teamSizeThreshold` as the Team value. That does not communicate Phase 3 minimum/target/maximum capacity or Flexible participation.

**Required fix:** extend `ProjectExperienceProject` and the public detail projection to carry canonical participation and show a decision-useful participation summary without exposing runtime Phase 9 semantics that do not exist yet.

### Finding 3 — catalogue filtering is already the correct shared public architecture

The filter system should not be rewritten. Recent UX improvements already address key catalogue pain points:

- immediate preview after filter selection;
- count visible before closing the drawer;
- debounced search rather than a full blocking interaction per click;
- reusable controlled taxonomy values;
- URL-preserved state.

Phase 4 should preserve these behaviours and add only missing canonical project facets/labels.

### Finding 4 — public and member discovery must remain distinct surfaces over shared canonical data

Phase 4 owns the public discovery experience. Phase 5 owns authenticated qualification/member-project experience.

Public pages may explain project fit and availability, but they must not duplicate the Phase 5 qualification engine or application state machine.

### Finding 5 — public Supabase access remains mandatory sign-off scope

The public catalogue/detail must continue to obtain only records that RLS/public visibility rules permit. Phase 4 must not introduce a service-role catalogue endpoint simply to bypass public read policies.

Any schema or query change introduced in this phase must be backed by repository migrations when schema changes are actually required. Phase 4 currently expects to reuse Phase 3 schema rather than create duplicate participation fields.

## Canonical Phase 4 product decisions

1. `public.projects` remains the public catalogue route.
2. `public.projects/[id]` remains the public project-detail route.
3. `public.projects` data remains the same canonical `projects` table and relations.
4. Phase 3 participation fields become the source of truth for public participation labels.
5. `team_size_threshold` is fallback/compatibility only.
6. Public filtering continues to use controlled taxonomy and canonical catalogue normalisers.
7. Public availability remains derived from canonical project lifecycle + application state + role capacity; do not invent a second availability column.
8. Public project pages expose approved resource metadata only; protected stored-copy/resource links remain non-public.
9. Sign-in/apply continuation must preserve the selected project context.
10. Phase 4 must not implement Phase 5 qualification or Phase 9 team-formation state machines.

## Required implementation work

### A. Canonical participation propagation

- add Phase 3 participation columns to the public catalogue select/fallback strategy;
- add them to the public `Project` projection;
- extend public format normalisation to `solo | team | flexible`;
- ensure old projects still resolve safely through threshold fallback;
- add Flexible to the public format filter only when present in the data;
- preserve existing URL filter contract.

### B. Project cards / result list

Review every current project card/result for:

- project title and summary hierarchy;
- availability/status clarity;
- canonical participation mode;
- duration/commitment/working model;
- useful career/role context;
- View project CTA;
- Submit interest / authenticated continuation rules;
- consistent card dimensions;
- no misleading application CTA for unavailable projects;
- pagination/filter context preservation.

### C. Public project detail

- carry canonical participation into `ProjectExperienceModel`;
- display Solo/Team/Flexible clearly;
- show min/target/max only where decision-useful;
- preserve existing project challenge, roles, resources, deliverables, success criteria, evidence and CTA flow;
- keep role/application capacity checks authoritative;
- preserve public-only data boundaries.

### D. Empty/error/loading states

- catalogue database load failure must not masquerade as “0 projects”;
- zero-result filtering must explain that filters can be cleared;
- empty controlled facets must not render broken selectors;
- live preview failures must preserve the last usable catalogue and expose a recoverable state where appropriate;
- no indefinite spinner/blocked filter interaction.

### E. Responsive/accessibility

Verify and fix:

- 320px mobile;
- 375/390px common mobile widths;
- tablet;
- desktop;
- 200% text reflow;
- dialog containment;
- no background scrolling while filter modal is open;
- focus entry/return;
- Escape close;
- keyboard capability autocomplete;
- native select labels;
- touch targets;
- no horizontal overflow;
- project cards/CTAs remain readable without truncating critical information.

### F. Supabase / security

Verify:

- public RLS exposes only intended public project rows and public-safe related metadata;
- Draft / Changes Requested / non-public records cannot leak through catalogue or detail;
- project detail cannot fetch protected resource URLs;
- no service-role public discovery workaround;
- existing project IDs and foreign-key relationships remain untouched;
- no Phase 4 duplicate schema.

### G. Analytics

Preserve existing catalogue events and verify useful signals for:

- filter opened;
- facet applied/removed;
- filters cleared;
- sort selected;
- zero result;
- project opened;
- pagination used.

If Phase 4 adds a new public participation facet, it must flow through the existing analytics shape rather than create a parallel analytics implementation.

## Phase 4 success criteria

Phase 4 is not complete until all applicable criteria below pass.

1. Public catalogue reads the canonical project model.
2. Public catalogue/detail understand Phase 3 Solo/Team/Flexible participation.
3. Existing projects remain compatible through safe fallback.
4. No duplicate public project/read-model architecture is introduced.
5. Search works across relevant project, role, skill, tool and industry text.
6. Career/role values remain deduplicated and taxonomy-controlled.
7. Filters preview results without requiring a separate “Show” round-trip for each selection.
8. Result count is visible before the filter drawer is closed.
9. Filter URL/history state remains stable.
10. Clear-all works without stale result state.
11. Sorting and pagination preserve active filters.
12. Zero-result state is clear and recoverable.
13. Project cards are consistent, decision-useful and expose correct CTA state.
14. Public project detail exposes the canonical challenge, role, commitment, participation, deliverable/resource/evidence context available for publication.
15. Public pages do not leak protected resource links or member-only/application data.
16. Sign-in continuation preserves the selected project.
17. Public RLS allows intended anonymous reads and blocks non-public project leakage.
18. No service-role workaround masks a broken public policy.
19. No hosted-only database change is required or introduced.
20. 320px/mobile/tablet/desktop and 200% reflow pass without critical overflow/clipping.
21. Keyboard/focus/dialog behaviour passes.
22. Loading/error/empty/success/disabled states are complete for affected interactions.
23. Public regression tests pass.
24. Authenticated continuation regression passes.
25. Build, lint, typecheck and blocking audits pass on the exact Phase 4 head.
26. Documentation records the final public read contract and any schema/RLS decision.

## Regression surface

Phase 4 changes must not break:

- homepage/public chrome;
- capability paths;
- Project Architect creation/editing;
- Admin governance/publication;
- existing project application routes;
- member Discover;
- project applications/interests;
- project memberships/formation;
- Lab;
- Proof;
- website CMS copy for the Projects page.

## Release posture

**NOT READY FOR SIGN-OFF.**

Readiness/architecture truth is complete. The first required implementation is canonical Phase 3 participation propagation through the existing public catalogue/detail model, followed by card/detail UX and RLS/browser regression validation.
