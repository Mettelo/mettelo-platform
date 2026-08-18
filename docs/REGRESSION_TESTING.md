# Mettelo regression release gate

## Success criteria

A release is safe only when all of these are true:

- Critical public pages load without browser exceptions at phone, tablet and desktop widths.
- Navigation, CTA buttons, form validation, payloads and confirmation states remain functional.
- Guest, member, Project Architect and Admin permission boundaries remain intact.
- Contact, partnership, feedback, newsletter, project-interest and career journeys reach the expected staging database records.
- Submitted records are visible in the matching Admin queue.
- Notifications or communication/outbox records are created where the product promises them.
- Destructive end-to-end tests are prevented from running against the production Supabase project.

## Test layers

| Layer | Command | Purpose | Runs on |
| --- | --- | --- | --- |
| Static interaction audit | `npm run audit:interactions` | Finds dead buttons, forms without actions and missing API routes | Every PR and `main` push |
| Coverage audit | `npm run audit:regression-coverage` | Fails when a critical journey loses its implementation or test evidence | Every PR and `main` push |
| Browser/API contracts | `npm run test:regression` | Exercises public pages, responsive forms, mobile menu, form payloads, validation and permission boundaries | Every PR and `main` push |
| Authenticated smoke | Part of `npm run test:e2e:staging` | Confirms member, Architect and Admin accounts can reach their protected workspaces | Trusted PRs and `main` |
| Staging journeys | `npm run test:e2e:staging` | Proves browser → API → database → Admin queue → notification/communication | Trusted PRs and `main` |
| Production build | `npm run build` | Confirms the exact Next.js production compilation still succeeds | Every PR and `main` push |

## Required staging setup

The database-backed suite intentionally refuses the production project. Create a dedicated Supabase staging project or branch with the current migrations, storage buckets and these disposable accounts:

- member account
- approved Project Architect account
- Admin account with `app_metadata.role = admin`
- one public project that accepts interest
- one published career role

Configure these GitHub Actions secrets:

```text
E2E_BASE_URL
E2E_SUPABASE_URL
E2E_SUPABASE_ANON_KEY
E2E_SUPABASE_SERVICE_ROLE_KEY
E2E_MEMBER_EMAIL
E2E_MEMBER_PASSWORD
E2E_ARCHITECT_EMAIL
E2E_ARCHITECT_PASSWORD
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
```

The service-role key is read only by the Node.js test process. It is never injected into the browser or exposed as a `NEXT_PUBLIC_` variable. Test records use an `[E2E:...]` marker and are removed after the suite.

## Repository protection

In GitHub branch protection for `main`, require the check named **Release gate** and require pull requests before merging. The release gate fails unless both the fast suite and staging journey suite succeed.

If Vercel is connected directly to GitHub, keep Preview deployments for pull requests. Production remains protected by preventing an unverified PR from merging to `main`. For a stricter build-once/promote workflow, disable automatic production deployment and add a Vercel promotion job only after **Release gate**; that requires Vercel project and deployment credentials.

## Working locally

Fast, non-destructive checks:

```bash
npm ci
npx playwright install chromium
npm run audit:regression-coverage
npm run test:regression
```

Full staging checks require the `E2E_*` variables above:

```bash
npm run check:e2e-config
npm run test:e2e:staging
```

Never point those variables at production.
