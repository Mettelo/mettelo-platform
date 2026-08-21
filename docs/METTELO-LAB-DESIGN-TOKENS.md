# Mettelo Lab design tokens

Last updated: 21 August 2026

## Purpose

Phase 2 establishes a stable, Lab-scoped visual contract before deeper shell, Chat and screen-by-screen redesign work. The goal is to stop individual Lab surfaces from inventing their own colours, radii, spacing, focus treatments and interaction sizing.

## Current token owner

The canonical Home/Team stylesheet `components/MetteloLabPanel.module.css` owns the initial scoped token contract on `.metteloLab`.

The tokens are CSS custom properties rather than hard-coded component constants so later Lab phases can migrate shell, Chat and other surfaces toward the same language without changing business logic.

## Token groups

### Colour and surfaces

- `--lab-ink` — primary dark action/text surface
- `--lab-text` — standard strong content text
- `--lab-muted` / `--lab-subtle` — supporting text
- `--lab-border` / `--lab-border-soft` / `--lab-border-strong` — structural borders
- `--lab-surface` / `--lab-surface-soft` / `--lab-surface-warm` — base card surfaces
- `--lab-sand` / `--lab-sand-soft` — warm contextual surfaces
- `--lab-bronze` / `--lab-bronze-strong` — Mettelo accent hierarchy
- `--lab-focus` — visible keyboard focus colour

### Shape

- `--lab-radius-sm`
- `--lab-radius-md`
- `--lab-radius-lg`

### Spacing

- `--lab-space-1` through `--lab-space-5`

These align with the repository design-system spacing rhythm rather than introducing arbitrary new scales.

### Interaction

- `--lab-target: 44px` is the minimum practical interaction-height contract used by Lab actions.

## Phase 2 migration boundary

This phase deliberately starts with the canonical Home/Team surface established in Phase 1. It does not attempt a broad visual rewrite of the shell or Chat in the same pull request.

Subsequent phases should consume these semantic token names when they take ownership of shell, Chat, navigation and individual Lab screens. They should not copy the resolved hex/radius values into new one-off rules.

## Preservation boundary

This token layer is presentation-only. It must not change:

- authentication or authorization;
- project membership or project-run access;
- RLS or database schema;
- APIs or service-role boundaries;
- Admin capabilities;
- task/proof/reviewer permissions;
- notification or project lifecycle behaviour.

## Accessibility contract

- visible focus must remain present;
- focus cannot be disabled with `outline:none`;
- practical primary interaction targets remain at least 44px high;
- colour is not the only status signal;
- text remains usable at 200% zoom;
- no responsive breakpoint may introduce horizontal page overflow.

## Verification

`npm run audit:mettelo-lab` asserts the presence and use of the critical token set, the 44px target contract, and the absence of focus-outline removal. Normal repository lint, typecheck, build, authenticated visual QA and scope-required CI remain mandatory before merge.

## Rollback

Revert the Phase 2 pull request. No migration, backfill or data rollback is required.
