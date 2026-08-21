# Mettelo Lab Phase 15 — More + Mobile IA

## Purpose

Phase 15 makes the mobile information architecture intentional rather than treating the desktop Lab navigation as a compressed mobile menu.

## Mobile navigation contract

The four direct mobile destinations remain:

- Home
- Tasks
- Chat
- Data

More owns the secondary destinations:

- Plan
- Proof
- Resources
- Events
- Team

No route or destination changes are introduced. Every destination continues to use the existing `?view=` contract.

## Active-state hierarchy

The More bottom-navigation item remains visually and programmatically current while the member is inside any secondary destination. This prevents mobile context loss after navigating from More into Plan, Proof, Resources, Events or Team.

The current secondary destination is also exposed through the More trigger's accessible label, for example `More, Events selected`.

## More surface

The More page is a compact project-tool directory rather than a generic overflow menu. Each destination has:

- an icon;
- a primary label;
- a concise purpose description;
- a directional affordance.

The surface uses two columns across normal mobile widths and collapses to one column at 360px and below. Short mobile landscape retains a compact two-column layout.

## Accessibility and resilience

- direct navigation items remain at least 58px high;
- More destination cards remain well above the 44px practical target;
- focus-visible outlines use the shared Lab focus token;
- labels and descriptions wrap naturally;
- the More surface is width-bounded and introduces no fixed-position layer;
- safe-area handling remains owned by the existing bottom navigation shell;
- the Phase 15 layer uses shared Lab shell tokens and introduces no local colour palette.

## Preservation boundary

Phase 15 does not change:

- project membership or permissions;
- unread Chat calculation;
- desktop/tablet Lab rail destinations;
- route names or `view` query values;
- Home, Plan, Tasks, Chat, Data, Proof, Resources, Events or Team business behaviour;
- auth, RLS, database schema, APIs or Production data.

## Verification

`npm run audit:mettelo-lab` includes `scripts/audit-mettelo-lab-mobile-more.mjs`, which protects direct and secondary destination ownership, More active-state continuity, route preservation, token usage, practical target size, focus visibility and narrow-mobile behaviour.

Authenticated Chromium QA remains required across the existing Mettelo Lab viewport matrix, including More at 320–430px and 200% text zoom.

## Rollback

Remove the Phase 15 composition, stylesheet, navigation hierarchy refinement, audit-chain entry and this document. No data, API or database rollback is required.
