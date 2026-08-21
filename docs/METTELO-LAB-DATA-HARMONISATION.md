# Phase 11 — Mettelo Lab Data harmonisation

## User story
As a Mettelo Lab member, I want Data to make source access, quality, ownership and limitations easy to understand so the team can govern project data without the page feeling like a legacy form.

## Success criteria
- keep the authoritative `DataNativeWorkspace` implementation and API behaviour;
- remove the legacy eyebrow collision and oversized Data heading treatment;
- make source governance state easier to scan;
- keep the security warning visible but secondary to the page purpose;
- make source type/name/quality, access, sensitivity, format, period and unit readable without badge overload;
- keep known limitations and external-source links resilient to long content;
- make `Add a linked data source` the clear creation affordance without turning the page into a form-first experience;
- preserve 44px practical controls, visible focus states and 16px mobile form text;
- collapse to a single-column mobile layout with no horizontal overflow;
- use shared Lab shell tokens and no local hard-coded colour palette.

## Preservation boundary
RED unchanged:
- `/api/project-data-workspace`;
- project/run resolution;
- source creation payloads;
- access/quality governance updates;
- owner permissions;
- auth/RLS;
- database schema and Production data.

AMBER:
- Data page hierarchy;
- typography;
- source-card presentation;
- empty-state presentation;
- form/composer presentation;
- responsive layout.

## Responsive contract
Desktop uses a controlled two-column header with the security note as secondary context. Tablet collapses the header before content becomes cramped. Mobile uses one-column source records, governance facts and form fields, with full-width action buttons and 16px inputs.

## Verification
- lint;
- typecheck;
- `npm run audit:mettelo-lab` including the Phase 11 Data audit;
- build;
- authenticated Mettelo Lab Chromium visual QA;
- Data screenshots across the existing viewport matrix;
- no-horizontal-overflow and 200% zoom coverage.

## Rollback
Remove the Phase 11 composition, stylesheet and audit chain entry. No API, database or data rollback is required.
