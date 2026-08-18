## Documentation Maintenance Rule
This documentation lives in the repository and is a living part of the codebase, not a separate artifact. Any change to architecture, features, design system, data model, or infrastructure MUST update the relevant file(s) in /docs as part of the SAME commit or pull request — never as a follow-up task. A pull request that changes functionality without a corresponding /docs update is incomplete and should not be merged. Every entry added to DECISIONS.md must include what changed, why, who/which session made the call, and the date.

# Mettelo engineering handbook

This directory is the entry point for understanding, operating, and extending the Mettelo platform. It was audited against the application code, migrations, workflows, tests, and Git history on 18 August 2026.

## Mandatory first step

Every human developer, contractor, contributor, coding agent, and new ChatGPT development session must begin with the root [AGENTS.md](../AGENTS.md), then [Developer start here](DEVELOPER-START-HERE.md), **before making product or infrastructure changes**.

`AGENTS.md` is the mandatory senior-engineering startup contract. It requires live repository verification, the engineering reading sequence, preservation boundaries, written success criteria, and a Repository Readiness Brief before implementation work is allowed.

For a copy/paste first message to use in a new ChatGPT or coding-agent session, use [AI senior developer startup prompt](AI-SENIOR-DEVELOPER-STARTUP-PROMPT.md).

These documents define the Rolling Green Baseline, required current-state verification, change-scope protections, deployment ordering, and the exact procedure for deciding when a newer `main` commit is allowed to become the baseline. A handoff or previous chat is context only; it is not proof of current repository state.

## Start here

| Document | Use it for |
| --- | --- |
| [Root AGENTS.md](../AGENTS.md) | Mandatory senior software/UIUX/backend startup contract and Repository Readiness Brief |
| [AI senior developer startup prompt](AI-SENIOR-DEVELOPER-STARTUP-PROMPT.md) | Copy/paste first prompt or short-form instruction for every new AI development session |
| [Developer start here](DEVELOPER-START-HERE.md) | Mandatory cold start, Rolling Green Baseline, scope protection, pre-change verification, and post-merge baseline advancement |
| [Architecture](ARCHITECTURE.md) | Runtime boundaries, folders, data model, environment variables, auth, RLS, storage, and scheduled jobs |
| [Features](FEATURES.md) | Product capabilities, canonical routes, dependencies, and implementation trade-offs |
| [Design system](DESIGN-SYSTEM.md) | Ink and Value tokens, typography, spacing, responsive rules, accessibility, and component patterns |
| [Decision log](DECISIONS.md) | Why consequential implementation choices were made and which commit/session is the source |
| [CI/CD](CI-CD.md) | GitHub Actions gates, Playwright layers, Vercel flow, release checks, and rollback |
| [Onboarding](ONBOARDING.md) | First-day setup, local development, Supabase preparation, test commands, and change-safety checks |
| [Regression testing](REGRESSION_TESTING.md) | Required release-gate journeys and staging test data |
| [Open issues](OPEN-ISSUES.md) | Confirmed gaps, stale launch assertions, operational TODOs, and current workarounds |
| [Phase 1 auth content standard](phase-1-auth-content-standard.md) | Canonical authentication language and Supabase email templates |

## Repository-level source material

- [AI/developer startup contract](../AGENTS.md) — mandatory first instruction before any implementation session.
- [Project README](../README.md) — concise introduction and developer entry point.
- [Engineering rules](../CONTRIBUTING.md) — non-negotiable implementation, security, review, and definition-of-done rules.
- [Launch readiness](../LAUNCH_READINESS.md) — the 9 August 2026 launch audit. Treat its status assertions as historical until re-verified; see [Open issues](OPEN-ISSUES.md).
- [Phase 1 success criteria](../PHASE_1_SUCCESS_CRITERIA.md) — the full 125-point authentication and onboarding acceptance checklist. Its `IN PROGRESS` status remains authoritative until evidence is recorded.

## How to use this handbook

- Everyone: start with [AGENTS.md](../AGENTS.md), then [Developer start here](DEVELOPER-START-HERE.md), and verify the current Rolling Green Baseline before work begins.
- New AI session: execute [AI senior developer startup prompt](AI-SENIOR-DEVELOPER-STARTUP-PROMPT.md) or the short form it contains.
- New developer: then read [Onboarding](ONBOARDING.md), [Architecture](ARCHITECTURE.md), and [Engineering rules](../CONTRIBUTING.md).
- Feature owner: read [Features](FEATURES.md), the relevant source routes, and [Regression testing](REGRESSION_TESTING.md).
- Designer/frontend engineer: read [Design system](DESIGN-SYSTEM.md) and the responsive/accessibility sections of [Engineering rules](../CONTRIBUTING.md).
- Backend/data engineer: read [Architecture](ARCHITECTURE.md), especially the Supabase boundaries and schema-bootstrap warning.
- Release owner: read [CI/CD](CI-CD.md) and [Open issues](OPEN-ISSUES.md) before promotion.

## Source-of-truth order

When documentation conflicts, resolve it in this order:

1. Current code, migrations, and workflow definitions.
2. `CONTRIBUTING.md` for engineering policy.
3. This handbook for system intent and operating guidance.
4. `PHASE_1_SUCCESS_CRITERIA.md` and `LAUNCH_READINESS.md` for dated acceptance/readiness evidence.

Do not silently “correct” a discrepancy only in prose. Update the implementation or document the unresolved mismatch in [Open issues](OPEN-ISSUES.md).
