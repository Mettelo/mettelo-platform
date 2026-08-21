# Mettelo Lab architecture

Last updated: 21 August 2026

## Purpose

Mettelo Lab is the authenticated collaboration workspace inside a project. Its architecture must remain easy to reason about because the same project data appears across Home, Plan, Tasks, Chat, Data, Proof, Resources, Events, Team and More.

## Phase 1 architecture decision

Mettelo Lab has one authoritative Home/Team presentation implementation: `components/MetteloLabPanel.tsx` with `components/MetteloLabPanel.module.css`.

The former `components/MetteloLabClient.tsx` duplicated Home, Team, activity, responsive rules, terminology and action routing but had no runtime consumer. It has been removed. The deterministic Lab audit now fails if that duplicate file is reintroduced and verifies that the project page imports and renders `MetteloLabPanel`.

This consolidation is intentionally presentation-only. It does not change project membership, project-run selection, cohort privacy, RLS, authentication, Admin access, database schema, APIs, reviewer permissions or notification behavior.

## Runtime ownership

- `app/member/projects/[id]/layout.tsx` owns the authenticated Lab shell, left rail, mobile header, optional right context rail and mobile navigation placement.
- `components/MetteloLabNavigation.tsx` owns Lab destinations and active-state URL behavior.
- `components/MetteloLabViewSurface.tsx` maps the `view` search parameter to the active Lab surface contract.
- `app/member/projects/[id]/page.tsx` loads the existing project workspace data and renders the canonical `MetteloLabPanel` Home/Team surface plus the existing project-delivery sections used by other Lab views.
- `components/MetteloLabPanel.tsx` is the single authoritative Home/Team presentation component.
- `components/MetteloLabPanel.module.css` is the single authoritative Home/Team component stylesheet.
- `scripts/audit-mettelo-lab-workspace.mjs` protects the architecture and required Lab contracts.
- `tests/mettelo-lab-visual.spec.ts` provides authenticated responsive browser evidence across Lab screens.

## Preservation boundary

### RED — unchanged

Authentication, member authorization, project membership, project-run authorization, RLS, database schema, service-role boundaries, Admin capabilities, project lifecycle, contribution/proof permissions, notification contracts and Production data.

### AMBER — controlled Lab ownership

Lab navigation, shell, shared project-workspace presentation, responsive CSS and the canonical Home/Team component may be changed only with consumer analysis and regression evidence.

### GREEN — local presentation

Contained Lab copy, spacing, hierarchy and local visual composition may evolve while preserving the contracts above.

## Responsive and accessibility contract

Every Lab UI change must deliberately support:

- mobile `<=480px`;
- tablet `481-1024px`;
- desktop `>=1025px`;
- no unintended horizontal overflow;
- usable content at 200% zoom;
- visible keyboard focus;
- 44x44 CSS pixel interaction targets where practical;
- non-colour-only status communication;
- accessible names for icon-only controls.

The browser suite currently exercises 320, 360, 375, 390, 412, 414, 430, 768, 1024 and 1440 widths. Later stabilisation phases may extend that matrix further without weakening existing coverage.

## Verification

For any Lab architecture or presentation change, run at minimum:

```bash
npm run lint
npm run typecheck
npm run audit:mettelo-lab
npm run audit:interactions
npm run audit:regression-coverage
npm run build
```

Authenticated visual/regression evidence is required through the scope-appropriate CI path. A skipped required test is not green.

## Rollback

Revert the focused Lab architecture commit or pull request. No database migration, data backfill or permission migration is involved in Phase 1 consolidation.
