# Open issues and verification backlog

Last audited: 18 August 2026

This file records gaps evidenced by the repository or unresolved by the dated launch/Phase 1 documents. “TODO: confirm” means the answer depends on hosted configuration or current production evidence that is not stored in Git.

## P0: Canonical Supabase migration history still needs reconciliation

**Evidence:** The hosted Production database contains these tables, but no canonical migration in `supabase/migrations/` creates them:

- `career_application_events`
- `career_applications`
- `career_roles`
- `content_posts`
- `email_delivery_attempts`
- `email_outbox`
- `notification_event_catalogue`
- `notification_preferences`
- `notifications`
- `project_runs`

The hosted careers flow also uses the private `career-cvs` bucket, whose original creation is not represented in the canonical migration history. Historical baseline files `20260809_launch_readiness.sql` and `20260809_product_core.sql` use 8-digit names that sort after later 14-digit migrations on a clean replay.

**Mitigation now versioned:** `scripts/prepare-local-supabase.mjs` creates an ephemeral CI migration workdir that normalizes those two historical baseline migrations and injects `supabase/ci/20260809020000_missing_hosted_baseline.sql`. This makes the destructive release E2E environment reproducible without querying or mutating Production.

**Impact:** CI can now prove the current application journeys on a clean disposable stack, but the repository still cannot claim that the canonical `supabase/migrations/` history alone is a faithful reconstruction of the hosted Production database. A new long-lived Supabase environment should not be promoted from that canonical history until provenance is reconciled.

**Resolution:** Pull/derive the authoritative hosted schema and migration-history state, review it for production-only data/secrets, convert the CI compatibility objects/order into canonical idempotent migrations without replaying already-applied hosted changes incorrectly, include the `career-cvs` bucket/policies, run security/performance advisors, and prove `supabase db reset` from canonical migrations alone.

## Resolved 18 August 2026: Paid/credentialed staging environment blocked the release gate

**Previous evidence:** `staging-e2e` required `E2E_BASE_URL`, a non-production Supabase URL/keys and disposable member/Architect/Admin accounts. Those secrets and a hosted staging project did not exist, so the release gate failed before browser tests started.

**Resolution implemented:** `.github/workflows/ci.yml` now starts an ephemeral local Supabase Postgres/Auth/Storage stack with the official CLI, exports generated local keys only inside the runner, creates deterministic local-only identities/fixtures, runs the same destructive browser/API/database/Admin journeys, and destroys the stack afterward. `scripts/check-e2e-config.mjs` still rejects Production and requires loopback when `CI_LOCAL_SUPABASE=1`.

**Verification required before closing operationally:** Capture a green `Staging submission journeys` and aggregate `Release gate` run on the implementation PR. If CI fails, keep this item operationally open until the failure is fixed rather than weakening the test.

## Resolved 18 August 2026: Phase 1 browser gate was not part of CI

**Previous evidence:** `npm run test:phase1-browser` existed but `.github/workflows/ci.yml` did not execute it.

**Resolution implemented:** The fast regression gate now installs Chromium once, runs `npm run test:phase1-browser`, then the standard regression suite and production build. Runtime is managed by existing Playwright parallelism rather than dropping criteria.

**Verification required before closing operationally:** Capture a green fast-gate run with the Phase 1 browser step present.

## P1: Hosted deployment protections need confirmation

**Evidence:** The repository has CI workflows but no branch-protection or Vercel project configuration. Vercel deployment is external to the workflow.

**Open checks:**

- TODO: confirm `main` is the Vercel Production branch.
- TODO: confirm pull requests receive Preview deployments with Preview-scoped variables.
- TODO: require GitHub check **Release gate** and pull-request review before merging to `main`.
- TODO: document who can promote/rollback Production and the exact Vercel procedure.
- TODO: confirm Vercel Cron and `CRON_SECRET` are active.

## P1: Production authentication acceptance is not closed

**Evidence:** [PHASE_1_SUCCESS_CRITERIA.md](../PHASE_1_SUCCESS_CRITERIA.md) remains `IN PROGRESS`, and [LAUNCH_READINESS.md](../LAUNCH_READINESS.md) requires Production tests for signup, verification, sign-in, reset, OAuth, session persistence, callbacks, and onboarding.

**Resolution:** Run all 125 criteria against the current deployed origin and hosted Supabase templates, record evidence/date, and update the status rather than inferring completion from code/build.

## P1: Footer contains a route with no page

**Evidence:** `app/layout.tsx` links to `/post-opportunity`, but no `app/post-opportunity/page.tsx`, redirect, or rewrite was found.

**Impact:** “Post an opportunity” reaches the 404 page.

**Resolution:** Implement the intended organisation submission journey or point the link to an existing route/section; add it to the interaction/browser audit.

## P1: Development preview routes are present in the production route tree

**Evidence:** `app/dev/` contains multiple preview/responsive-gate pages, and middleware does not restrict `/dev/*`.

**Impact:** Internal fixtures/preview surfaces may be publicly discoverable and can drift from the product.

**Resolution:** Decide whether these are intentional public test fixtures. If not, exclude/gate them outside development and add a production-build route assertion. TODO: confirm none expose sensitive data.

## P1: Mobile-navigation stabilization needs deployed device evidence

**Evidence:** Git history contains repeated rebuild/restore/fix commits for visibility, stacking, first-open rendering, and click behavior. The current working tree directly renders the drawer, synchronizes the toggle state, and updates the static contract.

**Remaining verification:** Run the first-open, close/reopen, Explore, link, account, Escape, outside tap, focus-trap, rotation/reduced-motion, and scroll cases on 320/375/390/430px, phone landscape, iOS Safari, Android Chrome, and 200% zoom. Commit the current working-tree fix and keep its regression checks required.

## P1: Canonical domain and auth origins need confirmation

**Evidence:** The owner identifies `mettelo-platform.vercel.app` as live; metadata/auth fallbacks use `https://mettelo.com`; `.env.example` also uses `https://mettelo.com`.

**Impact:** Email/OAuth links can return to the wrong deployment when `NEXT_PUBLIC_SITE_URL` or Supabase allowed redirects do not match.

**Resolution:** TODO: confirm the active public/canonical domain, configure environment-specific origins and redirects, and update metadata, sitemap, emails, and this documentation together.

## P1: Launch content and ownership require re-verification

Carried forward from [LAUNCH_READINESS.md](../LAUNCH_READINESS.md):

- verify every official social URL, especially LinkedIn/Instagram decisions;
- publish only events, opportunities, projects, testimonials, logos, and member proof backed by real owners/permission;
- assign owners for recurring editorial, opportunity, event, and project data quality;
- confirm the Admin content workflow and canonical `content_posts` baseline are sufficient before calling the CMS/data path operational.

## P2: Analytics reporting is not evidenced

**Evidence:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` and event calls exist, but no production ID, event taxonomy/dashboard, consent decision, or GA DebugView evidence is versioned.

**Resolution:** TODO: confirm the approved analytics/privacy configuration, name the owner, document events/conversions, and verify them on Production.

## P2: Final SEO/social asset and metadata crawl remain open

**Evidence:** `public/og-image.svg` is still the interim Open Graph asset called out in launch readiness. Secondary routes may inherit root metadata.

**Resolution:** Export/approve a 1200×630 PNG/JPG where required by target platforms, crawl route headings/metadata/canonicals, and add an automated link/metadata check.

## P2: Accessibility and cross-browser sign-off is incomplete

**Evidence:** The code includes focus, labels, live regions, reduced-motion, and responsive checks, but the launch audit still requests automated WCAG plus manual keyboard/screen-reader/device QA.

**Resolution:** Record WCAG 2.2 AA evidence for key journeys, including validation/errors, drawers, review flows, Admin tables, 200% zoom, iOS Safari, Android Chrome, and tablet.

## P2: Legal identity/review remains external

**Evidence:** Privacy, Terms, and Community Guidelines exist; launch readiness still requires legal review and formal controller/company identity/contact details as the organisation formalises.

**Resolution:** TODO: obtain owner/legal approval before paid services, employer talent products, or high-volume international processing, then version the approved copy/date.

## P2: Newsletter has no dedicated Admin subscriber queue

**Evidence:** `/api/newsletter` persists/upserts preferences and sends confirmation, but no dedicated Admin subscriber route was found.

**Decision needed:** Confirm whether subscriber operations intentionally remain provider/database-only or whether consent history, export, suppression, and support tools need a governed Admin view.

## P2: Historical readiness documents contain stale assertions

Examples:

- `LAUNCH_READINESS.md` says a lockfile must be added; `package-lock.json` now exists.
- It says project applications beyond interest need project-specific entities/Admin review; those routes and tables are now represented.
- It says recurring content needs a data/CMS workflow; Admin content code now exists, although canonical baseline provenance is still open.
- External configuration, real content, analytics, legal, and device QA items remain unverified.

**Resolution:** Re-run the launch audit after the P0/P1 items, date every verification, and update the original document without erasing its historical context.

## P2: Local lint traverses generated Next.js output

**Evidence:** Running the configured `eslint .` after a local build traverses `.next/` and reports thousands of errors in generated bundles; the generated, currently untracked `next-env.d.ts` also triggers the triple-slash rule. Linting the source paths directly completes with zero errors and eight warnings.

**Impact:** A developer can receive a false blocking lint result depending on whether a build has already run, while a clean CI checkout behaves differently.

**Resolution:** Add generated directories/files to ESLint's global ignores according to the repository's Next.js/TypeScript policy, decide whether `next-env.d.ts` should be tracked or ignored, and add a repeatability check that `build → lint` and `lint → build` have the same source result. Address the remaining source warnings separately.

## Maintenance

Close an item only with a commit, CI/deployment evidence, or a named owner/date for an external verification. Move consequential resolutions into [DECISIONS.md](DECISIONS.md); do not delete their history.
