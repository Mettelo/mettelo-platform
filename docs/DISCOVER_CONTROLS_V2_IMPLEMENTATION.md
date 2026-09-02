# Discover Controls V2 — Implementation Notes

Implemented surfaces:

- `app/member/discover/page.tsx`
- `components/MemberCapabilityPathFilters.tsx`
- `components/MemberDiscoverCatalogue.tsx`

## Information hierarchy

Hero → compact Path context → search → Filters trigger → active refinements → result count → project catalogue.

## Mobile behaviour

- Path selection remains compact until the member chooses `Change Path` / `Choose Path`.
- Project filters use a native modal dialog rendered as a bottom sheet below 680px.
- Active filters are horizontally scrollable chips and do not force the page wider than the viewport.
- `Show N projects` communicates the immediate consequence of filter changes.

## Desktop behaviour

- Search and one Filter action replace the previous always-visible five-select row.
- Filters use a contained modal refinement panel rather than competing with the hero and Path controls.
- Current Path context is readable without opening a form.

## Preserved behaviour

- Path query parameters remain `path` and `stage`.
- Search/filter logic remains client-side over the server-authorised project set.
- Existing project cards, Save behaviour and member project lifecycle actions are retained.
