# Mettelo Platform

Building the professional capability infrastructure for Data & AI professionals — community, projects, proof, opportunities, events, media and member recognition.

## Stack

- Next.js 15 / React 19
- TypeScript
- Supabase Auth + Postgres + Row Level Security
- GitHub Actions CI

## Local setup

1. Install dependencies:

```bash
npm install
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
npm run build
```

All three gates run in `.github/workflows/ci.yml` on pushes to `main` and pull requests.

## Database migrations

Supabase schema changes belong in `supabase/migrations/` and must also be applied to the target Supabase project. Do not make production-only schema changes that are missing from version control.

The launch schema includes profiles, Labs projects and roles, applications, project membership, contributions/proof, opportunities, events, registrations, Spotlight, organisations, partnerships, private intake submissions, and newsletter subscribers.

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

- `/signin` — sign in, signup, password reset
- `/auth/callback` — email confirmation/session exchange
- `/auth/update-password` — password update flow
- `/member` — authenticated member workspace
- `/admin` — authenticated admin-only operations workspace

Middleware protects `/member/*` and `/admin/*`.

## Deployment

Production must provide:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / publishable key
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL=https://mettelo.com`

Optional integrations are documented in `.env.example`.

Before launch, verify Supabase Auth redirect URLs include the production origin and confirmation/reset callback routes.

## Security rules

- Never expose the service-role key.
- Never create a hidden default admin.
- Keep RLS enabled on public-schema application tables.
- Route anonymous intake/newsletter writes through server endpoints.
- Keep project/opportunity/event publishing controlled by admin routes.
- Re-run Supabase security and performance advisors after DDL/RLS changes.
