## Documentation Maintenance Rule
This documentation lives in the repository and is a living part of the codebase, not a separate artifact. Any change to architecture, features, design system, data model, infrastructure, or release-gate behavior MUST update the relevant file(s) in /docs as part of the SAME commit or pull request — never as a follow-up task. A pull request that changes functionality without a corresponding /docs update is incomplete and should not be merged. Every entry added to DECISIONS.md must include what changed, why, who/which session made the call, and the date.

# Mettelo engineering handbook

This directory is the entry point for understanding, operating, and extending the Mettelo platform. It was audited against the application code, migrations, workflows, tests, and Git history on 18 August 2026.

## Start here

| Document | Use it for |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | Runtime boundaries, folders, data model, environment variables, auth, RLS, storage, and ephemeral CI Supabase |
| [Features](FEATURES.md) | Product capabilities, canonical routes, dependencies, and implementation trade-offs |
| [Design system](DESIGN-SYSTEM.md) | Ink and Value tokens, typography, spacing, responsive rules, accessibility, and component patterns |
| [Decision log](DECISIONS.md) | Why consequential implementation choices were made and which commit/session is the source |
| [CI/CD](CI-CD.md) | GitHub Actions gates, isolated Supabase E2E, Vercel flow, release checks, and rollback |
| [Onboarding](ONBOARDING.md) | First-day setup, local development, Supabase preparation, test commands, and change-safety checks |
| [Regression testing](REGRESSION_TESTING.md) | Required release-gate journeys and isolated test data |
| [Open issues](OPEN-ISSUES.md) | Confirmed gaps, stale launch assertions, operational TODOs, and current workarounds |
| [Phase 1 auth content standard](phase-1-auth-content-standard.md) | Canonical authentication language and Supabase email templates |

## Repository-level source material

- [Project README](../README.md) — concise introduction and developer entry point.
- [Engineering rules](../CONTRIBUTING.md) — non-negotiable implementation, security, review, and definition-of-done rules.
- [Launch readiness](../LAUNCH_READINESS.md) — the 9 August 2026 launch audit. Treat its status assertions as historical until re-verified; see [Open issues](OPEN-ISSUES.md).
- [Phase 1 success criteria](../PHASE_1_SUCCESS_CRITERIA.md) — the full 125-point authentication and onboarding acceptance checklist. Its `IN PROGRESS` status remains authoritative until evidence is recorded.

## How to use this handbook

- New developer: read [Onboarding](ONBOARDING.md), [Architecture](ARCHITECTURE.md), then [Engineering rules](../CONTRIBUTING.md).
- Feature owner: read [Features](FEATURES.md), the relevant source routes, and [Regression testing](REGRESSION_TESTING.md).
- Designer/frontend engineer: read [Design system](DESIGN-SYSTEM.md) and the responsive/accessibility sections of [Engineering rules](../CONTRIBUTING.md).
- Backend/data engineer: read [Architecture](ARCHITECTURE.md), especially the Supabase boundaries and canonical migration-history warning.
- Release owner: read [CI/CD](CI-CD.md) and [Open issues](OPEN-ISSUES.md) before promotion.

## Source-of-truth order

When documentation conflicts, resolve it in this order:

1. Current code, canonical migrations, and workflow definitions.
2. `CONTRIBUTING.md` for engineering policy.
3. This handbook for system intent and operating guidance.
4. `PHASE_1_SUCCESS_CRITERIA.md` and `LAUNCH_READINESS.md` for dated acceptance/readiness evidence.

CI-only compatibility artifacts under `supabase/ci/` are evidence for the disposable release-test environment; they do not override the canonical `supabase/migrations/` history for Production.

Do not silently “correct” a discrepancy only in prose. Update the implementation or document the unresolved mismatch in [Open issues](OPEN-ISSUES.md).
