# Mettelo Platform

Mettelo is professional capability infrastructure for Data & AI professionals. It connects community, structured project work, verified proof, opportunities, events, media, and member recognition in one contribution-led system.

- Live deployment: [mettelo-platform.vercel.app](https://mettelo-platform.vercel.app)
- Intended canonical domain in application metadata: [mettelo.com](https://mettelo.com) — **TODO: confirm the active production/custom-domain mapping**
- Full engineering handbook: [docs/README.md](docs/README.md)

## Documentation

Start with the [documentation index](docs/README.md). The main handover documents are:

- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Design system](docs/DESIGN-SYSTEM.md)
- [Decision log](docs/DECISIONS.md)
- [CI/CD and rollback](docs/CI-CD.md)
- [Developer onboarding](docs/ONBOARDING.md)
- [Open issues](docs/OPEN-ISSUES.md)
- [Regression release gate](docs/REGRESSION_TESTING.md)

## Engineering rules

All developers and contributors must read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the application. It defines Mettelo's required workflow for success criteria, responsive UI, WCAG 2.2 AA accessibility, API validation, Supabase/RLS security, regression testing, pull requests and releases.

Functional changes must preserve the complete journey from the user's action through API and database persistence to Admin visibility, notifications and confirmation. See [docs/REGRESSION_TESTING.md](docs/REGRESSION_TESTING.md) for the release-gate test matrix.

## Stack

- Next.js 15 / React 19
- TypeScript
- Supabase Auth + Postgres + Row Level Security
- Playwright browser/E2E tests
- GitHub Actions CI and Vercel deployments

## Local setup

1. Install the pinned dependencies:

```bash
npm ci
```

2. Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` may contain the Supabase publishable key. The service-role key is server-only and must never be exposed through `NEXT_PUBLIC_*`, client components, browser logs, or committed files.

3. Start development:

```bash
npm run dev
```

## Quality gates

```bash
npm run lint
npm run typecheck
npm run audit:interactions
npm run audit:regression-coverage
npm run test:regression
npm run build
```

The required gates run in `.github/workflows/ci.yml` on pushes to `main` and pull requests. Backend journey changes also require the credentialed staging suite documented in [docs/REGRESSION_TESTING.md](docs/REGRESSION_TESTING.md).

## Database migrations

Supabase schema changes belong in `supabase/migrations/` and must also be applied to the target Supabase project. Do not make production-only schema changes that are missing from version control.

The versioned schema covers profiles, Labs projects and roles, applications, project membership, contributions/proof, opportunities, events, registrations, Spotlight, organisations, partnerships, private intake submissions, and newsletter subscribers. A documentation audit found several tables and the `career-cvs` bucket referenced by the application but not created by the current migrations; do not treat a blank-project bootstrap as complete until [the schema baseline issue](docs/OPEN-ISSUES.md#p0-versioned-supabase-baseline-is-incomplete) is resolved.

RLS is enabled across exposed tables. `form_submissions` and `newsletter_subscribers` intentionally have no client RLS policies: writes go through validated server API routes using the service-role client.

## First admin bootstrap

There is deliberately no default admin account and no public admin-promotion endpoint.

1. Create and confirm a normal Mettelo account through `/signin`.
2. In a trusted server/local environment containing the service-role key, run:

```bash
npm run admin:promote -- admin@example.com
```

The command finds the existing Supabase Auth user and sets `app_metadata.role` to `admin`. `/admin` and admin API routes require that role.

## Auth routes

- `/signin` — sign in, signup via `?mode=signup`, and password reset
- `/auth/callback` — email confirmation/session exchange
- `/auth/update-password` — password update flow
- `/member` — authenticated member workspace
- `/admin` — authenticated admin-only operations workspace

Middleware protects `/member/*`, `/admin/*`, and the `/project-architect` progression entry route. Admin access requires `user.app_metadata.role === "admin"`.

## Deployment

Production must provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable key
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://mettelo.com`

Optional integrations are documented in `.env.example`.

Before launch, verify Supabase Auth redirect URLs include every active Preview/Production origin and the confirmation/reset callback routes. See [CI/CD](docs/CI-CD.md) for the current release and rollback model.

## Security rules

- Never expose the service-role key.
- Never create a hidden default admin.
- Keep RLS enabled on public-schema application tables.
- Route anonymous intake/newsletter writes through server endpoints.
- Keep project/opportunity/event publishing controlled by admin routes.
- Re-run Supabase security and performance advisors after DDL/RLS changes.
