# Mettelo Lab Phase 16 — Responsive Typography & Content Stress

## Goal
Make the redesigned Mettelo Lab resilient to real content length, narrow viewports and enlarged text without changing any business behaviour.

## Success criteria
- controlled responsive heading scale across Lab views;
- natural wrapping for headings, descriptions, links, facts and labels;
- no one-character columns or aggressive arbitrary wrapping;
- grids collapse to one column before content becomes compressed;
- mobile labels remain readable at 320–430px;
- 200% text zoom retains navigation and content usability;
- existing no-horizontal-overflow assertions remain authoritative;
- short landscape layouts remain usable;
- no routing, APIs, persistence, permissions, auth or RLS changes.

## Presentation contract
`phase16-responsive-content-stress.module.css` is a cross-view resilience layer. It does not own individual page visual identity; phases 7–15 remain the owners of Home, Team, Plan, Tasks, Data, Proof, Resources, Events and mobile More presentation.

The layer provides:
- `min-width:0` / `max-width:100%` containment for text and interactive content;
- `overflow-wrap:break-word` with `word-break:normal` for natural wrapping;
- responsive section-heading clamps;
- bounded eyebrow/chip behaviour;
- one-column collapse of common content grids at tablet widths;
- mobile typography floors for small contextual labels.

## Verification
The blocking Lab audit verifies composition, natural wrapping, breakpoint coverage and the existing Chromium viewport matrix: 320, 360, 375, 390, 412, 414, 430, 768, 1024 and 1440px. It also requires the existing 200% text-zoom and horizontal-overflow checks in `tests/mettelo-lab-visual.spec.ts`.

Final sign-off still requires authenticated Chromium screenshots and the full release gate.

## Preservation boundary
No database schema, project/run logic, permissions, API payloads, route contracts, unread logic, contribution/event/task/data/resource behaviour or Production data is changed by Phase 16.

## Rollback
Remove the Phase 16 composition entry, stylesheet, audit-chain entry, audit file and this document. No data or backend rollback is required.
