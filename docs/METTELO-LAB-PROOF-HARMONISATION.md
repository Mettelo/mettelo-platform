# Phase 12 — Mettelo Lab Proof Harmonisation

## User story
As a Mettelo Lab member, I want Proof to make contribution evidence and review state immediately understandable so I can submit, inspect and review evidence without the screen feeling like a generic form queue.

## Success criteria
- Preserve the authoritative contribution submission and review implementations.
- Make contribution title, contributor, type, linked workspace evidence and verification state easy to scan.
- Keep evidence content primary and review controls secondary.
- Keep the Contribution Ledger structured and readable.
- Preserve pending, needs-changes, verified and rejected workflows without changing transition logic.
- Keep long evidence labels, notes and URLs safely wrapped.
- Maintain 44px practical interaction targets and clear focus-visible states.
- Collapse review headers, evidence links and actions cleanly on mobile.
- Keep mobile form controls at 16px and support 200% zoom.
- Use shared Lab shell tokens only; no parallel hard-coded colour palette.

## Preservation boundary
### RED — unchanged
- `/api/contributions`
- `/api/project-contributions`
- contribution payloads and evidence links
- reviewer permissions
- verification transitions
- task completion side effects
- auth/RLS
- project/run resolution
- readiness logic
- database schema and Production data

### AMBER — presentation only
- Proof section hierarchy
- contribution-form presentation
- Contribution Ledger presentation
- review queue/card hierarchy
- linked-evidence presentation
- reviewer-action layout
- responsive behaviour

## Responsive contract
Desktop uses evidence-first content with review controls contained but secondary. Tablet collapses multi-column review headers. Mobile uses a single-column flow, full-width review actions and 16px form controls with no horizontal overflow.

## Verification
Phase 12 is protected by `scripts/audit-mettelo-lab-proof.mjs`, chained into `npm run audit:mettelo-lab`. Final sign-off also requires lint, typecheck, build, authenticated Mettelo Lab Chromium visual QA, 200% zoom coverage and the normal release gates.

## Rollback
Remove the Phase 12 CSS composition, stylesheet and audit-chain entry. No API, database or data rollback is required.
