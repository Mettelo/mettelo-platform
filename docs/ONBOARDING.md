# Developer onboarding

Last audited: 18 August 2026

## Before you start

Read, in order:

1. [Engineering rules](../CONTRIBUTING.md)
2. [Architecture](ARCHITECTURE.md)
3. [Features](FEATURES.md)
4. [Regression testing](REGRESSION_TESTING.md)
5. [Open issues](OPEN-ISSUES.md)

Do not use Production as a development database. Do not copy real service-role keys, member credentials, CVs, or intake content into issues, logs, tests, screenshots, or chat.

## Prerequisites

- Node.js 22 (the CI runtime)
- npm and the committed `package-lock.json`
- Git
- Chromium for Playwright (`npx playwright install chromium`)
- Access to an approved non-production Supabase project/branch
- Access to the matching Vercel Preview project only when deployment work requires it
- Supabase CLI only if the team uses it for database operations; it is not a package dependency and this repository currently has no `supabase/config.toml`

## Clone and install

```bash
git clone https://github.com/Mettelo/mettelo-platform.git
cd mettelo-platform
npm ci
cp .env.example .env.local
```

Use `npm ci`, not an unreviewed dependency update, for the initial setup.

## Configure local environment

Set at minimum:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-non-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Rules:

- Never commit `.env.local`.
- Never put the service-role key in a `NEXT_PUBLIC_*` variable.
- Use one service-role key for the selected Supabase environment; individual forms do not receive separate keys.
- Set `NEXT_PUBLIC_SITE_URL` to the current origin so email/OAuth callbacks do not return to another environment.
- Add LiveKit, Analytics, or other optional values only when testing that feature; see [Architecture](ARCHITECTURE.md#environment-variables).

## Prepare Supabase

### Important baseline limitation

The checked-in migrations are not currently sufficient to prove a clean bootstrap. Several tables used by the application and the `career-cvs` Storage bucket are missing from the versioned create history. See [Open issues](OPEN-ISSUES.md#p0-versioned-supabase-baseline-is-incomplete).

Until that P0 is resolved:

- use an approved non-production clone/branch of the known working schema;
- compare its migration history and schema with `supabase/migrations/` before applying changes;
- do not create missing tables ad hoc and leave them undocumented;
- capture any required baseline as reviewed migrations before calling local setup reproducible.

After the baseline is complete, apply `supabase/migrations/` in migration order using the team's approved Supabase CLI/dashboard workflow, then verify migration status. Always discover the installed CLI syntax with `supabase --help`; do not rely on copied commands from an old version.

### Auth configuration

Configure the non-production Supabase Auth project with:

- site URL matching the deployment/local origin;
- allowed redirect URLs for `/auth/callback` on the local/Preview origin;
- email confirmation enabled as required by the acceptance criteria;
- Google/GitHub providers only when their non-production callback credentials exist;
- repository templates from `supabase/templates/auth/`.

Canonical template copy and verification steps are in [phase-1-auth-content-standard.md](phase-1-auth-content-standard.md). The sync script/workflow is `scripts/sync-supabase-auth-templates.mjs`; never aim it at a project without verifying the target ref.

### Test identities

Create disposable accounts for:

- a normal member;
- an approved Project Architect;
- an Admin whose `app_metadata.role` is `admin`.

There is no public/default Admin bootstrap. With the non-production service-role environment loaded, promote an existing confirmed user:

```bash
npm run admin:promote -- admin@example.com
```

Never use this script against Production without explicit operational authorization.

## Run the application

```bash
npm run dev
```

Open `http://localhost:3000`. Verify at least the home page, `/signin`, one public project, and the route relevant to your change. Missing required Supabase variables prevent the application build and make protected routes return to sign-in.

## Run the quality gates

Fast/static and browser checks:

```bash
npm run lint
npm run typecheck
npm run audit:interactions
npm run audit:regression-coverage
npm run test:regression
npm run build
```

Install Chromium first if needed:

```bash
npx playwright install chromium
```

For authentication work also run:

```bash
npm run test:phase1-browser
```

For database/Admin/notification journeys, configure the staging-only `E2E_*` variables and run:

```bash
npm run check:e2e-config
npm run test:e2e:staging
```

The guard must reject Production. A skipped credentialed journey is not evidence that a backend change works.

## Where to find things

| Change | Start with | Also inspect |
| --- | --- | --- |
| Public page/navigation | `app/<route>/page.tsx`, `app/layout.tsx` | `components/HeaderNavigation*`, `MobileMenuEnhancer`, public/global CSS, critical UI tests |
| Form | Component and route page | canonical `app/api/.../route.ts`, persistence table/RLS, Admin queue, notification helper, staging journey |
| Member workspace | `app/member/` | route handlers, project/domain helpers, membership policies |
| Admin workflow | `app/admin/`, `components/Admin*` | Admin API checks, service-role boundary, RLS fallback, audit records |
| Auth/onboarding | `app/signin`, `app/auth`, `app/onboarding` | `middleware.ts`, Supabase clients/templates, Phase 1 criteria/browser suite |
| Database | `supabase/migrations/` | every query to the affected object, RLS/grants, indexes, advisors, rollback compatibility |
| Notifications/email | `lib/notifications.ts`, `lib/career-notifications.ts` | template migrations, outbox cron, Admin delivery pages, dedupe keys |
| Deployment | `.github/workflows/`, `vercel.json` | `.env.example`, config guards, CI/CD and rollback docs |

## Before touching authentication or middleware

- Preserve a safe relative `next`; reject protocol-relative/external redirects.
- Test guest, member, Architect, and Admin boundaries.
- Keep authorization in the server/data layer; navigation visibility is not security.
- Use `app_metadata` for roles, never editable `user_metadata`.
- Confirm cookie refresh behavior and every email/OAuth callback origin.
- Update the hosted templates when page copy changes.
- Run the full Phase 1 browser suite and record which acceptance criteria were verified.

## Before touching Supabase/RLS

- Identify whether the caller should be anonymous, authenticated/member-owned, Admin via RLS, or service-role privileged.
- Confirm the table is exposed/granted as intended as well as RLS-protected.
- Add both `USING` and `WITH CHECK` for update ownership policies.
- Remember that an update also needs a select policy.
- Treat security-definer functions and views as security-sensitive.
- Add indexes for new foreign keys and common filters/orderings.
- Use a migration and run security/performance advisors.
- Verify the exact journey against non-production data.

## Before adding payments

No payment subsystem exists. Do not add a checkout button as an isolated UI change. First document and review:

- provider and account ownership;
- server-created checkout/customer flow;
- signed webhook verification and replay/idempotency handling;
- source-of-truth tables and reconciliation;
- refunds/cancellations and support operations;
- test/live secret separation and rotation;
- tax, currency, legal, retention, and audit requirements;
- E2E fixtures that can never charge a real method.

Record the approved design in [DECISIONS.md](DECISIONS.md) before implementation.

## First pull request

- Keep the scope coherent and preserve unrelated dirty work.
- State success criteria and the complete user journey.
- Add/update tests and `/docs` in the same change.
- Include responsive and accessibility evidence for UI work.
- Include migration, environment, data-backfill, and rollback notes for backend work.
- Do not merge with a failing or skipped required release gate.
