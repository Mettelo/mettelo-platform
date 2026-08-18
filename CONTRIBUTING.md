# Mettelo engineering rules

This document defines the non-negotiable way we design, build, review and release Mettelo. It applies to employees, contractors, contributors and automated coding agents.

The goal is simple: improvements must not silently break functionality that already works.

## 1. Define success before implementation

Every material change must begin with written, testable success criteria. Include:

- the user journey being changed;
- the expected result;
- permission and security boundaries;
- mobile, tablet and desktop behaviour;
- loading, empty, success and error states;
- the existing behaviour that must not regress;
- how the result will be verified.

Do not start implementation from a screenshot alone. Confirm both the visual requirement and the underlying user outcome.

## 2. Preserve complete user journeys

Review changes as end-to-end journeys, not isolated components:

```text
User action → UI validation → API route → database/RLS → Admin visibility → notification → confirmation
```

A form is not complete merely because its button can be clicked. A successful form change must prove that:

1. entered values survive every review or multi-step screen;
2. the intended canonical endpoint receives the correct payload;
3. invalid requests return a clear, actionable error;
4. valid requests create the expected database record exactly once;
5. the correct member or Admin queue can read the record;
6. promised email, outbox or in-app notification records are created;
7. success is clearly confirmed to the user;
8. retrying does not create unsafe duplicates;
9. the complete flow works at supported breakpoints.

Do not create a second endpoint for an existing business journey. Extend the canonical endpoint and its tests instead.

## 3. Frontend and interaction rules

- Use semantic HTML before adding ARIA.
- Every button must submit a form, open/close a disclosed interface, or have an explicit handler.
- Every link must have a real destination. Do not ship `href="#"`, placeholder actions or dead controls.
- Icon-only controls require an accessible name.
- Keyboard focus must remain visible and follow a logical order.
- Dialogs and navigation drawers must support Escape, focus management and an explicit close control.
- Async operations require loading, success and error states. Disable repeated submission while a request is in flight.
- Never discard user-entered form values after a recoverable error.
- Do not ship development overlays, debug badges, fixtures or diagnostic scripts in production UI.
- Avoid layout fixes that hide content, disable scrolling or rely on hard-coded screen dimensions.

### Responsive behaviour

Every user-facing change must be checked at all three ranges:

| Range | Width | Required behaviour |
| --- | ---: | --- |
| Mobile | `<= 480px` | Single-column where appropriate, reachable controls, no horizontal overflow, touch targets at least 44×44 CSS pixels where practical |
| Tablet | `481–1024px` | Deliberate intermediate layout; do not assume desktop styles naturally fit |
| Desktop | `>= 1025px` | Complete hierarchy and efficient use of space without excessive card width or line length |

Content must remain usable at 200% browser zoom and with long names, validation messages and translated-length text.

### Accessibility baseline

All work must meet WCAG 2.2 AA:

- text contrast of at least 4.5:1;
- non-text UI/component contrast of at least 3:1;
- no colour-only status communication;
- visible keyboard focus;
- accessible labels and instructions for form controls;
- logical headings and landmarks;
- status and validation messages announced appropriately;
- reduced-motion preferences respected where motion is non-essential.

## 4. API and backend rules

- Validate and normalise all input on the server. Client validation is an enhancement, not a security boundary.
- Use appropriate HTTP status codes: `400/422` validation, `401` unauthenticated, `403` unauthorised, `404` missing resource, `409` state conflict, `503` missing required service configuration.
- Return safe user-facing errors. Log operational context without passwords, tokens, CV contents or sensitive payloads.
- Keep business lifecycle rules in one authoritative location and exercise them in tests.
- Make submission endpoints idempotent where repeat requests are possible.
- Do not perform privileged work from client components.
- A missing required backend dependency must fail clearly; it must never look like a successful submission.

## 5. Supabase, RLS and database rules

- The service-role key is server-only. Never expose it in a `NEXT_PUBLIC_*` variable, client bundle, browser log, test trace or committed file.
- Use one service-role key per Supabase project/environment. Do not create separate service keys per form.
- Keep RLS enabled on exposed application tables.
- Normal member reads/writes must use authenticated RLS wherever possible.
- Use the privileged client only for work that genuinely needs it, such as Admin operational actions, protected email lookup, notifications or server-owned intake writes.
- Admin identity must be established from trusted auth metadata before privileged database access.
- Every schema, policy, function or index change must be committed as a migration in `supabase/migrations/`.
- Never make a production-only schema change that is absent from version control.
- Add indexes for foreign keys and for columns used by queue filters, joins and ordering.
- Review security and performance advisors after database changes.
- New public tables need explicit grants and RLS policies; do not assume they become API-accessible automatically.

Destructive tests must use a dedicated staging project/branch and disposable accounts. The E2E guard must refuse the production Supabase project.

## 6. Authentication and authorisation

- Protect `/member/*` and `/admin/*` at both routing and data-access layers.
- Do not trust a hidden link or client-side redirect as authorisation.
- Admin routes require `app_metadata.role === "admin"` or the repository's documented equivalent.
- Never add a default Admin account or public Admin-promotion route.
- Authentication redirect URLs must be environment-specific and must return users to the intended Mettelo route.
- Tests must cover guest, member, Project Architect and Admin boundaries.

## 7. Required regression testing

Read [docs/REGRESSION_TESTING.md](docs/REGRESSION_TESTING.md) before changing navigation, forms, authentication, API routes, RLS, queues, notifications or deployment configuration.

At minimum, run:

```bash
npm ci
npm run lint
npm run typecheck
npm run audit:interactions
npm run audit:regression-coverage
npm run test:regression
npm run build
```

For backend journeys, also run the staging suite:

```bash
npm run check:e2e-config
npm run test:e2e:staging
```

When adding or materially changing a form, API route, protected workspace or Admin queue, update the relevant regression test in the same pull request. A skipped critical test is not a passing test.

Do not weaken assertions, increase arbitrary timeouts, disable lint rules or mark tests as skipped merely to make CI green. Fix the product or explain and obtain review for a justified test change.

## 8. Pull requests and review

- Keep each pull request focused on one coherent outcome.
- Do not silently include unrelated working-tree changes.
- Explain the user impact, root cause, implementation and verification evidence.
- Include screenshots for visual changes at mobile, tablet and desktop sizes.
- Include the tested user journey for form/backend changes.
- Call out migrations, environment variables, data backfills and rollback steps.
- Resolve all failing required checks before merge.
- Do not push an unverified change directly to `main`.

The `Release gate` GitHub check must be required by branch protection. A production deployment must not be promoted unless the release gate succeeds.

## 9. Secrets and deployment configuration

- Never commit real `.env` values, access tokens, service keys or credentials.
- Document new variables in `.env.example` using empty or clearly fake values.
- Validate required server configuration during CI/build with actionable errors.
- Keep Preview/staging and Production variables separate.
- A secret visible in Vercel does not prove the deployed function can use it; verify the correct environment and redeploy after changes.
- Production smoke checks must be read-only unless an explicitly approved test account and cleanup strategy exist.

## 10. Definition of done

A change is done only when:

- success criteria are satisfied;
- functionality works, not just appearance;
- WCAG and all responsive ranges are covered;
- server validation and permission boundaries are correct;
- migrations and indexes are versioned when applicable;
- regression tests were added or updated;
- lint, typecheck, audits, tests and production build pass;
- staging proves database/Admin/notification journeys when applicable;
- documentation and environment examples are current;
- rollback or recovery is understood;
- the required release gate is green.

If any item cannot be verified, state that limitation explicitly. Never report a test, deployment or merge as successful without evidence.

## 11. Incident and rollback rule

If a release breaks a critical form, authentication, Admin queue or data operation:

1. stop additional production changes;
2. capture the failing journey and relevant logs without exposing secrets;
3. roll back or disable the smallest affected change;
4. protect submitted user data before cleanup;
5. add a regression test that reproduces the failure;
6. implement and verify the fix through the normal release gate;
7. document the root cause and prevention measure.

Fast recovery is important, but bypassing tests or security controls is not an acceptable fix.
