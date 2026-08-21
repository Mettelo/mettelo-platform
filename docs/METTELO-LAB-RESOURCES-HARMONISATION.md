# Mettelo Lab Phase 13 — Resources Harmonisation

## User story
As a Mettelo Lab member, I want Resources to work like a clear reference library so I can quickly understand what each resource is for and open the right material without scanning oversized generic cards.

## Success criteria
- Preserve the existing `#resources` implementation and resource data flow.
- Keep resource title, type, description/purpose and destination easy to scan.
- Use a balanced two-column desktop library that collapses to one column on tablet/mobile.
- Remove unnecessary minimum card height so sparse resources do not create dead space.
- Keep resource links/actions at least 44px high with visible keyboard focus.
- Keep long titles, descriptions and URLs naturally wrapped without horizontal overflow.
- Keep empty and creation states clear and visually consistent with the Lab shell.
- Keep form controls at 16px on mobile and maintain 200% zoom usability.
- Use shared Lab shell tokens only; do not introduce a local hard-coded colour palette.
- Preserve all resource visibility, project/run scoping, persistence, URLs, permissions and existing APIs.

## Information hierarchy
1. Resources heading and short purpose statement.
2. Resource library/list.
3. Resource title as the primary card element.
4. Resource type and descriptive context as supporting metadata.
5. Open-resource link as the clear action.
6. Empty/add-resource state where available.

## Responsive contract
- Desktop: two-column library with content-driven card height.
- Tablet: one-column library and single-column header.
- Mobile: one-column cards, compact padding, 16px form controls, no horizontal overflow.
- 200% zoom must remain usable without clipped content or forced sideways scrolling.

## Preservation boundary
### RED — unchanged
- `project_resources` data and query behaviour.
- Project/run scoping and membership visibility.
- Resource URLs and persistence.
- Auth, RLS, database schema and Production data.
- Existing creation/update APIs and permission logic.

### AMBER — Phase 13 only
- Resources typography and spacing.
- Resource-card density and hierarchy.
- Empty/composer presentation.
- Responsive layout and focus treatment.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run audit:mettelo-lab`
- `npm run build`
- Authenticated Mettelo Lab Chromium visual QA.
- Resources screenshots across desktop/tablet/mobile coverage.
- Existing no-horizontal-overflow and 200% zoom assertions.

## Rollback
Remove the Phase 13 composition, stylesheet, audit entry and this document. No database, API or data rollback is required.
